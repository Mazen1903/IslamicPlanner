import { DateTime } from 'luxon';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { OccurrenceLifecycleService } from '../OccurrenceLifecycleService';
import type { TodayTemporalInputs } from '../types';
import { TaskValidationError } from '@/domain/task/errors';
import * as timelineModule from '@/domain/prayer/PrayerTimeline';
import { deriveOverdueState } from '../TodayViewModelProjection';

describe('OccurrenceLifecycleService & M11 Lifecycle Suite', () => {
  let lifecycleService: OccurrenceLifecycleService;

  // New York City coordinates and calculation parameters
  const nycInputs: TodayTemporalInputs = {
    coordinates: { latitude: 40.7128, longitude: -74.006 },
    params: {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'America/New_York',
    },
    planningDayConfig: {
      mode: 'FAJR',
    },
  };

  beforeEach(() => {
    createTestDatabase();
    lifecycleService = new OccurrenceLifecycleService(
      taskOccurrenceRepository,
      taskDefinitionRepository
    );
  });

  afterEach(() => {
    cleanupTestDatabase();
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // 1. LIFECYCLE STATE MACHINE & ATOMICITY (MC-01 to MC-07, LS-26, LS-27, LS-28)
  // ==========================================================================
  describe('State Machine & Atomic Status Transitions', () => {
    it('persists only PENDING, COMPLETED, MISSED, CANCELLED — OVERDUE is never persisted', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-state-1',
        title: 'State Test Task',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-state-1',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-state-1',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // Valid transitions
      const completed = await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();

      // Attempt invalid status: TS prevents it, and SQL check constraint rejects if bypassed
      await expect(
        taskOccurrenceRepository.updateStatus(occ.id, 'OVERDUE' as any)
      ).rejects.toThrow();
    });

    it('LS-26: updateStatus atomic Complete wins race against Miss', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-race-1',
        title: 'Complete Race Winner',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-race-1',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-race-1',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // Writer 1: Complete wins
      const completed = await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');
      expect(completed.status).toBe('COMPLETED');

      // Writer 2: Miss attempts transition on now-COMPLETED row -> changes=0 -> throws TaskValidationError
      await expect(
        taskOccurrenceRepository.updateStatus(occ.id, 'MISSED')
      ).rejects.toThrow(TaskValidationError);

      // Verify row remains COMPLETED and is never overwritten
      const finalRow = await taskOccurrenceRepository.findById(occ.id);
      expect(finalRow!.status).toBe('COMPLETED');
      expect(finalRow!.missedAt).toBeNull();
    });

    it('LS-27: updateStatus atomic Miss wins race against Complete', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-race-2',
        title: 'Miss Race Winner',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-race-2',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-race-2',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // Writer 1: Miss wins
      const missed = await taskOccurrenceRepository.updateStatus(occ.id, 'MISSED');
      expect(missed.status).toBe('MISSED');

      // Writer 2: Complete attempts transition on now-MISSED row -> changes=0 -> throws TaskValidationError
      await expect(
        taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED')
      ).rejects.toThrow(TaskValidationError);

      // Verify row remains MISSED
      const finalRow = await taskOccurrenceRepository.findById(occ.id);
      expect(finalRow!.status).toBe('MISSED');
      expect(finalRow!.completedAt).toBeNull();
    });

    it('LS-28: Cancel races with Miss — first writer wins, loser cannot overwrite', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-race-3',
        title: 'Cancel vs Miss Race',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-race-3',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-race-3',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // Cancel wins
      await taskOccurrenceRepository.updateStatus(occ.id, 'CANCELLED');

      // Miss attempts -> throws
      await expect(
        taskOccurrenceRepository.updateStatus(occ.id, 'MISSED')
      ).rejects.toThrow(TaskValidationError);

      const finalRow = await taskOccurrenceRepository.findById(occ.id);
      expect(finalRow!.status).toBe('CANCELLED');
    });

    it('idempotent status transition returns unchanged occurrence', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-idem-1',
        title: 'Idempotent Task',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-idem-1',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-idem-1',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');
      const secondCall = await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');
      expect(secondCall.status).toBe('COMPLETED');
    });
  });

  // ==========================================================================
  // 2. EXACT_TIME & PRAYER_RELATIVE LIFECYCLE (LS-01 to LS-05, LS-20, LS-21)
  // ==========================================================================
  describe('EXACT_TIME & PRAYER_RELATIVE Expiry', () => {
    it('LS-01 to LS-04: EXACT_TIME before due, at due, overdue, and missed at period end', async () => {
      // Build timeline for 2026-09-15 to get exact Dhuhr and Asr times
      const timeline = timelineModule.buildPrayerTimeline(
        '2026-09-15',
        nycInputs.coordinates,
        nycInputs.params
      );
      const dhuhrPeriod = timeline.periods.find(
        p => p.prayer === 'DHUHR' && p.sourceDate === '2026-09-15'
      )!;

      // Schedule at Dhuhr + 30 min
      const taskTime = dhuhrPeriod.start.plus({ minutes: 30 });

      const def = await taskDefinitionRepository.create({
        id: 'def-exact-1',
        title: 'Midday Review',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: taskTime.toFormat('HH:mm') },
        seriesId: 'series-exact-1',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 15,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-exact-1',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: taskTime.toUTC().toISO()!,
        calculatedPrayerSection: 'DHUHR',
        status: 'PENDING',
      });

      // 1. Before due: 10 minutes before taskTime
      const beforeDue = taskTime.minus({ minutes: 10 });
      let sweep = await lifecycleService.sweepExpired(beforeDue, nycInputs);
      expect(sweep.expiredCount).toBe(0);
      expect(sweep.mutatedCount).toBe(0);
      let reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('PENDING');

      // 2. Exactly at due
      sweep = await lifecycleService.sweepExpired(taskTime, nycInputs);
      expect(sweep.expiredCount).toBe(0);
      expect(sweep.mutatedCount).toBe(0);

      // 3. 20 minutes after due (inside Dhuhr period): overdue in presentation, pending in DB
      const afterDue = taskTime.plus({ minutes: 20 });
      sweep = await lifecycleService.sweepExpired(afterDue, nycInputs);
      expect(sweep.expiredCount).toBe(0);
      expect(sweep.mutatedCount).toBe(0);
      reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('PENDING');

      // 4. Exactly at period end (dhuhrPeriod.end === asrPeriod.start)
      const periodEnd = dhuhrPeriod.end;
      sweep = await lifecycleService.sweepExpired(periodEnd, nycInputs);
      expect(sweep.expiredCount).toBe(1);
      expect(sweep.mutatedCount).toBe(1);

      reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('MISSED');
      expect(reloaded!.missedAt).toBe(periodEnd.toUTC().toISO());
      // MC-05: Preserves calculated prayer section and placement
      expect(reloaded!.calculatedPrayerSection).toBe('DHUHR');
      expect(reloaded!.planningDayKey).toBe('2026-09-15');
    });

    it('LS-21: PRAYER_RELATIVE with offset landing in different prayer expires based on containing period', async () => {
      // Fajr is ~05:30, Dhuhr is ~12:55. Offset of +360 min lands in Dhuhr
      const timeline = timelineModule.buildPrayerTimeline(
        '2026-09-15',
        nycInputs.coordinates,
        nycInputs.params
      );
      const fajrPeriod = timeline.periods.find(
        p => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15'
      )!;
      const dhuhrPeriod = timeline.periods.find(
        p => p.prayer === 'DHUHR' && p.sourceDate === '2026-09-15'
      )!;

      // Start time lands in Dhuhr
      const relativeTime = dhuhrPeriod.start.plus({ minutes: 30 });
      const offsetMinutes = Math.round(relativeTime.diff(fajrPeriod.start, 'minutes').minutes);

      const def = await taskDefinitionRepository.create({
        id: 'def-rel-cross',
        title: 'Cross Prayer Relative',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'AFTER',
          offsetMinutes,
        },
        seriesId: 'series-rel-cross',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 20,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-rel-cross',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: relativeTime.toUTC().toISO()!,
        calculatedPrayerSection: 'DHUHR',
        status: 'PENDING',
      });

      // When now is at Fajr end (Dhuhr start): task is NOT expired because it falls in Dhuhr
      let sweep = await lifecycleService.sweepExpired(fajrPeriod.end, nycInputs);
      expect(sweep.expiredCount).toBe(0);

      // When now is at Dhuhr end: task expires
      sweep = await lifecycleService.sweepExpired(dhuhrPeriod.end, nycInputs);
      expect(sweep.expiredCount).toBe(1);
      expect(sweep.mutatedCount).toBe(1);

      const reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('MISSED');
    });

    it('LS-20: Stale EXACT_TIME from 3 days ago builds date-scoped timeline and transitions to MISSED', async () => {
      // Occurrence was 3 days ago: 2026-09-12
      const oldDate = '2026-09-12';
      const timelineOld = timelineModule.buildPrayerTimeline(
        oldDate,
        nycInputs.coordinates,
        nycInputs.params
      );
      const asrOld = timelineOld.periods.find(
        p => p.prayer === 'ASR' && p.sourceDate === oldDate
      )!;

      const def = await taskDefinitionRepository.create({
        id: 'def-stale-exact',
        title: 'Stale Asr Task',
        startDate: oldDate,
        source: 'USER',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: asrOld.start.toFormat('HH:mm') },
        seriesId: 'series-stale-exact',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-stale-exact',
        taskDefinitionId: def.id,
        localDate: oldDate,
        planningDayKey: oldDate,
        timezone: 'America/New_York',
        calculatedStartTime: asrOld.start.toUTC().toISO()!,
        calculatedPrayerSection: 'ASR',
        status: 'PENDING',
      });

      // Sweep run today: 2026-09-15
      const nowToday = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'America/New_York' });
      const sweep = await lifecycleService.sweepExpired(nowToday, nycInputs);

      expect(sweep.expiredCount).toBe(1);
      expect(sweep.mutatedCount).toBe(1);

      const reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('MISSED');
      expect(reloaded!.missedAt).toBe(asrOld.end.toUTC().toISO());
    });
  });

  // ==========================================================================
  // 3. PRAYER_WINDOW LIFECYCLE (LS-06 to LS-08, LS-32)
  // ==========================================================================
  describe('PRAYER_WINDOW Expiry', () => {
    it('LS-06 to LS-08: PRAYER_WINDOW pending before windowEnd, missed at windowEnd, never overdue', async () => {
      const windowStart = DateTime.fromISO('2026-09-15T13:00:00Z');
      const windowEnd = DateTime.fromISO('2026-09-15T17:00:00Z');

      const def = await taskDefinitionRepository.create({
        id: 'def-win-1',
        title: 'Afternoon Window Work',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: { startPrayer: 'DHUHR', endPrayer: 'MAGHRIB' },
        seriesId: 'series-win-1',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 60,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-win-1',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        windowStart: windowStart.toISO(),
        windowEnd: windowEnd.toISO(),
        eligiblePrayerSections: ['DHUHR', 'ASR'],
        status: 'PENDING',
      });

      // 1. Before windowEnd: not expired
      const beforeEnd = windowEnd.minus({ minutes: 5 });
      let sweep = await lifecycleService.sweepExpired(beforeEnd, nycInputs);
      expect(sweep.expiredCount).toBe(0);

      // 2. At windowEnd: transitions to MISSED
      sweep = await lifecycleService.sweepExpired(windowEnd, nycInputs);
      expect(sweep.expiredCount).toBe(1);
      expect(sweep.mutatedCount).toBe(1);

      const reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('MISSED');
      expect(reloaded!.missedAt).toBe(windowEnd.toUTC().toISO());
      // Frozen eligible sections preserved
      expect(reloaded!.eligiblePrayerSections).toEqual(['DHUHR', 'ASR']);
    });
  });

  // ==========================================================================
  // 4. ANYTIME_TODAY LIFECYCLE (LS-09, LS-23, LS-24, LS-25, LS-33)
  // ==========================================================================
  describe('ANYTIME_TODAY PlanningDay Boundaries', () => {
    it('LS-23: FAJR mode expires at next day Fajr start (not midnight)', async () => {
      const fajrInputs: TodayTemporalInputs = {
        ...nycInputs,
        planningDayConfig: { mode: 'FAJR' },
      };

      const timeline = timelineModule.buildPrayerTimeline(
        '2026-09-15',
        fajrInputs.coordinates,
        fajrInputs.params
      );
      // Next day Fajr is the end of Isha on 2026-09-15
      const ishaPeriod = timeline.periods.find(
        p => p.prayer === 'ISHA' && p.sourceDate === '2026-09-15'
      )!;
      const nextFajrStart = ishaPeriod.end;

      const def = await taskDefinitionRepository.create({
        id: 'def-any-fajr',
        title: 'Anytime Fajr Mode',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-any-fajr',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-any-fajr',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // At 23:59:59 (before next Fajr): NOT expired
      const nightTime = DateTime.fromISO('2026-09-15T23:59:59', { zone: 'America/New_York' });
      let sweep = await lifecycleService.sweepExpired(nightTime, fajrInputs);
      expect(sweep.expiredCount).toBe(0);

      // At next day 03:00 (still before Fajr ~05:35): NOT expired
      const earlyMorning = nextFajrStart.minus({ minutes: 15 });
      sweep = await lifecycleService.sweepExpired(earlyMorning, fajrInputs);
      expect(sweep.expiredCount).toBe(0);

      // Exactly at next Fajr start: expires
      sweep = await lifecycleService.sweepExpired(nextFajrStart, fajrInputs);
      expect(sweep.expiredCount).toBe(1);
      expect(sweep.mutatedCount).toBe(1);

      const reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('MISSED');
      expect(reloaded!.missedAt).toBe(nextFajrStart.toUTC().toISO());
    });

    it('LS-24: CUSTOM 19:00 mode expires at D @ 19:00', async () => {
      const customInputs: TodayTemporalInputs = {
        ...nycInputs,
        planningDayConfig: { mode: 'CUSTOM', localTime: '19:00' },
      };

      // Planning day key '2026-09-15' under CUSTOM 19:00 ends at 2026-09-15 19:00
      const boundaryEnd = DateTime.fromISO('2026-09-15T19:00:00', { zone: 'America/New_York' });

      const def = await taskDefinitionRepository.create({
        id: 'def-any-custom',
        title: 'Anytime Custom Mode',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-any-custom',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-any-custom',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // At 18:59: NOT expired
      let sweep = await lifecycleService.sweepExpired(boundaryEnd.minus({ minutes: 1 }), customInputs);
      expect(sweep.expiredCount).toBe(0);

      // At 19:00: expired
      sweep = await lifecycleService.sweepExpired(boundaryEnd, customInputs);
      expect(sweep.expiredCount).toBe(1);
      expect(sweep.mutatedCount).toBe(1);

      const reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('MISSED');
    });

    it('MIDNIGHT mode expires at D+1 00:00', async () => {
      const midnightInputs: TodayTemporalInputs = {
        ...nycInputs,
        planningDayConfig: { mode: 'MIDNIGHT' },
      };

      const midnightEnd = DateTime.fromISO('2026-09-16T00:00:00', { zone: 'America/New_York' });

      const def = await taskDefinitionRepository.create({
        id: 'def-any-mid',
        title: 'Anytime Midnight Mode',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-any-mid',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      await taskOccurrenceRepository.create({
        id: 'occ-any-mid',
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      let sweep = await lifecycleService.sweepExpired(midnightEnd.minus({ minutes: 1 }), midnightInputs);
      expect(sweep.expiredCount).toBe(0);

      sweep = await lifecycleService.sweepExpired(midnightEnd, midnightInputs);
      expect(sweep.expiredCount).toBe(1);
      expect(sweep.mutatedCount).toBe(1);
    });

    it('LS-25: Future ANYTIME_TODAY occurrence is NOT expired', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-any-future',
        title: 'Future Anytime Task',
        startDate: '2026-09-20',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-any-future',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-any-future',
        taskDefinitionId: def.id,
        localDate: '2026-09-20',
        planningDayKey: '2026-09-20',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // Today is 2026-09-15
      const nowToday = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'America/New_York' });
      const sweep = await lifecycleService.sweepExpired(nowToday, nycInputs);

      expect(sweep.expiredCount).toBe(0);
      expect(sweep.mutatedCount).toBe(0);

      const reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('PENDING');
    });
  });

  // ==========================================================================
  // 5. TIMELINE CACHING WITHIN SWEEP (LS-34) & CANONICAL CENTER DATE (Clarification A)
  // ==========================================================================
  describe('Date-Scoped Timeline Strategy & Caching', () => {
    it('LS-34: reuses timeline cache for multiple occurrences sharing the same civil date', async () => {
      const buildSpy = jest.spyOn(timelineModule, 'buildPrayerTimeline');

      const def1 = await taskDefinitionRepository.create({
        id: 'def-cache-1',
        title: 'Shared Date Def 1',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '14:00' },
        seriesId: 'series-cache-1',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 15,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const def2 = await taskDefinitionRepository.create({
        id: 'def-cache-2',
        title: 'Shared Date Def 2',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '15:00' },
        seriesId: 'series-cache-2',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 15,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const def3 = await taskDefinitionRepository.create({
        id: 'def-cache-3',
        title: 'Shared Date Def 3',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '16:00' },
        seriesId: 'series-cache-3',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 15,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      // Create 3 occurrences on 2026-09-15 across the 3 definitions
      await taskOccurrenceRepository.create({
        id: 'occ-cache-1',
        taskDefinitionId: def1.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T18:00:00.000Z', // 14:00 EDT
        status: 'PENDING',
      });

      await taskOccurrenceRepository.create({
        id: 'occ-cache-2',
        taskDefinitionId: def2.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T19:00:00.000Z', // 15:00 EDT
        status: 'PENDING',
      });

      await taskOccurrenceRepository.create({
        id: 'occ-cache-3',
        taskDefinitionId: def3.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T20:00:00.000Z', // 16:00 EDT
        status: 'PENDING',
      });

      const now = DateTime.fromISO('2026-09-15T23:00:00', { zone: 'America/New_York' });
      await lifecycleService.sweepExpired(now, nycInputs);

      // Verify buildPrayerTimeline was called exactly ONCE for '2026-09-15'
      const callsFor20260915 = buildSpy.mock.calls.filter(call => call[0] === '2026-09-15');
      expect(callsFor20260915.length).toBe(1);
    });

    it('Clarification A: centers timeline on local civil date of calculatedStartTime, not localDate', async () => {
      const buildSpy = jest.spyOn(timelineModule, 'buildPrayerTimeline');

      const def = await taskDefinitionRepository.create({
        id: 'def-cross-civil',
        title: 'Cross Civil Boundary Task',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '01:00' },
        seriesId: 'series-cross-civil',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 15,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      // Suppose localDate was seeded as '2026-09-14' but calculatedStartTime in NYC is 2026-09-15 01:00 EDT
      // (2026-09-15T05:00:00Z)
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-cross-civil',
        taskDefinitionId: def.id,
        localDate: '2026-09-14', // intentionally different seed date
        planningDayKey: '2026-09-14',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T05:00:00.000Z', // In America/New_York this is 2026-09-15 01:00 AM
        status: 'PENDING',
      });

      const now = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'America/New_York' });
      await lifecycleService.sweepExpired(now, nycInputs);

      // Verify buildPrayerTimeline was called with center date '2026-09-15', NOT '2026-09-14'
      const callsFor20260915 = buildSpy.mock.calls.filter(call => call[0] === '2026-09-15');
      expect(callsFor20260915.length).toBeGreaterThanOrEqual(1);

      const reloaded = await taskOccurrenceRepository.findById(occ.id);
      expect(reloaded!.status).toBe('MISSED');
    });
  });

  // ==========================================================================
  // 6. LIVE OVERDUE DERIVATION (LS-29 to LS-33)
  // ==========================================================================
  describe('Live Overdue Derivation (deriveOverdueState)', () => {
    it('LS-29: returns isOverdue=true and correct overdueMinutes when now > dueAt and now < expiresAt', () => {
      const dueAt = DateTime.fromISO('2026-09-15T14:00:00Z');
      const expiresAt = DateTime.fromISO('2026-09-15T17:00:00Z');

      const card = {
        occurrenceId: 'c-1',
        taskDefinitionId: 'd-1',
        title: 'Overdue Task',
        scheduleType: 'EXACT_TIME' as const,
        scheduleLabel: '2:00 PM',
        priority: 'NORMAL' as const,
        status: 'PENDING' as const,
        estimatedMinutes: 15,
        sortInstant: dueAt.toISO(),
        createdAt: '2026-09-15T10:00:00Z',
        completedAt: null,
        missedAt: null,
        dueAt: dueAt.toISO(),
        expiresAt: expiresAt.toISO(),
      };

      // 1. Before due
      const before = dueAt.minus({ minutes: 5 });
      expect(deriveOverdueState(card, before)).toEqual({ isOverdue: false, overdueMinutes: 0 });

      // 2. Exactly at due
      expect(deriveOverdueState(card, dueAt)).toEqual({ isOverdue: false, overdueMinutes: 0 });

      // 3. 30 seconds overdue (< 1 min)
      const thirtySecs = dueAt.plus({ seconds: 30 });
      expect(deriveOverdueState(card, thirtySecs)).toEqual({ isOverdue: true, overdueMinutes: 0 });

      // 4. 5 minutes overdue
      const fiveMin = dueAt.plus({ minutes: 5 });
      expect(deriveOverdueState(card, fiveMin)).toEqual({ isOverdue: true, overdueMinutes: 5 });

      // 5. LS-30: 6 minutes overdue (advances with pure arithmetic, no DB)
      const sixMin = dueAt.plus({ minutes: 6 });
      expect(deriveOverdueState(card, sixMin)).toEqual({ isOverdue: true, overdueMinutes: 6 });

      // 6. LS-31: At or past expiresAt, overdue clears
      expect(deriveOverdueState(card, expiresAt)).toEqual({ isOverdue: false, overdueMinutes: 0 });
      expect(deriveOverdueState(card, expiresAt.plus({ minutes: 5 }))).toEqual({
        isOverdue: false,
        overdueMinutes: 0,
      });
    });

    it('LS-32: PRAYER_WINDOW always returns isOverdue=false', () => {
      const card = {
        occurrenceId: 'c-win',
        taskDefinitionId: 'd-win',
        title: 'Window Task',
        scheduleType: 'PRAYER_WINDOW' as const,
        scheduleLabel: 'Dhuhr – Asr',
        priority: 'NORMAL' as const,
        status: 'PENDING' as const,
        estimatedMinutes: 30,
        sortInstant: null,
        createdAt: '2026-09-15T10:00:00Z',
        completedAt: null,
        missedAt: null,
        dueAt: null,
        expiresAt: null,
      };

      const now = DateTime.fromISO('2026-09-15T15:00:00Z');
      expect(deriveOverdueState(card, now)).toEqual({ isOverdue: false, overdueMinutes: 0 });
    });

    it('LS-33: ANYTIME_TODAY always returns isOverdue=false', () => {
      const card = {
        occurrenceId: 'c-any',
        taskDefinitionId: 'd-any',
        title: 'Anytime Task',
        scheduleType: 'ANYTIME_TODAY' as const,
        scheduleLabel: 'Anytime Today',
        priority: 'NORMAL' as const,
        status: 'PENDING' as const,
        estimatedMinutes: 30,
        sortInstant: null,
        createdAt: '2026-09-15T10:00:00Z',
        completedAt: null,
        missedAt: null,
        dueAt: null,
        expiresAt: null,
      };

      const now = DateTime.fromISO('2026-09-15T15:00:00Z');
      expect(deriveOverdueState(card, now)).toEqual({ isOverdue: false, overdueMinutes: 0 });
    });

    it('completed or missed card always returns isOverdue=false', () => {
      const card = {
        occurrenceId: 'c-term',
        taskDefinitionId: 'd-term',
        title: 'Completed Task',
        scheduleType: 'EXACT_TIME' as const,
        scheduleLabel: '2:00 PM',
        priority: 'NORMAL' as const,
        status: 'COMPLETED' as const,
        estimatedMinutes: 15,
        sortInstant: '2026-09-15T14:00:00Z',
        createdAt: '2026-09-15T10:00:00Z',
        completedAt: '2026-09-15T14:30:00Z',
        missedAt: null,
        dueAt: '2026-09-15T14:00:00Z',
        expiresAt: '2026-09-15T17:00:00Z',
      };

      const now = DateTime.fromISO('2026-09-15T15:00:00Z');
      expect(deriveOverdueState(card, now)).toEqual({ isOverdue: false, overdueMinutes: 0 });
    });
  });

  // ==========================================================================
  // 7. CATCH-UP & ABSENCE REPAIR (LS-10, LS-22)
  // ==========================================================================
  describe('Absence & Multi-Day Catch-Up Sweep', () => {
    it('LS-10 & LS-22: repairs stale occurrences across multiple days when app was closed', async () => {
      // Create tasks from 3 days ago (2026-09-12), 2 days ago (2026-09-13), and yesterday (2026-09-14)
      const def = await taskDefinitionRepository.create({
        id: 'def-multi-stale',
        title: 'Daily Task',
        startDate: '2026-09-12',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-multi-stale',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      await taskOccurrenceRepository.create({
        id: 'occ-stale-day-1',
        taskDefinitionId: def.id,
        localDate: '2026-09-12',
        planningDayKey: '2026-09-12',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      await taskOccurrenceRepository.create({
        id: 'occ-stale-day-2',
        taskDefinitionId: def.id,
        localDate: '2026-09-13',
        planningDayKey: '2026-09-13',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      await taskOccurrenceRepository.create({
        id: 'occ-stale-day-3',
        taskDefinitionId: def.id,
        localDate: '2026-09-14',
        planningDayKey: '2026-09-14',
        timezone: 'America/New_York',
        status: 'PENDING',
      });

      // App opens on 2026-09-16 12:00
      const now = DateTime.fromISO('2026-09-16T12:00:00', { zone: 'America/New_York' });
      const sweep = await lifecycleService.sweepExpired(now, nycInputs);

      expect(sweep.evaluatedCount).toBe(3);
      expect(sweep.expiredCount).toBe(3);
      expect(sweep.mutatedCount).toBe(3);

      const occ1 = await taskOccurrenceRepository.findById('occ-stale-day-1');
      const occ2 = await taskOccurrenceRepository.findById('occ-stale-day-2');
      const occ3 = await taskOccurrenceRepository.findById('occ-stale-day-3');

      expect(occ1!.status).toBe('MISSED');
      expect(occ2!.status).toBe('MISSED');
      expect(occ3!.status).toBe('MISSED');
    });
  });
});
