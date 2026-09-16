import { RecurringHorizonSync } from '../recurringHorizonSync';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { MaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { RecurrenceEngine } from '@/domain/recurrence/RecurrenceEngine';
import { HijriService } from '@/domain/calendar/HijriService';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import type { TodayTemporalInputs } from '@/services/types';

describe('RecurringHorizonSync (M10 §29–§34)', () => {
  let taskEngine: TaskEngine;
  let matEngine: MaterializationEngine;
  let recEngine: RecurrenceEngine;
  let horizonSync: RecurringHorizonSync;

  const validTemporalInputs: TodayTemporalInputs = {
    coordinates: { latitude: 40.7128, longitude: -74.006 },
    params: {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'America/New_York',
    },
    planningDayConfig: { mode: 'FAJR' },
  };

  const horizon = { start: '2026-09-08', end: '2026-09-22' }; // ±7 days from Sep 15

  beforeEach(() => {
    createTestDatabase();
    taskEngine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
    matEngine = new MaterializationEngine(taskOccurrenceRepository, taskDefinitionRepository);
    recEngine = new RecurrenceEngine();
    const hijri = new HijriService();

    horizonSync = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijri
    );
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('Durable Horizon Sync & Idempotency', () => {
    it('materializes missing occurrences for active recurring definitions across the horizon', async () => {
      const def = await taskEngine.createTask({
        title: 'Daily Dhikr',
        startDate: '2026-09-10',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      // No occurrences in DB initially
      const occsBefore = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
        def.seriesId,
        horizon.start,
        horizon.end
      );
      expect(occsBefore).toHaveLength(0);

      // Run horizon sync
      const res = await horizonSync.sync(horizon, validTemporalInputs);
      expect(res.issues).toHaveLength(0);
      expect(res.created).toBeGreaterThan(0);

      const occsAfter = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
        def.seriesId,
        horizon.start,
        horizon.end
      );
      // Sep 10 through Sep 22 inclusive = 13 days
      expect(occsAfter).toHaveLength(13);

      // Repeated sync is completely idempotent
      const res2 = await horizonSync.sync(horizon, validTemporalInputs);
      expect(res2.created).toBe(0);
      expect(res2.deleted).toBe(0);
      expect(res2.retained).toBe(13);
    });
  });

  describe('Source-B Recovery (M10 §30 & Rev 6 §1)', () => {
    it('cleans up stale recurring PENDING rows when series was edited to non-recurring and Phase 2 had failed', async () => {
      // 1. Create recurring daily definition and populate horizon
      const def = await taskEngine.createTask({
        title: 'Formerly Recurring Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });
      await horizonSync.sync(horizon, validTemporalInputs);

      const occsInitial = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
        def.seriesId,
        horizon.start,
        horizon.end
      );
      expect(occsInitial.length).toBeGreaterThan(1);

      // 2. Mark one occurrence as COMPLETED (terminal historical row)
      const completedOcc = occsInitial.find(o => o.localDate === '2026-09-15')!;
      await taskOccurrenceRepository.updateStatus(completedOcc.id, 'COMPLETED');

      // 3. User edited recurring -> non-recurring: Phase 1 commits, setting recurrenceRule to null
      await taskDefinitionRepository.update(def.id, {
        recurrenceRule: null,
      });

      // Assert state:
      // Current definition is NON-RECURRING.
      // Multiple PENDING occurrences still linger in DB (simulating Phase 2 failure).
      // Source A will NOT find this definition because it is non-recurring!
      // Source B WILL find it via remaining PENDING occurrences.

      const res = await horizonSync.sync(horizon, validTemporalInputs);
      expect(res.issues).toHaveLength(0);
      expect(res.deleted).toBeGreaterThan(0);

      // Verify: all stale future PENDING rows deleted
      const occsAfter = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
        def.seriesId,
        horizon.start,
        horizon.end
      );
      expect(occsAfter).toHaveLength(0);

      // Terminal COMPLETED row was preserved and untouched!
      const terminalCheck = await taskOccurrenceRepository.findById(completedOcc.id);
      expect(terminalCheck).not.toBeNull();
      expect(terminalCheck!.status).toBe('COMPLETED');
    });
  });

  describe('Mixed-Version Series Handling (M10 §31)', () => {
    it('computes complete desired seeds from both recurring and non-recurring versions without falsely deleting valid seeds', async () => {
      // v1: Recurring daily starting Sep 08
      const v1 = await taskEngine.createTask({
        title: 'Series v1',
        startDate: '2026-09-08',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      // Split at Sep 15: v2 is non-recurring (successor)
      await taskEngine.splitSeriesAndFuture(
        v1.seriesId,
        '2026-09-15',
        {
          title: 'Series v2 Non-Recurring',
          recurrenceRule: null,
        }
      );

      // Run horizon sync
      const res = await horizonSync.sync(horizon, validTemporalInputs);
      expect(res.issues).toHaveLength(0);

      // Check occurrences for the series
      const occs = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
        v1.seriesId,
        horizon.start,
        horizon.end
      );

      const dates = occs.map(o => o.localDate);
      // v1 covers Sep 08..14
      expect(dates).toContain('2026-09-08');
      expect(dates).toContain('2026-09-14');
      // v2 covers Sep 15 (its single non-recurring seed)
      expect(dates).toContain('2026-09-15');
      // No seeds generated after Sep 15 because v2 is non-recurring!
      expect(dates).not.toContain('2026-09-16');
      expect(dates).not.toContain('2026-09-20');
    });
  });

  describe('Plan-Before-Delete Invariant (M10 §32)', () => {
    it('performs ZERO deletes and ZERO creates if recurrence generation fails for a series, continuing other series', async () => {
      // Series 1: will fail in PLAN (we spy and make recEngine throw for series 1)
      const defFail = await taskEngine.createTask({
        title: 'Failing Series',
        startDate: '2026-09-10',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      // Insert an existing pending occurrence for Series 1
      await taskOccurrenceRepository.create({
        id: 'occ-fail-pending',
        taskDefinitionId: defFail.id,
        seriesId: defFail.seriesId,
        localDate: '2026-09-10',
        planningDayKey: '2026-09-10',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // Series 2: healthy independent series
      const defHealthy = await taskEngine.createTask({
        title: 'Healthy Series',
        startDate: '2026-09-10',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      // Mock recEngine.generateSeedDates to throw only for defFail
      const origGenerate = recEngine.generateSeedDates.bind(recEngine);
      jest.spyOn(recEngine, 'generateSeedDates').mockImplementation((def, range, ctx) => {
        if (def.id === defFail.id) {
          throw new Error('Recurrence generation calculation exploded');
        }
        return origGenerate(def, range, ctx);
      });

      const res = await horizonSync.sync(horizon, validTemporalInputs);

      // Issues recorded for failing series
      expect(res.issues.some(i => i.seriesId === defFail.seriesId)).toBe(true);

      // PLAN-BEFORE-DELETE INVARIANT:
      // Zero deletes occurred for defFail! Its existing pending row is STILL THERE.
      const occFail = await taskOccurrenceRepository.findById('occ-fail-pending');
      expect(occFail).not.toBeNull();
      expect(occFail!.status).toBe('PENDING');

      // Healthy series succeeded independently!
      const occsHealthy = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
        defHealthy.seriesId,
        horizon.start,
        horizon.end
      );
      expect(occsHealthy.length).toBeGreaterThan(0);
    });
  });
});
