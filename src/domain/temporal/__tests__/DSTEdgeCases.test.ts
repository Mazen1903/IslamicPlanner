import { DateTime } from 'luxon';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import type { PrayerCalculationParams } from '@/domain/prayer/types';
import type { PlanningDayConfig } from '@/domain/planning-day/types';
import { resolvePlanningDayForTime } from '@/domain/planning-day/PlanningDayEngine';
import { resolvePlacement } from '@/domain/scheduling/SchedulingEngine';
import type { TaskDefinition } from '@/domain/task/types';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { RecurringHorizonSync } from '@/features/task-form/recurringHorizonSync';
import { RecurrenceEngine } from '@/domain/recurrence/RecurrenceEngine';
import { MaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { HijriService } from '@/domain/calendar/HijriService';

describe('DSTEdgeCases (DST-01 to DST-10)', () => {
  const chicago = {
    coords: { latitude: 41.8781, longitude: -87.6298 },
    tz: 'America/Chicago',
  };

  const chicagoParams: PrayerCalculationParams = {
    method: 'ISNA',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    timezone: chicago.tz,
  };

  const fajrConfig: PlanningDayConfig = { mode: 'FAJR' };
  const midnightConfig: PlanningDayConfig = { mode: 'MIDNIGHT' };

  const makeTaskDef = (overrides: Partial<TaskDefinition> = {}): TaskDefinition => ({
    id: 'def-dst-test',
    title: 'DST Test Task',
    description: null,
    startDate: '2026-03-01',
    source: 'USER',
    worshipItemKey: null,
    scheduleType: 'EXACT_TIME',
    scheduleData: { localTime: '02:30' },
    recurrenceRule: null,
    hijriRecurrence: null,
    recurrenceEnd: null,
    seriesId: 'series-dst-test',
    seriesVersion: 1,
    effectiveFromDate: null,
    effectiveToDate: null,
    reminderRule: null,
    priority: 'NORMAL',
    estimatedMinutes: 30,
    notes: null,
    tags: [],
    subtasks: [],
    isActive: true,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  });

  describe('WallClock Resolution at DST Boundaries (DST-01..DST-04) — UNIT', () => {
    it('DST-01: (UNIT) Spring-forward: EXACT_TIME task at skipped hour shifts to first valid instant (SPRING_FORWARD_SHIFTED)', () => {
      // March 8, 2026 in America/Chicago: 02:00 -> 03:00 is skipped.
      const timeline = buildPrayerTimeline('2026-03-08', chicago.coords, chicagoParams);
      const def = makeTaskDef({
        startDate: '2026-03-08',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '02:30' },
      });

      const res = resolvePlacement(def, '2026-03-08', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.wallClockResolution).toBe('SPRING_FORWARD_SHIFTED');
      expect(res.calculatedStartTime?.toFormat('HH:mm')).toBe('03:00');
      expect(res.calculatedStartTime?.offset).toBe(-300); // CDT (-5h)
    });

    it('DST-02: (UNIT) Spring-forward: PRAYER_RELATIVE task offset resolves correctly across DST gap', () => {
      const timeline = buildPrayerTimeline('2026-03-08', chicago.coords, chicagoParams);
      // Fajr on March 8, 2026 is around 05:54 CDT
      const def = makeTaskDef({
        startDate: '2026-03-08',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'AFTER',
          offsetMinutes: 30,
        },
      });

      const res = resolvePlacement(def, '2026-03-08', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedStartTime).not.toBeNull();
      const fajrPeriod = timeline.periods.find(p => p.prayer === 'FAJR' && p.sourceDate === '2026-03-08')!;
      const expectedTime = fajrPeriod.start.plus({ minutes: 30 });
      expect(res.calculatedStartTime?.toMillis()).toBe(expectedTime.toMillis());
    });

    it('DST-03: (UNIT) Fall-back: EXACT_TIME task at ambiguous hour resolves to earlier occurrence (FALL_BACK_FIRST)', () => {
      // Nov 1, 2026 in America/Chicago: 01:30 occurs twice (CDT -05:00 and CST -06:00)
      const timeline = buildPrayerTimeline('2026-11-01', chicago.coords, chicagoParams);
      const def = makeTaskDef({
        startDate: '2026-11-01',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '01:30' },
      });

      const res = resolvePlacement(def, '2026-11-01', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.wallClockResolution).toBe('FALL_BACK_FIRST');
      expect(res.calculatedStartTime?.toFormat('HH:mm')).toBe('01:30');
      expect(res.calculatedStartTime?.offset).toBe(-300); // CDT (-5h) earlier occurrence
    });

    it('DST-04: (UNIT) Fall-back: only ONE occurrence created for a single fall-back local time (not duplicated)', () => {
      const timeline = buildPrayerTimeline('2026-11-01', chicago.coords, chicagoParams);
      const def = makeTaskDef({
        startDate: '2026-11-01',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '01:30' },
      });

      const res = resolvePlacement(def, '2026-11-01', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      // Exactly one calculatedStartTime is returned
      expect(res.calculatedStartTime).not.toBeNull();
      expect(res.wallClockResolution).toBe('FALL_BACK_FIRST');
    });
  });

  describe('Recurrence Sync at DST Boundaries (DST-05..DST-06) — INTEGRATION', () => {
    let taskEngine: TaskEngine;
    let sync: RecurringHorizonSync;

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

    it('DST-05: (INTEGRATION) Recurrence sync idempotent at DST spring-forward boundary (+/-7 day window): no missing occurrence', async () => {
      const def = await taskEngine.createTask({
        title: 'Spring Forward Daily Task',
        startDate: '2026-03-01',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '02:30' },
        recurrenceRule: 'FREQ=DAILY',
      });

      // Horizon spanning spring-forward boundary (March 8, 2026)
      const horizon = { start: '2026-03-02', end: '2026-03-12' };
      const temporalInputs = {
        coordinates: chicago.coords,
        params: chicagoParams,
        planningDayConfig: fajrConfig,
      };

      // Run sync twice to verify idempotency
      const res1 = await sync.syncSeries(def.seriesId, horizon, temporalInputs);
      expect(res1.created).toBe(11);

      const res2 = await sync.syncSeries(def.seriesId, horizon, temporalInputs);
      expect(res2.created).toBe(0);
      expect(res2.retained).toBe(11);

      // Verify the occurrence on spring-forward day (2026-03-08) exists and shifted cleanly
      const springOcc = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-03-08');
      expect(springOcc).not.toBeNull();
      expect(springOcc?.wallClockResolution).toBe('SPRING_FORWARD_SHIFTED');
      expect(springOcc?.status).toBe('PENDING');
    });

    it('DST-06: (INTEGRATION) Recurrence sync idempotent at DST fall-back boundary (+/-7 day window): no duplicate occurrence', async () => {
      const def = await taskEngine.createTask({
        title: 'Fall Back Daily Task',
        startDate: '2026-10-25',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '01:30' },
        recurrenceRule: 'FREQ=DAILY',
      });

      // Horizon spanning fall-back boundary (November 1, 2026)
      const horizon = { start: '2026-10-26', end: '2026-11-05' };
      const temporalInputs = {
        coordinates: chicago.coords,
        params: chicagoParams,
        planningDayConfig: fajrConfig,
      };

      const res1 = await sync.syncSeries(def.seriesId, horizon, temporalInputs);
      expect(res1.created).toBe(11);

      const res2 = await sync.syncSeries(def.seriesId, horizon, temporalInputs);
      expect(res2.created).toBe(0);
      expect(res2.retained).toBe(11);

      // Verify exactly one occurrence exists for 2026-11-01
      const fallOcc = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-11-01');
      expect(fallOcc).not.toBeNull();
      expect(fallOcc?.wallClockResolution).toBe('FALL_BACK_FIRST');

      const allOccurrences = await taskOccurrenceRepository.findPendingByLocalDateRange('2026-10-26', '2026-11-05');
      const nov1Occurrences = allOccurrences.filter(o => o.seriesId === def.seriesId && o.localDate === '2026-11-01');
      expect(nov1Occurrences).toHaveLength(1);
    });
  });

  describe('Calendar & Boundary Durations (DST-07..DST-10) — UNIT', () => {
    it('DST-07: (UNIT) Civil day is 23 hours on spring-forward: planningDayKey correct', () => {
      const timeline = buildPrayerTimeline('2026-03-08', chicago.coords, chicagoParams);
      const noon = DateTime.fromISO('2026-03-08T12:00:00', { zone: chicago.tz });

      const pd = resolvePlanningDayForTime(midnightConfig, timeline, noon);
      expect(pd.key).toBe('2026-03-08');
      expect(pd.end.diff(pd.start, 'hours').hours).toBe(23);
    });

    it('DST-08: (UNIT) Civil day is 25 hours on fall-back: planningDayKey correct', () => {
      const timeline = buildPrayerTimeline('2026-11-01', chicago.coords, chicagoParams);
      const noon = DateTime.fromISO('2026-11-01T12:00:00', { zone: chicago.tz });

      const pd = resolvePlanningDayForTime(midnightConfig, timeline, noon);
      expect(pd.key).toBe('2026-11-01');
      expect(pd.end.diff(pd.start, 'hours').hours).toBe(25);
    });

    it('DST-09: (UNIT) Year boundary Dec 31 -> Jan 1 planningDayKey correct', () => {
      const timeline = buildPrayerTimeline('2026-12-31', chicago.coords, chicagoParams);
      const dec31Eve = DateTime.fromISO('2026-12-31T23:59:00', { zone: chicago.tz });
      const pdDec = resolvePlanningDayForTime(midnightConfig, timeline, dec31Eve);
      expect(pdDec.key).toBe('2026-12-31');

      const timelineJan = buildPrayerTimeline('2027-01-01', chicago.coords, chicagoParams);
      const jan1Morning = DateTime.fromISO('2027-01-01T00:01:00', { zone: chicago.tz });
      const pdJan = resolvePlanningDayForTime(midnightConfig, timelineJan, jan1Morning);
      expect(pdJan.key).toBe('2027-01-01');
    });

    it('DST-10: (UNIT) Leap year Feb 29 planningDayKey correct', () => {
      // 2028 is a leap year
      const timelineLeap = buildPrayerTimeline('2028-02-29', chicago.coords, chicagoParams);
      const feb29Noon = DateTime.fromISO('2028-02-29T12:00:00', { zone: chicago.tz });

      const pdLeap = resolvePlanningDayForTime(fajrConfig, timelineLeap, feb29Noon);
      expect(pdLeap.key).toBe('2028-02-29');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(pdLeap.key)).toBe(true);
    });
  });
});
