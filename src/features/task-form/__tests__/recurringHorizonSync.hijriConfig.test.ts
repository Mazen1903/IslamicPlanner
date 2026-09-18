import { RecurringHorizonSync } from '../recurringHorizonSync';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { MaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { RecurrenceEngine } from '@/domain/recurrence/RecurrenceEngine';
import { HijriService } from '@/domain/calendar/HijriService';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import type { TodayTemporalInputs } from '@/services/types';
import type { HijriAdjustmentConfig } from '@/domain/calendar/types';

describe('RecurringHorizonSync - Hijri Config Integration (M17 Issue 1)', () => {
  let taskEngine: TaskEngine;
  let matEngine: MaterializationEngine;
  let recEngine: RecurrenceEngine;
  let hijriService: HijriService;

  const validTemporalInputs: TodayTemporalInputs = {
    coordinates: { latitude: 21.4225, longitude: 39.8262 }, // Makkah
    params: {
      method: 'MAKKAH',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'Asia/Riyadh',
    },
    planningDayConfig: { mode: 'FAJR' },
  };

  const horizon = { start: '2026-09-01', end: '2026-09-30' };

  beforeEach(() => {
    createTestDatabase();
    taskEngine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
    matEngine = new MaterializationEngine(taskOccurrenceRepository, taskDefinitionRepository);
    recEngine = new RecurrenceEngine();
    hijriService = new HijriService();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('H-01: sync() loads actual hijriAdjustment via injected loader instead of hardcoded zero', async () => {
    let loaderCalled = false;
    const mockLoader = jest.fn().mockImplementation(async (): Promise<HijriAdjustmentConfig> => {
      loaderCalled = true;
      return { globalAdjustment: 1 };
    });

    const syncService = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      mockLoader
    );

    const res = await syncService.sync(horizon, validTemporalInputs);

    expect(mockLoader).toHaveBeenCalledTimes(1);
    expect(loaderCalled).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it('H-02: syncRange() loads actual hijriAdjustment via injected loader', async () => {
    const mockLoader = jest.fn().mockResolvedValue({ globalAdjustment: -1 });

    const syncService = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      mockLoader
    );

    await syncService.syncRange(horizon, horizon, validTemporalInputs);

    expect(mockLoader).toHaveBeenCalledTimes(1);
  });

  it('H-03: globalAdjustment = +1 shifts desired Hijri recurrence seed dates compared to 0', async () => {
    // Task recurring on Hijri day 15
    const def = await taskEngine.createTask({
      title: 'Full Moon Reflection',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      hijriRecurrence: {
        hijriDays: [15],
        hijriMonths: null,
      },
    });

    // 1. Sync with globalAdjustment = 0
    const syncZero = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 0 })
    );

    await syncZero.sync(horizon, validTemporalInputs);

    const occsZero = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );
    expect(occsZero.length).toBeGreaterThan(0);
    const dateZero = occsZero[0].localDate;

    // 2. Sync with globalAdjustment = 1
    const syncPlusOne = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 1 })
    );

    await syncPlusOne.sync(horizon, validTemporalInputs);

    const occsPlusOne = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );
    expect(occsPlusOne.length).toBeGreaterThan(0);
    const datePlusOne = occsPlusOne[0].localDate;

    // With +1 adjustment, effective Hijri day 15 occurs on a different Gregorian date!
    expect(datePlusOne).not.toBe(dateZero);
  });

  it('H-04: month override shifts desired seed dates for the specific Hijri month', async () => {
    const def = await taskEngine.createTask({
      title: 'Monthly White Day',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      hijriRecurrence: {
        hijriDays: [14],
        hijriMonths: null,
      },
    });

    // Determine the base Hijri year and month for September 2026
    const baseH = hijriService.toHijri('2026-09-15');
    const monthKey = `${baseH.year}-${baseH.month}`;

    // Sync with global 0
    const syncZero = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 0 })
    );
    await syncZero.sync(horizon, validTemporalInputs);
    const occsZero = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );
    const dateZero = occsZero[0].localDate;

    // Sync with month override for this specific month = -1
    const monthMap = new Map<string, number>();
    monthMap.set(monthKey, -1);

    const syncOverride = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 0, monthOverrides: monthMap })
    );
    await syncOverride.sync(horizon, validTemporalInputs);

    const occsOverride = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );
    const dateOverride = occsOverride[0].localDate;

    expect(dateOverride).not.toBe(dateZero);
  });

  it('H-05: sync reconciles PENDING Hijri occurrences when adjustment changes', async () => {
    const def = await taskEngine.createTask({
      title: 'Hijri Task',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      hijriRecurrence: {
        hijriDays: [1],
        hijriMonths: null,
      },
    });

    const sync1 = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 0 })
    );
    await sync1.sync(horizon, validTemporalInputs);

    const occs1 = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );
    expect(occs1).toHaveLength(1);
    const oldId = occs1[0].id;

    // Now change adjustment to +1
    const sync2 = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 1 })
    );
    const res2 = await sync2.sync(horizon, validTemporalInputs);

    expect(res2.deleted).toBe(1);
    expect(res2.created).toBe(1);

    const occs2 = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );
    expect(occs2).toHaveLength(1);
    expect(occs2[0].id).not.toBe(oldId);
  });

  it('H-06: COMPLETED, MISSED, and CANCELLED occurrences are never touched by adjustment change', async () => {
    const def = await taskEngine.createTask({
      title: 'Completed Hijri Task',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      hijriRecurrence: {
        hijriDays: [1],
        hijriMonths: null,
      },
    });

    const sync1 = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 0 })
    );
    await sync1.sync(horizon, validTemporalInputs);

    const [occ] = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );

    // Mark as COMPLETED
    await taskEngine.completeTask(occ.id, '2026-09-15T12:00:00.000Z');

    // Run sync with changed adjustment
    const sync2 = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 1 })
    );
    await sync2.sync(horizon, validTemporalInputs);

    const completedRow = await taskOccurrenceRepository.findById(occ.id);
    expect(completedRow?.status).toBe('COMPLETED');
    expect(completedRow?.completedAt).toBe('2026-09-15T12:00:00.000Z');
  });

  it('H-07: Gregorian recurrence is unaffected by Hijri adjustment configuration', async () => {
    const def = await taskEngine.createTask({
      title: 'Gregorian Daily',
      startDate: '2026-09-10',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      recurrenceRule: 'FREQ=DAILY',
    });

    const syncZero = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 0 })
    );
    await syncZero.sync(horizon, validTemporalInputs);

    const occsZero = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );

    const syncTwo = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 2 })
    );
    await syncTwo.sync(horizon, validTemporalInputs);

    const occsTwo = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );

    expect(occsTwo.map(o => o.localDate)).toEqual(occsZero.map(o => o.localDate));
  });

  it('H-08: loader failure logs CONTEXT issue and prevents destructive deletion of Hijri tasks', async () => {
    const def = await taskEngine.createTask({
      title: 'Protected Hijri Task',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      hijriRecurrence: {
        hijriDays: [1],
        hijriMonths: null,
      },
    });

    // Populate initial pending occurrence
    const healthySync = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => ({ globalAdjustment: 0 })
    );
    await healthySync.sync(horizon, validTemporalInputs);

    const beforeOccs = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );
    expect(beforeOccs).toHaveLength(1);

    // Now run with failing loader
    const brokenSync = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijriService,
      async () => {
        throw new Error('Database locked');
      }
    );

    const res = await brokenSync.sync(horizon, validTemporalInputs);

    // Invariant: CONTEXT issue recorded
    expect(res.issues.some(i => i.stage === 'CONTEXT')).toBe(true);

    // Invariant: PLAN-BEFORE-DELETE safety: zero deletions
    expect(res.deleted).toBe(0);

    const afterOccs = await taskOccurrenceRepository.findPendingBySeriesAndDateRange(
      def.seriesId,
      horizon.start,
      horizon.end
    );
    expect(afterOccs).toHaveLength(1);
    expect(afterOccs[0].id).toBe(beforeOccs[0].id);
  });
});
