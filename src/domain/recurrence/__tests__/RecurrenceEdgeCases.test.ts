import { RecurrenceEngine } from '../RecurrenceEngine';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { RecurringHorizonSync } from '@/features/task-form/recurringHorizonSync';
import { MaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { HijriService } from '@/domain/calendar/HijriService';
import type { TaskDefinition } from '@/domain/task/types';
import type { TodayTemporalInputs } from '@/services/types';

describe('RecurrenceEdgeCases (REC-01 to REC-13)', () => {
  const engine = new RecurrenceEngine();

  const makeMonthlyDef = (startDate: string, recurrenceRule: string): TaskDefinition => ({
    id: `def-${startDate}`,
    title: 'Monthly Task',
    description: null,
    startDate,
    source: 'USER',
    worshipItemKey: null,
    scheduleType: 'ANYTIME_TODAY',
    scheduleData: {},
    recurrenceRule,
    hijriRecurrence: null,
    recurrenceEnd: null,
    seriesId: `series-${startDate}`,
    seriesVersion: 1,
    effectiveFromDate: null,
    effectiveToDate: null,
    reminderRule: null,
    priority: 'NORMAL',
    estimatedMinutes: 15,
    notes: null,
    tags: [],
    subtasks: [],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  describe('Clamping Invariants (REC-01..REC-04) — UNIT', () => {
    it('REC-01: (UNIT) MONTHLY anchor on 31st clamps correctly in 28-day Feb (non-leap)', () => {
      const def = makeMonthlyDef('2026-01-31', 'FREQ=MONTHLY;BYMONTHDAY=31');
      // In 2026 (non-leap), February has 28 days
      expect(engine.occursOn(def, '2026-02-28')).toBe(true);
      expect(engine.occursOn(def, '2026-03-01')).toBe(false);

      const seeds = engine.generateSeedDates(def, { start: '2026-02-01', end: '2026-02-28' });
      expect(seeds).toEqual(['2026-02-28']);
    });

    it('REC-02: (UNIT) MONTHLY anchor on 31st clamps correctly in 29-day leap Feb', () => {
      // 2028 is a leap year
      const def = makeMonthlyDef('2028-01-31', 'FREQ=MONTHLY;BYMONTHDAY=31');
      expect(engine.occursOn(def, '2028-02-29')).toBe(true);
      expect(engine.occursOn(def, '2028-02-28')).toBe(false);

      const seeds = engine.generateSeedDates(def, { start: '2028-02-01', end: '2028-02-29' });
      expect(seeds).toEqual(['2028-02-29']);
    });

    it('REC-03: (UNIT) MONTHLY anchor on 31st clamps correctly in 30-day month', () => {
      const def = makeMonthlyDef('2026-01-31', 'FREQ=MONTHLY;BYMONTHDAY=31');
      // April 2026 has 30 days
      expect(engine.occursOn(def, '2026-04-30')).toBe(true);
      expect(engine.occursOn(def, '2026-05-01')).toBe(false);

      const seeds = engine.generateSeedDates(def, { start: '2026-04-01', end: '2026-04-30' });
      expect(seeds).toEqual(['2026-04-30']);
    });

    it('REC-04: (UNIT) MONTHLY anchor on Feb 29 (non-leap year): clamps to Feb 28, not Feb 28+1', () => {
      const def = makeMonthlyDef('2024-02-29', 'FREQ=MONTHLY;BYMONTHDAY=29');
      // 2026 is non-leap
      expect(engine.occursOn(def, '2026-02-28')).toBe(true);
      expect(engine.occursOn(def, '2026-03-01')).toBe(false);

      const seeds = engine.generateSeedDates(def, { start: '2026-02-01', end: '2026-02-28' });
      expect(seeds).toEqual(['2026-02-28']);
    });
  });

  describe('Series Split Boundaries (REC-08..REC-09) — UNIT', () => {
    beforeEach(() => {
      createTestDatabase();
    });

    afterEach(() => {
      cleanupTestDatabase();
    });

    it('REC-08: (UNIT) Series split: pending occurrences before split date are NOT deleted', async () => {
      const taskEngine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
      const def = await taskEngine.createTask({
        title: 'Daily Split Test Task',
        startDate: '2026-09-01',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const occBefore = await taskOccurrenceRepository.create({
        taskDefinitionId: def.id,
        localDate: '2026-09-10',
        planningDayKey: '2026-09-10',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });

      await taskEngine.splitSeriesAndFuture(def.seriesId, '2026-09-15', {
        title: 'Updated After Split',
      });

      const remaining = await taskOccurrenceRepository.findById(occBefore.id);
      expect(remaining).not.toBeNull();
      expect(remaining?.status).toBe('PENDING');
      expect(remaining?.localDate).toBe('2026-09-10');
    });

    it('REC-09: (UNIT) Series split: pending occurrences on/after split date ARE deleted', async () => {
      const taskEngine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
      const def = await taskEngine.createTask({
        title: 'Daily Split Future Test Task',
        startDate: '2026-09-01',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const occAtSplit = await taskOccurrenceRepository.create({
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });

      const occAfterSplit = await taskOccurrenceRepository.create({
        taskDefinitionId: def.id,
        localDate: '2026-09-16',
        planningDayKey: '2026-09-16',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });

      await taskEngine.splitSeriesAndFuture(def.seriesId, '2026-09-15', {
        title: 'Updated Future Task',
      });

      expect(await taskOccurrenceRepository.findById(occAtSplit.id)).toBeNull();
      expect(await taskOccurrenceRepository.findById(occAfterSplit.id)).toBeNull();
    });
  });

  describe('Recurrence Sync & Materialization (REC-05..07, REC-10..13) — INTEGRATION', () => {
    let taskEngine: TaskEngine;
    let sync: RecurringHorizonSync;

    const chicagoInputs: TodayTemporalInputs = {
      coordinates: { latitude: 41.8781, longitude: -87.6298 },
      params: {
        method: 'ISNA',
        asrMethod: 'SHAFI',
        highLatitudeRule: 'AUTO',
        polarCircleResolution: 'AQRAB_YAUM',
        adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        timezone: 'America/Chicago',
      },
      planningDayConfig: { mode: 'FAJR' },
    };

    beforeEach(() => {
      createTestDatabase();
      taskEngine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
      sync = new RecurringHorizonSync(
        taskDefinitionRepository,
        taskOccurrenceRepository,
        new RecurrenceEngine(),
        new MaterializationEngine(),
        new HijriService(),
        async () => ({ baseMethod: 'UMM_AL_QURA', globalAdjustment: 0, overrides: [] })
      );
    });

    afterEach(() => {
      cleanupTestDatabase();
    });

    it('REC-05: (INTEGRATION) Re-sync with same +/-7 window produces no duplicate pending occurrences (state-convergent)', async () => {
      const def = await taskEngine.createTask({
        title: 'Idempotent Re-sync Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const horizon = { start: '2026-09-14', end: '2026-09-20' };

      // First sync
      const res1 = await sync.syncSeries(def.seriesId, horizon, chicagoInputs);
      expect(res1.created).toBe(6); // 2026-09-15 through 2026-09-20

      // Second sync with identical window
      const res2 = await sync.syncSeries(def.seriesId, horizon, chicagoInputs);
      expect(res2.created).toBe(0);
      expect(res2.retained).toBe(6);

      // Verify occurrences in DB: exactly 6 occurrences, no duplicates
      const occurrences = await taskOccurrenceRepository.findPendingByLocalDateRange('2026-09-14', '2026-09-20');
      const seriesOccurrences = occurrences.filter(o => o.seriesId === def.seriesId);
      expect(seriesOccurrences).toHaveLength(6);
      const dates = new Set(seriesOccurrences.map(o => o.localDate));
      expect(dates.size).toBe(6);
    });

    it('REC-06: (INTEGRATION) Re-sync after DST spring-forward: no missing occurrence at DST boundary', async () => {
      // Spring forward: March 8, 2026
      const def = await taskEngine.createTask({
        title: 'Spring Forward Daily Task',
        startDate: '2026-03-05',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const horizon = { start: '2026-03-05', end: '2026-03-10' };
      const res = await sync.syncSeries(def.seriesId, horizon, chicagoInputs);
      expect(res.created).toBe(6);

      // Verify March 8, 2026 occurrence exists and is valid
      const occSpring = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-03-08');
      expect(occSpring).not.toBeNull();
      expect(occSpring?.localDate).toBe('2026-03-08');
    });

    it('REC-07: (INTEGRATION) Re-sync after DST fall-back: no duplicate occurrence at DST boundary', async () => {
      // Fall back: November 1, 2026
      const def = await taskEngine.createTask({
        title: 'Fall Back Daily Task',
        startDate: '2026-10-30',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const horizon = { start: '2026-10-30', end: '2026-11-03' };
      await sync.syncSeries(def.seriesId, horizon, chicagoInputs);
      // Run sync again
      await sync.syncSeries(def.seriesId, horizon, chicagoInputs);

      const occFall = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-11-01');
      expect(occFall).not.toBeNull();
      expect(occFall?.localDate).toBe('2026-11-01');

      // Check all occurrences around boundary
      const occurrences = await taskOccurrenceRepository.findPendingByLocalDateRange('2026-10-30', '2026-11-03');
      const nov1List = occurrences.filter(o => o.seriesId === def.seriesId && o.localDate === '2026-11-01');
      expect(nov1List).toHaveLength(1);
    });

    it('REC-10: (INTEGRATION) COMPLETED occurrence is preserved through re-sync (status not overwritten; terminal short-circuit verified)', async () => {
      const def = await taskEngine.createTask({
        title: 'Completed Preservation Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const horizon = { start: '2026-09-15', end: '2026-09-17' };
      await sync.syncSeries(def.seriesId, horizon, chicagoInputs);

      // Complete the occurrence on 2026-09-15
      const occ15 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      await taskEngine.completeTask(occ15!.id, '2026-09-15T12:00:00.000Z');

      // Re-run sync
      const res = await sync.syncSeries(def.seriesId, horizon, chicagoInputs);
      expect(res.issues).toHaveLength(0);

      // Verify 2026-09-15 is STILL COMPLETED with original completedAt timestamp
      const fresh15 = await taskOccurrenceRepository.findById(occ15!.id);
      expect(fresh15?.status).toBe('COMPLETED');
      expect(fresh15?.completedAt).toBe('2026-09-15T12:00:00.000Z');
    });

    it('REC-11: (INTEGRATION) MISSED occurrence is preserved through re-sync', async () => {
      const def = await taskEngine.createTask({
        title: 'Missed Preservation Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const horizon = { start: '2026-09-15', end: '2026-09-17' };
      await sync.syncSeries(def.seriesId, horizon, chicagoInputs);

      const occ15 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      await taskEngine.missTask(occ15!.id, '2026-09-15T23:59:00.000Z');

      // Re-run sync
      await sync.syncSeries(def.seriesId, horizon, chicagoInputs);

      const fresh15 = await taskOccurrenceRepository.findById(occ15!.id);
      expect(fresh15?.status).toBe('MISSED');
      expect(fresh15?.missedAt).toBe('2026-09-15T23:59:00.000Z');
    });

    it('REC-12: (INTEGRATION) CANCELLED (tombstone) occurrence blocks regeneration of that local_date', async () => {
      const def = await taskEngine.createTask({
        title: 'Cancelled Tombstone Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const horizon = { start: '2026-09-15', end: '2026-09-17' };
      await sync.syncSeries(def.seriesId, horizon, chicagoInputs);

      const occ15 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      await taskEngine.cancelTask(occ15!.id);

      // Re-run sync
      await sync.syncSeries(def.seriesId, horizon, chicagoInputs);

      // Verify tombstone remains CANCELLED and no second occurrence for 2026-09-15 was created
      const allForDate = (await taskOccurrenceRepository.findTodayCandidates('2026-09-15', '2026-09-15T12:00:00.000Z'))
        .filter(o => o.seriesId === def.seriesId);
      expect(allForDate).toHaveLength(1);
      expect(allForDate[0].status).toBe('CANCELLED');
    });

    it('REC-13: (INTEGRATION) Partial EXECUTE retry convergence: failure mid-EXECUTE resolves with SyncIssue and converges on retry', async () => {
      // 1. Create recurring series needing multiple EXECUTE operations (3 dates: 2026-09-15, 16, 17)
      const def = await taskEngine.createTask({
        title: 'Partial Retry Series',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const horizon = { start: '2026-09-15', end: '2026-09-17' };

      // 2. Inject genuine dependency failure mid-EXECUTE (fail on seedDate 2026-09-16)
      const realMatEngine = new MaterializationEngine();
      let failOn16 = true;

      const failingMatEngine: any = {
        materializeOne: jest.fn().mockImplementation(async (req, ctx) => {
          if (failOn16 && req.seedDate === '2026-09-16') {
            throw new Error('Simulated transient DB error on seedDate 2026-09-16');
          }
          return await realMatEngine.materializeOne(req, ctx);
        }),
      };

      const partialSync = new RecurringHorizonSync(
        taskDefinitionRepository,
        taskOccurrenceRepository,
        new RecurrenceEngine(),
        failingMatEngine,
        new HijriService(),
        async () => ({ baseMethod: 'UMM_AL_QURA', globalAdjustment: 0, overrides: [] })
      );

      // 3. First sync run
      const res1 = await partialSync.syncSeries(def.seriesId, horizon, chicagoInputs);

      // 4. Sync resolves with SyncIssue (does NOT throw/reject; does not pretend atomic)
      expect(res1.issues).toHaveLength(1);
      expect(res1.issues[0].stage).toBe('MATERIALIZE');
      expect(res1.issues[0].seedDate).toBe('2026-09-16');

      // 5. Partial state is observable: 2026-09-15 was created, 2026-09-16 was NOT
      const occ15 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      const occ16 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-16');
      const occ17 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-17');

      expect(occ15).not.toBeNull();
      expect(occ16).toBeNull(); // failed item was not created
      expect(occ17).not.toBeNull(); // subsequent item succeeded

      // 6. Restore failing dependency
      failOn16 = false;

      // 7. Run sync again
      const res2 = await partialSync.syncSeries(def.seriesId, horizon, chicagoInputs);

      // 8. Final desired PENDING set converges exactly
      expect(res2.issues).toHaveLength(0);
      expect(res2.created).toBe(1); // the missing 2026-09-16 is now created
      expect(res2.retained).toBe(2); // 2026-09-15 and 2026-09-17 are retained

      // 9. No duplicate (seriesId, localDate)
      const final15 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      const final16 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-16');
      const final17 = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-17');

      expect(final15).not.toBeNull();
      expect(final16).not.toBeNull();
      expect(final17).not.toBeNull();

      // 10. Coherent counts
      expect(res1.created + res2.created).toBe(3);

      // 11. Historical occurrences untouched
      expect(final15?.id).toBe(occ15?.id); // exact same row retained!
    });
  });
});
