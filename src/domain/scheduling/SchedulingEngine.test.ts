import { DateTime } from 'luxon';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import type { PrayerCalculationParams, PrayerTimeline } from '@/domain/prayer/types';
import type { PlanningDayConfig } from '@/domain/planning-day/types';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';
import {
  SchedulingEngine,
  resolvePlacement,
  recalculateOccurrencePlacement,
} from './SchedulingEngine';
import { SchedulingResolutionError } from './types';

describe('SchedulingEngine', () => {
  const LOCATIONS = {
    mecca: { latitude: 21.4225, longitude: 39.8262, tz: 'Asia/Riyadh' },
    newYork: { latitude: 40.7128, longitude: -74.006, tz: 'America/New_York' },
    london: { latitude: 51.5074, longitude: -0.1278, tz: 'Europe/London' },
    chicago: { latitude: 41.8781, longitude: -87.6298, tz: 'America/Chicago' },
  };

  const defaultAdjustments = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  };

  const nyParams: PrayerCalculationParams = {
    method: 'ISNA',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: defaultAdjustments,
    timezone: LOCATIONS.newYork.tz,
  };

  const meccaParams: PrayerCalculationParams = {
    method: 'MAKKAH',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: defaultAdjustments,
    timezone: LOCATIONS.mecca.tz,
  };

  const chicagoParams: PrayerCalculationParams = {
    method: 'ISNA',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: defaultAdjustments,
    timezone: LOCATIONS.chicago.tz,
  };

  const fajrConfig: PlanningDayConfig = { mode: 'FAJR' };
  const midnightConfig: PlanningDayConfig = { mode: 'MIDNIGHT' };
  const custom19Config: PlanningDayConfig = { mode: 'CUSTOM', localTime: '19:00' };

  function makeTaskDefinition(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
    return {
      id: 'def-1',
      title: 'Test Task',
      description: null,
      startDate: '2026-09-15',
      source: 'USER',
      worshipItemKey: null,
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '18:00' },
      recurrenceRule: null,
      hijriRecurrence: null,
      recurrenceEnd: null,
      seriesId: 'series-1',
      seriesVersion: 1,
      effectiveFromDate: null,
      effectiveToDate: null,
      reminderRule: null,
      priority: 'NORMAL',
      estimatedMinutes: null,
      notes: null,
      tags: [],
      subtasks: [],
      isActive: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      ...overrides,
    };
  }

  function makeTaskOccurrence(overrides: Partial<TaskOccurrence> = {}): TaskOccurrence {
    return {
      id: 'occ-1',
      taskDefinitionId: 'def-1',
      seriesId: 'series-1',
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/New_York',
      calculatedStartTime: null,
      calculatedPrayerSection: null,
      eligiblePrayerSections: null,
      wallClockResolution: null,
      status: 'PENDING',
      completedAt: null,
      missedAt: null,
      overrideData: null,
      ...overrides,
    };
  }

  // =========================================================================
  // 15.2 EXACT_TIME Tests (ET-01 to ET-08)
  // =========================================================================
  describe('EXACT_TIME (ET-01 to ET-08)', () => {
    it('ET-01: Basic placement — 18:00 resolves to ASR section in NYC summer', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '18:00' },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.localDate).toBe('2026-09-15');
      expect(res.planningDayKey).toBe('2026-09-15');
      expect(res.calculatedPrayerSection).toBe('ASR');
      expect(res.wallClockResolution).toBe('NORMAL');
      expect(res.calculatedStartTime?.toFormat('HH:mm')).toBe('18:00');
      expect(res.eligiblePrayerSections).toBeNull();
      expect(res.windowStart).toBeNull();
      expect(res.windowEnd).toBeNull();
    });

    it('ET-02: Seasonal prayer reassignment — 17:00 resolves to ASR in summer and MAGHRIB in winter', () => {
      // In summer (Sept 15), Asr is ~16:26 and Maghrib is ~19:07, so 17:00 is in ASR
      const timelineSummer = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      // In winter (Dec 15), Maghrib is ~16:30 and Isha is ~17:58, so 17:00 is in MAGHRIB
      const timelineWinter = buildPrayerTimeline('2026-12-15', LOCATIONS.newYork, nyParams);

      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '17:00' },
      });

      const resSummer = resolvePlacement(def, '2026-09-15', {
        timeline: timelineSummer,
        planningDayConfig: fajrConfig,
      });
      const resWinter = resolvePlacement(def, '2026-12-15', {
        timeline: timelineWinter,
        planningDayConfig: fajrConfig,
      });

      expect(resSummer.calculatedPrayerSection).toBe('ASR');
      expect(resWinter.calculatedPrayerSection).toBe('MAGHRIB');
      expect(resWinter.localDate).toBe('2026-12-15');
      expect(resWinter.calculatedStartTime?.toFormat('HH:mm')).toBe('17:00');
    });

    it('ET-03: Exact prayer boundary belongs to the new prayer (start inclusive)', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const maghribPeriod = timeline.periods.find(
        (p) => p.prayer === 'MAGHRIB' && p.sourceDate === '2026-09-15'
      )!;
      const maghribTimeStr = maghribPeriod.start.toFormat('HH:mm');

      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: maghribTimeStr },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedPrayerSection).toBe('MAGHRIB');
    });

    it('ET-04: One minute before prayer boundary belongs to previous prayer', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const maghribPeriod = timeline.periods.find(
        (p) => p.prayer === 'MAGHRIB' && p.sourceDate === '2026-09-15'
      )!;
      const oneMinuteBeforeStr = maghribPeriod.start.minus({ minutes: 1 }).toFormat('HH:mm');

      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: oneMinuteBeforeStr },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedPrayerSection).toBe('ASR');
    });

    it('ET-05: Spring-forward DST shifts nonexistent time and records SPRING_FORWARD_SHIFTED', () => {
      const timeline = buildPrayerTimeline('2026-03-08', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '02:30' },
      });

      const res = resolvePlacement(def, '2026-03-08', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.wallClockResolution).toBe('SPRING_FORWARD_SHIFTED');
      expect(res.calculatedStartTime?.toFormat('HH:mm')).toBe('03:00');
      expect(res.calculatedStartTime?.offset).toBe(-240); // EDT (-4h)
    });

    it('ET-06: Fall-back DST selects earlier occurrence and records FALL_BACK_FIRST', () => {
      const timeline = buildPrayerTimeline('2026-11-01', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '01:30' },
      });

      const res = resolvePlacement(def, '2026-11-01', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.wallClockResolution).toBe('FALL_BACK_FIRST');
      expect(res.calculatedStartTime?.toFormat('HH:mm')).toBe('01:30');
      expect(res.calculatedStartTime?.offset).toBe(-240); // EDT (-4h) earlier offset
    });

    it('ET-07: Timezone travel preserves 18:00 local clock in Chicago and Riyadh', () => {
      const chicagoTimeline = buildPrayerTimeline('2026-09-15', LOCATIONS.chicago, chicagoParams);
      const riyadhTimeline = buildPrayerTimeline('2026-09-15', LOCATIONS.mecca, meccaParams);

      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '18:00' },
      });

      const resChicago = resolvePlacement(def, '2026-09-15', {
        timeline: chicagoTimeline,
        planningDayConfig: fajrConfig,
      });
      const resRiyadh = resolvePlacement(def, '2026-09-15', {
        timeline: riyadhTimeline,
        planningDayConfig: fajrConfig,
      });

      expect(resChicago.calculatedStartTime?.toFormat('HH:mm')).toBe('18:00');
      expect(resChicago.calculatedStartTime?.zoneName).toBe('America/Chicago');

      expect(resRiyadh.calculatedStartTime?.toFormat('HH:mm')).toBe('18:00');
      expect(resRiyadh.calculatedStartTime?.zoneName).toBe('Asia/Riyadh');

      // UTC absolute instants differ because of timezone differences
      expect(resChicago.calculatedStartTime?.toMillis()).not.toBe(
        resRiyadh.calculatedStartTime?.toMillis()
      );
    });

    it('ET-08: Pre-Fajr morning time (02:00 Tue) resolves to Monday planning day under FAJR mode', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '02:00' },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.localDate).toBe('2026-09-15'); // Seed date is preserved
      expect(res.planningDayKey).toBe('2026-09-14'); // Belongs to Monday's planning day
      expect(res.calculatedPrayerSection).toBe('ISHA'); // Belongs to Monday night's Isha period
    });
  });

  // =========================================================================
  // 15.3 PRAYER_RELATIVE Tests (PR-01 to PR-06)
  // =========================================================================
  describe('PRAYER_RELATIVE (PR-01 to PR-06)', () => {
    it('PR-01: MAGHRIB +90m crosses into ISHA section', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'MAGHRIB',
          direction: 'AFTER',
          offsetMinutes: 90,
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      const maghribPeriod = timeline.periods.find(
        (p) => p.prayer === 'MAGHRIB' && p.sourceDate === '2026-09-15'
      )!;
      const expectedTime = maghribPeriod.start.plus({ minutes: 90 });

      expect(res.calculatedStartTime?.toMillis()).toBe(expectedTime.toMillis());
      expect(res.calculatedPrayerSection).toBe('ISHA');
      expect(res.wallClockResolution).toBeNull();
    });

    it('PR-02: FAJR -90m planning-day crossing under FAJR mode', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'BEFORE',
          offsetMinutes: 90,
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      const fajrPeriod = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15'
      )!;
      const expectedTime = fajrPeriod.start.minus({ minutes: 90 });

      expect(res.localDate).toBe('2026-09-15');
      expect(res.planningDayKey).toBe('2026-09-14'); // Crosses into Monday planning day
      expect(res.calculatedStartTime?.toMillis()).toBe(expectedTime.toMillis());
      expect(res.calculatedPrayerSection).toBe('ISHA');
    });

    it('PR-03: Elapsed absolute minutes over DST transition are exact', () => {
      const timeline = buildPrayerTimeline('2026-03-08', LOCATIONS.newYork, nyParams);
      const fajrPeriod = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-03-08'
      )!;

      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'AFTER',
          offsetMinutes: 120,
        },
      });

      const res = resolvePlacement(def, '2026-03-08', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      const diffMinutes = res.calculatedStartTime!.diff(fajrPeriod.start, 'minutes').minutes;
      expect(diffMinutes).toBe(120);
    });

    it('PR-04: Zero offset lands on exact prayer start', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const fajrPeriod = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15'
      )!;

      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'AFTER',
          offsetMinutes: 0,
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedStartTime?.toMillis()).toBe(fajrPeriod.start.toMillis());
      expect(res.calculatedPrayerSection).toBe('FAJR');
    });

    it('PR-05: Offset lands at exact prayer boundary and belongs to new prayer', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const fajrPeriod = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15'
      )!;
      const dhuhrPeriod = timeline.periods.find(
        (p) => p.prayer === 'DHUHR' && p.sourceDate === '2026-09-15'
      )!;

      const exactMinutes = Math.round(dhuhrPeriod.start.diff(fajrPeriod.start, 'minutes').minutes);

      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'AFTER',
          offsetMinutes: exactMinutes,
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedPrayerSection).toBe('DHUHR');
    });

    it('PR-06: Large offset crosses civil midnight (localDate preserved, civil date differs)', () => {
      const timeline = buildPrayerTimeline('2026-09-16', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'BEFORE',
          offsetMinutes: 360, // 6 hours before Fajr (~05:15) -> ~23:15 previous civil day
        },
      });

      const res = resolvePlacement(def, '2026-09-16', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.localDate).toBe('2026-09-16'); // Seed date preserved
      expect(res.calculatedStartTime?.toISODate()).toBe('2026-09-15'); // Resolved date is Tuesday
      expect(res.planningDayKey).toBe('2026-09-15'); // Tuesday's Fajr day
      expect(res.calculatedPrayerSection).toBe('ISHA');
    });
  });

  // =========================================================================
  // 15.4 PRAYER_WINDOW Tests (PW-01 to PW-08)
  // =========================================================================
  describe('PRAYER_WINDOW (PW-01 to PW-08)', () => {
    it('PW-01: FAJR -> ASR yields eligible tabs [FAJR, DHUHR]', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'FAJR',
          endPrayer: 'ASR',
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.eligiblePrayerSections).toEqual(['FAJR', 'DHUHR']);
      expect(res.calculatedStartTime).toBeNull();
      expect(res.calculatedPrayerSection).toBeNull();
    });

    it('PW-02: DHUHR -> MAGHRIB sets concrete windowStart and windowEnd', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const dhuhrPeriod = timeline.periods.find(
        (p) => p.prayer === 'DHUHR' && p.sourceDate === '2026-09-15'
      )!;
      const maghribPeriod = timeline.periods.find(
        (p) => p.prayer === 'MAGHRIB' && p.sourceDate === '2026-09-15'
      )!;

      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'DHUHR',
          endPrayer: 'MAGHRIB',
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.windowStart?.toMillis()).toBe(dhuhrPeriod.start.toMillis());
      expect(res.windowEnd?.toMillis()).toBe(maghribPeriod.start.toMillis());
      expect(res.eligiblePrayerSections).toEqual(['DHUHR', 'ASR']);
    });

    it('PW-03: sourceDate anchoring uses the correct date instance from 3-day timeline', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'FAJR',
          endPrayer: 'DHUHR',
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      const fajrSept15 = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15'
      )!;
      expect(res.windowStart?.toMillis()).toBe(fajrSept15.start.toMillis());
    });

    it('PW-04: Duplicate label custom day anchors to seed date instance', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'ASR',
          endPrayer: 'ISHA',
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: custom19Config,
      });

      const asrSept15 = timeline.periods.find(
        (p) => p.prayer === 'ASR' && p.sourceDate === '2026-09-15'
      )!;
      expect(res.windowStart?.toMillis()).toBe(asrSept15.start.toMillis());
    });

    it('PW-05: Multiple eligible tabs for FAJR -> ISHA', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'FAJR',
          endPrayer: 'ISHA',
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.eligiblePrayerSections).toEqual(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB']);
    });

    it('PW-06: Wrapping window (MAGHRIB -> FAJR) is rejected in v1', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'MAGHRIB',
          endPrayer: 'FAJR',
        },
      });

      expect(() =>
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('INVALID_PRAYER_WINDOW');
      }
    });

    it('PW-07: Equal start and end prayers (ASR -> ASR) is rejected', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'ASR',
          endPrayer: 'ASR',
        },
      });

      expect(() =>
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('INVALID_PRAYER_WINDOW');
      }
    });

    it('PW-08: calculatedStartTime and calculatedPrayerSection are null for any PrayerWindow', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'DHUHR',
          endPrayer: 'ASR',
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedStartTime).toBeNull();
      expect(res.calculatedPrayerSection).toBeNull();
      expect(res.wallClockResolution).toBeNull();
      expect(res.windowStart).not.toBeNull();
      expect(res.windowEnd).not.toBeNull();
    });

    it('PW-09: Cross-planning-day PrayerWindow under CUSTOM 19:00 is not truncated', () => {
      // CUSTOM 19:00. Dhuhr is ~12:54, Isha is ~20:28 on Sept 15 in NYC.
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'DHUHR',
          endPrayer: 'ISHA',
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: custom19Config,
      });

      // Window starts at Dhuhr (12:54 Tuesday) -> planningDayKey = Tuesday
      expect(res.planningDayKey).toBe('2026-09-15');
      // Window end is Isha (20:28) which falls across the 19:00 boundary, but is not truncated
      const ishaPeriod = timeline.periods.find(
        (p) => p.prayer === 'ISHA' && p.sourceDate === '2026-09-15'
      )!;
      expect(res.windowEnd?.toMillis()).toBe(ishaPeriod.start.toMillis());
      expect(res.eligiblePrayerSections).toEqual(['DHUHR', 'ASR', 'MAGHRIB']);
    });
  });

  // =========================================================================
  // 15.5 ANYTIME_TODAY Tests (AT-01 to AT-04)
  // =========================================================================
  describe('ANYTIME_TODAY (AT-01 to AT-04)', () => {
    it('AT-01: planningDayKey equals occurrenceSeedDate directly', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.localDate).toBe('2026-09-15');
      expect(res.planningDayKey).toBe('2026-09-15');
    });

    it('AT-02: calculatedStartTime is null', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedStartTime).toBeNull();
    });

    it('AT-03: all specific temporal placement fields are null', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedStartTime).toBeNull();
      expect(res.calculatedPrayerSection).toBeNull();
      expect(res.eligiblePrayerSections).toBeNull();
      expect(res.wallClockResolution).toBeNull();
      expect(res.windowStart).toBeNull();
      expect(res.windowEnd).toBeNull();
    });

    it('AT-04: Unaffected by planning-day config (FAJR, MIDNIGHT, CUSTOM all yield seedDate)', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      });

      const resFajr = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });
      const resMidnight = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: midnightConfig,
      });
      const resCustom = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: custom19Config,
      });

      expect(resFajr.planningDayKey).toBe('2026-09-15');
      expect(resMidnight.planningDayKey).toBe('2026-09-15');
      expect(resCustom.planningDayKey).toBe('2026-09-15');
    });
  });

  // =========================================================================
  // 15.6 Planning Day Integration Tests (SK-01 to SK-04)
  // =========================================================================
  describe('Planning Day Integration (SK-01 to SK-04)', () => {
    it('SK-01: FAJR mode — 02:00 Tue maps to Monday planning day', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '02:00' },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.planningDayKey).toBe('2026-09-14');
    });

    it('SK-02: MIDNIGHT mode — 02:00 Tue maps to Tuesday planning day', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '02:00' },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: midnightConfig,
      });

      expect(res.planningDayKey).toBe('2026-09-15');
    });

    it('SK-03: CUSTOM 19:00 — Tuesday 18:00 maps to Tuesday planning day', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '18:00' },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: custom19Config,
      });

      // Tuesday 18:00 is before Tuesday 19:00 boundary -> belongs to Tuesday day
      expect(res.planningDayKey).toBe('2026-09-15');
    });

    it('SK-04: CUSTOM 19:00 — Tuesday 20:00 maps to Wednesday planning day', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '20:00' },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: custom19Config,
      });

      // Tuesday 20:00 is at/after Tuesday 19:00 boundary -> belongs to Wednesday day
      expect(res.planningDayKey).toBe('2026-09-16');
    });
  });

  // =========================================================================
  // 15.7 Recalculation Wrapper Tests (HS-01 to HS-07)
  // =========================================================================
  describe('Recalculation Wrapper (HS-01 to HS-07)', () => {
    it('HS-01: COMPLETED status rejected with TERMINAL_OCCURRENCE', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition();
      const occ = makeTaskOccurrence({ status: 'COMPLETED' });

      expect(() =>
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('TERMINAL_OCCURRENCE');
      }
    });

    it('HS-02: MISSED status rejected with TERMINAL_OCCURRENCE', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition();
      const occ = makeTaskOccurrence({ status: 'MISSED' });

      expect(() =>
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('TERMINAL_OCCURRENCE');
      }
    });

    it('HS-03: CANCELLED status rejected with TERMINAL_OCCURRENCE', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition();
      const occ = makeTaskOccurrence({ status: 'CANCELLED' });

      expect(() =>
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('TERMINAL_OCCURRENCE');
      }
    });

    it('HS-04: PENDING occurrence with matching identity resolves normally', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition();
      const occ = makeTaskOccurrence({ status: 'PENDING' });

      const res = recalculateOccurrencePlacement(occ, def, {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.localDate).toBe('2026-09-15');
      expect(res.calculatedPrayerSection).toBe('ASR');
    });

    it('HS-05: Wrong taskDefinitionId rejected with OCCURRENCE_DEFINITION_MISMATCH', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({ id: 'def-correct' });
      const occ = makeTaskOccurrence({ taskDefinitionId: 'def-different' });

      expect(() =>
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('OCCURRENCE_DEFINITION_MISMATCH');
      }
    });

    it('HS-06: Wrong seriesId rejected with OCCURRENCE_DEFINITION_MISMATCH', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({ seriesId: 'series-correct' });
      const occ = makeTaskOccurrence({ seriesId: 'series-different' });

      expect(() =>
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        recalculateOccurrencePlacement(occ, def, {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('OCCURRENCE_DEFINITION_MISMATCH');
      }
    });

    it('HS-07: Uses occurrence.localDate as the seed date', () => {
      const timeline = buildPrayerTimeline('2026-09-16', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({ startDate: '2026-09-01' });
      const occ = makeTaskOccurrence({ localDate: '2026-09-16' });

      const res = recalculateOccurrencePlacement(occ, def, {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.localDate).toBe('2026-09-16');
    });
  });

  // =========================================================================
  // 15.8 Identity Invariant Tests (ID-01 to ID-02)
  // =========================================================================
  describe('Identity Invariants (ID-01 to ID-02)', () => {
    it('ID-01: localDate remains seed on planning-day crossing', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'BEFORE',
          offsetMinutes: 90,
        },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.localDate).toBe('2026-09-15');
      expect(res.planningDayKey).toBe('2026-09-14');
    });

    it('ID-02: localDate remains seed on civil-date crossing', () => {
      const timeline = buildPrayerTimeline('2026-09-16', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'BEFORE',
          offsetMinutes: 360,
        },
      });

      const res = resolvePlacement(def, '2026-09-16', {
        timeline,
        planningDayConfig: fajrConfig,
      });

      expect(res.localDate).toBe('2026-09-16');
      expect(res.calculatedStartTime?.toISODate()).toBe('2026-09-15');
    });
  });

  // =========================================================================
  // 15.9 Error & Validation Tests (ER-01 to ER-08)
  // =========================================================================
  describe('Error & Validation (ER-01 to ER-08)', () => {
    it('ER-01a: Calculated instant outside timeline throws INSUFFICIENT_TIMELINE', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'BEFORE',
          offsetMinutes: 10000, // Extends far outside the 3-day timeline
        },
      });

      expect(() =>
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('INSUFFICIENT_TIMELINE');
      }
    });

    it('ER-01b: PlanningDay cannot be constructed due to insufficient timeline coverage', () => {
      // Timeline with single period in valid timezone that cannot cover full planning day
      const fakePeriod = {
        prayer: 'FAJR' as const,
        start: DateTime.fromISO('2026-09-15T05:00:00.000', { zone: 'America/New_York' }),
        end: DateTime.fromISO('2026-09-15T06:00:00.000', { zone: 'America/New_York' }),
        fullPeriodStart: DateTime.fromISO('2026-09-15T05:00:00.000', { zone: 'America/New_York' }),
        fullPeriodEnd: DateTime.fromISO('2026-09-15T06:00:00.000', { zone: 'America/New_York' }),
        sourceDate: '2026-09-15',
      };
      const incompleteTimeline: PrayerTimeline = {
        periods: [fakePeriod],
        findPeriod: () => fakePeriod,
      };

      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '05:30' },
      });

      expect(() =>
        resolvePlacement(def, '2026-09-15', {
          timeline: incompleteTimeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-09-15', {
          timeline: incompleteTimeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('INSUFFICIENT_TIMELINE');
      }
    });

    it('ER-02: Missing prayer anchor in timeline throws MISSING_PRAYER_ANCHOR', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'FAJR',
          direction: 'AFTER',
          offsetMinutes: 10,
        },
      });

      // Querying with a seed date not contained in the timeline periods (e.g. 2026-10-15)
      expect(() =>
        resolvePlacement(def, '2026-10-15', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-10-15', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('MISSING_PRAYER_ANCHOR');
      }
    });

    it('ER-03: Unsupported schedule type throws UNSUPPORTED_SCHEDULE_TYPE', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'UNKNOWN_TYPE' as any,
        scheduleData: {} as any,
      });

      expect(() =>
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('UNSUPPORTED_SCHEDULE_TYPE');
      }
    });

    it('ER-04: Invalid PrayerWindow throws INVALID_PRAYER_WINDOW', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'ISHA',
          endPrayer: 'FAJR',
        },
      });

      expect(() =>
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('INVALID_PRAYER_WINDOW');
      }
    });

    it('ER-05: Invalid impossible seed date (2026-02-31) throws INVALID_SEED_DATE', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition();

      expect(() =>
        resolvePlacement(def, '2026-02-31', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-02-31', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('INVALID_SEED_DATE');
      }
    });

    it('ER-06: Non-date seed string throws INVALID_SEED_DATE', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition();

      expect(() =>
        resolvePlacement(def, 'not-a-date', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, 'not-a-date', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        expect((e as SchedulingResolutionError).code).toBe('INVALID_SEED_DATE');
      }
    });

    it('ER-07: Malformed EXACT_TIME schedule data (e.g. invalid HH:mm) throws INVALID_SCHEDULE_DATA', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '25:00' },
      });

      expect(() =>
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-09-15', {
          timeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        const err = e as SchedulingResolutionError;
        expect(err.code).toBe('INVALID_SCHEDULE_DATA');
      }
    });

    it('ER-08: Invalid temporal context / corrupt timeline timezone throws INVALID_TEMPORAL_CONTEXT', () => {
      // Timeline with corrupt zoneName
      const fakePeriod = {
        prayer: 'FAJR' as const,
        start: { zoneName: 'Corrupt/Zone_Unknown' } as any,
        end: { zoneName: 'Corrupt/Zone_Unknown' } as any,
        fullPeriodStart: {} as any,
        fullPeriodEnd: {} as any,
        sourceDate: '2026-09-15',
      };
      const corruptTimeline: PrayerTimeline = {
        periods: [fakePeriod],
        findPeriod: () => fakePeriod,
      };

      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
      });

      expect(() =>
        resolvePlacement(def, '2026-09-15', {
          timeline: corruptTimeline,
          planningDayConfig: fajrConfig,
        })
      ).toThrow(SchedulingResolutionError);

      try {
        resolvePlacement(def, '2026-09-15', {
          timeline: corruptTimeline,
          planningDayConfig: fajrConfig,
        });
      } catch (e) {
        const err = e as SchedulingResolutionError;
        expect(err.code).toBe('INVALID_TEMPORAL_CONTEXT');
      }
    });
  });

  // =========================================================================
  // 15.10 Timezone Safety Test (TZ-01)
  // =========================================================================
  describe('Timezone Safety (TZ-01)', () => {
    it('TZ-01: Timeline timezone is consistently propagated to resolved DateTime', () => {
      const timelineNY = buildPrayerTimeline('2026-09-15', LOCATIONS.newYork, nyParams);
      const def = makeTaskDefinition({
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '15:30' },
      });

      const res = resolvePlacement(def, '2026-09-15', {
        timeline: timelineNY,
        planningDayConfig: fajrConfig,
      });

      expect(res.calculatedStartTime?.zoneName).toBe('America/New_York');
      expect(res.calculatedStartTime?.offset).toBe(-240); // EDT (-4h)
    });
  });

  // =========================================================================
  // Facade Interface Verification
  // =========================================================================
  describe('SchedulingEngine facade object', () => {
    it('implements SchedulingEngineAPI with resolvePlacement and recalculateOccurrencePlacement', () => {
      expect(typeof SchedulingEngine.resolvePlacement).toBe('function');
      expect(typeof SchedulingEngine.recalculateOccurrencePlacement).toBe('function');
    });
  });
});
