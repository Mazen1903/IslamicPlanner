import { DateTime } from 'luxon';
import { PRAYER_ORDER } from '@/constants/prayers';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import type { PrayerCalculationParams } from '@/domain/prayer/types';
import {
  PlanningDayEngine,
  PlanningDayError,
  buildPlanningDay,
  buildPlanningDayForKey,
  getPeriodsForPrayer,
  resolvePlanningDayBoundaries,
  resolvePlanningDayForTime,
  resolveWallClock,
} from './PlanningDayEngine';
import type { PlanningDayConfig } from './types';
import { PLANNER_TAB_ORDER } from './types';

describe('PlanningDayEngine', () => {
  const LOCATIONS = {
    mecca: { latitude: 21.4225, longitude: 39.8262, tz: 'Asia/Riyadh' },
    newYork: { latitude: 40.7128, longitude: -74.006, tz: 'America/New_York' },
    london: { latitude: 51.5074, longitude: -0.1278, tz: 'Europe/London' },
  };

  const defaultAdjustments = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  };

  const meccaParams: PrayerCalculationParams = {
    method: 'MAKKAH',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: defaultAdjustments,
    timezone: LOCATIONS.mecca.tz,
  };

  const nyParams: PrayerCalculationParams = {
    method: 'ISNA',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: defaultAdjustments,
    timezone: LOCATIONS.newYork.tz,
  };

  const londonParams: PrayerCalculationParams = {
    method: 'MWL',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: defaultAdjustments,
    timezone: LOCATIONS.london.tz,
  };

  const fajrConfig: PlanningDayConfig = { mode: 'FAJR' };
  const midnightConfig: PlanningDayConfig = { mode: 'MIDNIGHT' };
  const custom19Config: PlanningDayConfig = { mode: 'CUSTOM', localTime: '19:00' };

  describe('Fajr-based Day (Default)', () => {
    const centerDate = '2026-09-15'; // Tuesday in Mecca
    let timeline = buildPrayerTimeline(centerDate, LOCATIONS.mecca, meccaParams);

    beforeEach(() => {
      timeline = buildPrayerTimeline(centerDate, LOCATIONS.mecca, meccaParams);
    });

    it('PD-01: midday (1:00 PM) resolves to today planning day', () => {
      const middayTue = DateTime.fromISO('2026-09-15T13:00:00', { zone: LOCATIONS.mecca.tz });
      const pd = resolvePlanningDayForTime(fajrConfig, timeline, middayTue);

      expect(pd.key).toBe('2026-09-15');
      const tueFajr = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15'
      )!.start;
      const wedFajr = timeline.periods.find(
        (p) => p.prayer === 'ISHA' && p.sourceDate === '2026-09-15'
      )!.end;

      expect(pd.start.toMillis()).toBe(tueFajr.toMillis());
      expect(pd.end.toMillis()).toBe(wedFajr.toMillis());
      expect(pd.start.toMillis()).toBeLessThanOrEqual(middayTue.toMillis());
      expect(middayTue.toMillis()).toBeLessThan(pd.end.toMillis());
    });

    it('PD-02: 2:00 AM on Tuesday before Fajr resolves to Monday planning day', () => {
      const twoAmTue = DateTime.fromISO('2026-09-15T02:00:00', { zone: LOCATIONS.mecca.tz });
      const pd = resolvePlanningDayForTime(fajrConfig, timeline, twoAmTue);

      expect(pd.key).toBe('2026-09-14'); // Monday
      const monFajr = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-09-14'
      )!.start;
      const tueFajr = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15'
      )!.start;

      expect(pd.start.toMillis()).toBe(monFajr.toMillis());
      expect(pd.end.toMillis()).toBe(tueFajr.toMillis());
      expect(pd.start.toMillis()).toBeLessThanOrEqual(twoAmTue.toMillis());
      expect(twoAmTue.toMillis()).toBeLessThan(pd.end.toMillis());

      // 2:00 AM is inside Monday's Isha period
      const ishaPeriod = pd.periods.find((p) => p.prayer === 'ISHA')!;
      expect(ishaPeriod.sourceDate).toBe('2026-09-14');
      expect(ishaPeriod.start.toMillis()).toBeLessThanOrEqual(twoAmTue.toMillis());
      expect(twoAmTue.toMillis()).toBeLessThan(ishaPeriod.end.toMillis());
    });

    it('PD-03: 11:00 PM on Tuesday resolves to Tuesday planning day (Isha period)', () => {
      const elevenPmTue = DateTime.fromISO('2026-09-15T23:00:00', { zone: LOCATIONS.mecca.tz });
      const pd = resolvePlanningDayForTime(fajrConfig, timeline, elevenPmTue);

      expect(pd.key).toBe('2026-09-15');
      const ishaPeriod = pd.periods.find((p) => p.prayer === 'ISHA')!;
      expect(ishaPeriod.sourceDate).toBe('2026-09-15');
      expect(ishaPeriod.start.toMillis()).toBeLessThanOrEqual(elevenPmTue.toMillis());
      expect(elevenPmTue.toMillis()).toBeLessThan(ishaPeriod.end.toMillis());
    });

    it('PD-04: day boundary at Fajr: 1ms before Fajr -> prev day; exactly at Fajr -> today', () => {
      const tueFajr = timeline.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-09-15'
      )!.start;

      const oneMsBefore = tueFajr.minus({ milliseconds: 1 });
      const pdBefore = resolvePlanningDayForTime(fajrConfig, timeline, oneMsBefore);
      expect(pdBefore.key).toBe('2026-09-14');
      expect(pdBefore.end.toMillis()).toBe(tueFajr.toMillis());

      const exactlyAtFajr = tueFajr;
      const pdAt = resolvePlanningDayForTime(fajrConfig, timeline, exactlyAtFajr);
      expect(pdAt.key).toBe('2026-09-15');
      expect(pdAt.start.toMillis()).toBe(tueFajr.toMillis());
    });
  });

  describe('Midnight-based Day', () => {
    const centerDate = '2026-09-15';
    const timeline = buildPrayerTimeline(centerDate, LOCATIONS.newYork, nyParams);

    it('PD-05: 12:30 AM resolves to today planning day', () => {
      const twelveThirtyAmTue = DateTime.fromISO('2026-09-15T00:30:00', { zone: LOCATIONS.newYork.tz });
      const pd = resolvePlanningDayForTime(midnightConfig, timeline, twelveThirtyAmTue);

      expect(pd.key).toBe('2026-09-15');
      expect(pd.start.toISO()).toBe(
        DateTime.fromISO('2026-09-15T00:00:00', { zone: LOCATIONS.newYork.tz }).toISO()
      );
      expect(pd.end.toISO()).toBe(
        DateTime.fromISO('2026-09-16T00:00:00', { zone: LOCATIONS.newYork.tz }).toISO()
      );
    });

    it('midnight boundary invariant: 23:59:59.999 -> prev day; 00:00:00.000 -> today', () => {
      // Test the boundary between Tuesday (2026-09-15) and Wednesday (2026-09-16), both covered by timeline
      const wedMidnight = DateTime.fromISO('2026-09-16T00:00:00', { zone: LOCATIONS.newYork.tz });
      const justBefore = wedMidnight.minus({ milliseconds: 1 });

      const pdBefore = resolvePlanningDayForTime(midnightConfig, timeline, justBefore);
      expect(pdBefore.key).toBe('2026-09-15');
      expect(pdBefore.end.toMillis()).toBe(wedMidnight.toMillis());

      const pdAt = resolvePlanningDayForTime(midnightConfig, timeline, wedMidnight);
      expect(pdAt.key).toBe('2026-09-16');
      expect(pdAt.start.toMillis()).toBe(wedMidnight.toMillis());
    });

    it('clips Isha period cleanly across midnight preserving provenance', () => {
      const pd = buildPlanningDayForKey(midnightConfig, timeline, '2026-09-15');

      // The first period in Tuesday's midnight planning day is the post-midnight fragment of Monday's Isha
      const firstPeriod = pd.periods[0];
      expect(firstPeriod.prayer).toBe('ISHA');
      expect(firstPeriod.sourceDate).toBe('2026-09-14');
      expect(firstPeriod.start.toISO()).toBe(
        DateTime.fromISO('2026-09-15T00:00:00', { zone: LOCATIONS.newYork.tz }).toISO()
      );
      // Tuesday's Fajr begins when this Isha fragment ends
      const tueFajr = pd.periods[1];
      expect(tueFajr.prayer).toBe('FAJR');
      expect(firstPeriod.end.toMillis()).toBe(tueFajr.start.toMillis());

      // Original unclipped boundaries are preserved
      expect(firstPeriod.fullPeriodStart.toMillis()).toBeLessThan(firstPeriod.start.toMillis());
    });
  });

  describe('Custom HH:mm Planning Day (19:00)', () => {
    const centerDate = '2026-09-15'; // Tuesday
    const timeline = buildPrayerTimeline(centerDate, LOCATIONS.mecca, meccaParams);

    it('PD-06: Tuesday 18:59:59.999 belongs to Tuesday planning day (Monday 19:00 -> Tuesday 19:00)', () => {
      const time = DateTime.fromISO('2026-09-15T18:59:59.999', { zone: LOCATIONS.mecca.tz });
      const pd = resolvePlanningDayForTime(custom19Config, timeline, time);

      expect(pd.key).toBe('2026-09-15'); // Tuesday key
      expect(pd.start.toISO()).toBe(
        DateTime.fromISO('2026-09-14T19:00:00', { zone: LOCATIONS.mecca.tz }).toISO()
      );
      expect(pd.end.toISO()).toBe(
        DateTime.fromISO('2026-09-15T19:00:00', { zone: LOCATIONS.mecca.tz }).toISO()
      );
    });

    it('PD-07: Tuesday 19:00:00.000 begins Wednesday planning day (Tuesday 19:00 -> Wednesday 19:00)', () => {
      const time = DateTime.fromISO('2026-09-15T19:00:00.000', { zone: LOCATIONS.mecca.tz });
      const pd = resolvePlanningDayForTime(custom19Config, timeline, time);

      expect(pd.key).toBe('2026-09-16'); // Wednesday key
      expect(pd.start.toISO()).toBe(
        DateTime.fromISO('2026-09-15T19:00:00', { zone: LOCATIONS.mecca.tz }).toISO()
      );
      expect(pd.end.toISO()).toBe(
        DateTime.fromISO('2026-09-16T19:00:00', { zone: LOCATIONS.mecca.tz }).toISO()
      );
    });

    it('PD-07b: Tuesday 20:00 belongs to Wednesday planning day', () => {
      const time = DateTime.fromISO('2026-09-15T20:00:00', { zone: LOCATIONS.mecca.tz });
      const pd = resolvePlanningDayForTime(custom19Config, timeline, time);

      expect(pd.key).toBe('2026-09-16'); // Wednesday key
      expect(pd.start.toMillis()).toBeLessThanOrEqual(time.toMillis());
      expect(time.toMillis()).toBeLessThan(pd.end.toMillis());
    });

    it('PD-08: custom start does NOT reorder prayers (tabs always Fajr->Isha)', () => {
      const pd = buildPlanningDayForKey(custom19Config, timeline, '2026-09-15');

      // Internal periods are chronological
      for (let i = 0; i < pd.periods.length - 1; i++) {
        expect(pd.periods[i].start.toMillis()).toBeLessThan(pd.periods[i + 1].start.toMillis());
        expect(pd.periods[i].end.toMillis()).toBe(pd.periods[i + 1].start.toMillis());
      }

      // Canonical prayer order is invariant
      expect(PLANNER_TAB_ORDER).toEqual(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']);
      expect(PRAYER_ORDER).toEqual(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']);
    });

    it('PD-09: planningDayKey is always a valid "YYYY-MM-DD" string across all modes', () => {
      const time = DateTime.fromISO('2026-09-15T12:00:00', { zone: LOCATIONS.mecca.tz });
      const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

      const pdFajr = resolvePlanningDayForTime(fajrConfig, timeline, time);
      const pdMidnight = resolvePlanningDayForTime(midnightConfig, timeline, time);
      const pdCustom = resolvePlanningDayForTime(custom19Config, timeline, time);

      expect(isoDatePattern.test(pdFajr.key)).toBe(true);
      expect(isoDatePattern.test(pdMidnight.key)).toBe(true);
      expect(isoDatePattern.test(pdCustom.key)).toBe(true);
    });
  });

  describe('DST & Wall-Clock Resolution (SCHEDULING_ENGINE.md §2.4)', () => {
    it('PD-10: DST spring-forward shifts nonexistent local time to first valid instant after gap', () => {
      // March 8, 2026 in America/New_York: clocks jump from 01:59:59.999 EST (-05:00) to 03:00:00.000 EDT (-04:00)
      const res200 = resolveWallClock('2026-03-08', '02:00', 'America/New_York');
      expect(res200.resolution).toBe('SPRING_FORWARD_SHIFTED');
      expect(res200.resolvedTime.toISO()).toBe('2026-03-08T03:00:00.000-04:00');
      expect(res200.resolvedTime.offset).toBe(-240); // EDT (-4h)

      const res230 = resolveWallClock('2026-03-08', '02:30', 'America/New_York');
      expect(res230.resolution).toBe('SPRING_FORWARD_SHIFTED');
      expect(res230.resolvedTime.toISO()).toBe('2026-03-08T03:00:00.000-04:00');
      expect(res230.resolvedTime.offset).toBe(-240);
    });

    it('handles 30-minute DST jump gracefully (Lord Howe Island, Australia)', () => {
      // In Australia/Lord_Howe on October 4, 2026, clocks jump 30 mins from 02:00 (+10:30) to 02:30 (+11:00)
      const res = resolveWallClock('2026-10-04', '02:15', 'Australia/Lord_Howe');
      expect(res.resolution).toBe('SPRING_FORWARD_SHIFTED');
      expect(res.resolvedTime.toISO()).toBe('2026-10-04T02:30:00.000+11:00');
      expect(res.resolvedTime.offset).toBe(660); // +11h
    });

    it('PD-10b: DST fall-back overlap deterministically chooses earlier absolute occurrence', () => {
      // Nov 1, 2026 in America/New_York: 01:30 occurs twice (EDT -04:00 and EST -05:00)
      const res = resolveWallClock('2026-11-01', '01:30', 'America/New_York');
      expect(res.resolution).toBe('FALL_BACK_FIRST');
      expect(res.resolvedTime.toISO()).toBe('2026-11-01T01:30:00.000-04:00');
      expect(res.resolvedTime.offset).toBe(-240); // -4h (earlier EDT offset), not -300 (-5h)
      expect(res.resolvedTime.toMillis()).toBe(1793511000000); // exact timestamp of first occurrence (05:30Z)
    });

    it('resolves normal wall-clock times as NORMAL', () => {
      const res = resolveWallClock('2026-09-15', '19:00', 'America/New_York');
      expect(res.resolution).toBe('NORMAL');
      expect(res.resolvedTime.toISO()).toBe('2026-09-15T19:00:00.000-04:00');
      expect(res.resolvedTime.offset).toBe(-240);
    });

    it('handles planning day building across DST spring-forward transition with custom start', () => {
      const custom2am: PlanningDayConfig = { mode: 'CUSTOM', localTime: '02:00' };
      // Center date is March 8, 2026 (spring forward day in NY). Timeline covers March 7 Fajr to March 10 Fajr.
      const timelineNY = buildPrayerTimeline('2026-03-08', LOCATIONS.newYork, nyParams);

      // Boundaries for 2026-03-08: March 7 at 02:00 -> March 8 at 03:00 (since 02:00 was in gap)
      const boundaries = resolvePlanningDayBoundaries(custom2am, timelineNY, '2026-03-08');
      expect(boundaries.key).toBe('2026-03-08');
      expect(boundaries.start.toISO()).toBe('2026-03-07T02:00:00.000-05:00');
      expect(boundaries.end.toISO()).toBe('2026-03-08T03:00:00.000-04:00');

      // The planning day for key '2026-03-09' starts on March 8 @ 02:00 (which shifts to 03:00 EDT) and ends March 9 @ 02:00 EDT.
      // Both boundaries are within timelineNY [March 7 05:06 -> March 10 Fajr]
      const pd = buildPlanningDayForKey(custom2am, timelineNY, '2026-03-09');
      expect(pd.key).toBe('2026-03-09');
      expect(pd.start.toISO()).toBe('2026-03-08T03:00:00.000-04:00');
      expect(pd.end.toISO()).toBe('2026-03-09T02:00:00.000-04:00');
      expect(pd.periods.length).toBeGreaterThan(0);
      expect(pd.periods[0].start.toMillis()).toBe(pd.start.toMillis());
      expect(pd.periods[pd.periods.length - 1].end.toMillis()).toBe(pd.end.toMillis());
    });
  });

  describe('Seasonal Clipping & Duplicate Prayer Periods', () => {
    it('PD-11: Custom 19:00 summer in London does NOT clip Maghrib at start (Maghrib starts after 19:00)', () => {
      // Summer solstice in London: Maghrib is well after 19:00 (~21:20)
      const summerDate = '2026-06-21';
      const londonSummerTimeline = buildPrayerTimeline(summerDate, LOCATIONS.london, londonParams);
      const pd = buildPlanningDayForKey(custom19Config, londonSummerTimeline, summerDate);

      // Previous day (June 20) Maghrib starts after 19:00, so at 19:00 on June 20 it is ASR
      const firstPeriod = pd.periods[0];
      expect(firstPeriod.prayer).toBe('ASR');
      expect(firstPeriod.sourceDate).toBe('2026-06-20');
      expect(firstPeriod.start.toISO()).toBe(
        DateTime.fromISO('2026-06-20T19:00:00', { zone: LOCATIONS.london.tz }).toISO()
      );

      // Maghrib on June 20 appears unclipped at its start because it starts after 19:00
      const prevMaghrib = pd.periods.find(
        (p) => p.prayer === 'MAGHRIB' && p.sourceDate === '2026-06-20'
      )!;
      expect(prevMaghrib.start.toMillis()).toBe(prevMaghrib.fullPeriodStart.toMillis());
    });

    it('PD-12: Custom 19:00 winter in London starts in Isha (no Maghrib from previous day in planning day)', () => {
      // Winter solstice in London: Maghrib is ~15:53, Isha is ~18:00 (both before 19:00)
      const winterDate = '2026-12-21';
      const londonWinterTimeline = buildPrayerTimeline(winterDate, LOCATIONS.london, londonParams);
      const pd = buildPlanningDayForKey(custom19Config, londonWinterTimeline, winterDate);

      // At 19:00 on Dec 20, Isha is already active. First period is clipped Isha from Dec 20
      const firstPeriod = pd.periods[0];
      expect(firstPeriod.prayer).toBe('ISHA');
      expect(firstPeriod.sourceDate).toBe('2026-12-20');
      expect(firstPeriod.start.toISO()).toBe(
        DateTime.fromISO('2026-12-20T19:00:00', { zone: LOCATIONS.london.tz }).toISO()
      );

      // Dec 20 Maghrib ended before 19:00, so it does NOT appear in the planning day
      const prevMaghrib = pd.periods.find(
        (p) => p.prayer === 'MAGHRIB' && p.sourceDate === '2026-12-20'
      );
      expect(prevMaghrib).toBeUndefined();

      // Only Dec 21 Maghrib appears
      const maghribs = getPeriodsForPrayer(pd, 'MAGHRIB');
      expect(maghribs).toHaveLength(1);
      expect(maghribs[0].sourceDate).toBe('2026-12-21');
    });

    it('PD-13: Custom 19:00 summer long days maintains strictly chronological contiguous periods', () => {
      const summerDate = '2026-06-21';
      const londonSummerTimeline = buildPrayerTimeline(summerDate, LOCATIONS.london, londonParams);
      const pd = buildPlanningDayForKey(custom19Config, londonSummerTimeline, summerDate);

      for (let i = 0; i < pd.periods.length - 1; i++) {
        expect(pd.periods[i].start.toMillis()).toBeLessThan(pd.periods[i + 1].start.toMillis());
        expect(pd.periods[i].end.toMillis()).toBe(pd.periods[i + 1].start.toMillis());
      }
      expect(pd.periods[0].start.toMillis()).toBe(pd.start.toMillis());
      expect(pd.periods[pd.periods.length - 1].end.toMillis()).toBe(pd.end.toMillis());
    });

    it('PD-14: multi-instance tab: Maghrib appears twice with custom 19:00 in Mecca fixture', () => {
      // In Mecca on 2026-09-15: Maghrib is ~18:24 and Isha is ~19:54.
      // Custom 19:00 cuts through Maghrib on Monday (Sep 14) and Tuesday (Sep 15).
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.mecca, meccaParams);
      const pd = buildPlanningDayForKey(custom19Config, timeline, '2026-09-15');

      const maghribs = getPeriodsForPrayer(pd, 'MAGHRIB');
      expect(maghribs).toHaveLength(2);

      // Fragment 1: Monday's Maghrib clipped at planning day start (Monday 19:00 -> Monday Isha)
      const frag1 = maghribs[0];
      expect(frag1.sourceDate).toBe('2026-09-14');
      expect(frag1.start.toISO()).toBe(
        DateTime.fromISO('2026-09-14T19:00:00', { zone: LOCATIONS.mecca.tz }).toISO()
      );
      // Fragment 1 ends at Monday's unclipped Isha start
      const monIsha = timeline.periods.find(
        (p) => p.prayer === 'ISHA' && p.sourceDate === '2026-09-14'
      )!;
      expect(frag1.end.toMillis()).toBe(monIsha.start.toMillis());

      // Fragment 2: Tuesday's Maghrib clipped at planning day end (Tuesday Maghrib -> Tuesday 19:00)
      const frag2 = maghribs[1];
      expect(frag2.sourceDate).toBe('2026-09-15');
      const tueMaghrib = timeline.periods.find(
        (p) => p.prayer === 'MAGHRIB' && p.sourceDate === '2026-09-15'
      )!;
      expect(frag2.start.toMillis()).toBe(tueMaghrib.start.toMillis());
      expect(frag2.end.toISO()).toBe(
        DateTime.fromISO('2026-09-15T19:00:00', { zone: LOCATIONS.mecca.tz }).toISO()
      );

      // Prove that no merge, deduplication, or dropping occurred
      expect(frag1.sourceDate).not.toBe(frag2.sourceDate);
      expect(frag1.start.toMillis()).not.toBe(frag2.start.toMillis());
    });

    it('PD-15: clipped period preserves fullPeriodStart, fullPeriodEnd, and sourceDate', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.mecca, meccaParams);
      const pd = buildPlanningDayForKey(custom19Config, timeline, '2026-09-15');

      const maghribs = getPeriodsForPrayer(pd, 'MAGHRIB');
      const frag1 = maghribs[0];
      const origMonMaghrib = timeline.periods.find(
        (p) => p.prayer === 'MAGHRIB' && p.sourceDate === '2026-09-14'
      )!;

      // start is clipped to 19:00
      expect(frag1.start.toISO()).toBe(
        DateTime.fromISO('2026-09-14T19:00:00', { zone: LOCATIONS.mecca.tz }).toISO()
      );
      // Original boundaries are preserved
      expect(frag1.fullPeriodStart.toMillis()).toBe(origMonMaghrib.start.toMillis());
      expect(frag1.fullPeriodEnd.toMillis()).toBe(origMonMaghrib.end.toMillis());
      expect(frag1.sourceDate).toBe('2026-09-14');
      expect(frag1.prayer).toBe('MAGHRIB');
    });
  });

  describe('Period Invariants & Safety Constraints', () => {
    const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.mecca, meccaParams);

    it('does NOT mutate the input PrayerTimeline (immutability check)', () => {
      const origSnapshot = timeline.periods.map((p) => ({
        prayer: p.prayer,
        startMs: p.start.toMillis(),
        endMs: p.end.toMillis(),
        fullStartMs: p.fullPeriodStart.toMillis(),
        fullEndMs: p.fullPeriodEnd.toMillis(),
        sourceDate: p.sourceDate,
      }));

      // Construct planning days in all 3 modes
      buildPlanningDay(fajrConfig, timeline, '2026-09-15');
      buildPlanningDay(midnightConfig, timeline, '2026-09-15');
      buildPlanningDay(custom19Config, timeline, '2026-09-15');

      expect(timeline.periods).toHaveLength(origSnapshot.length);
      for (let i = 0; i < timeline.periods.length; i++) {
        const p = timeline.periods[i];
        const s = origSnapshot[i];
        expect(p.prayer).toBe(s.prayer);
        expect(p.start.toMillis()).toBe(s.startMs);
        expect(p.end.toMillis()).toBe(s.endMs);
        expect(p.fullPeriodStart.toMillis()).toBe(s.fullStartMs);
        expect(p.fullPeriodEnd.toMillis()).toBe(s.fullEndMs);
        expect(p.sourceDate).toBe(s.sourceDate);
      }
    });

    it('maintains strict boundary invariant: start <= time < end', () => {
      const pd = buildPlanningDayForKey(fajrConfig, timeline, '2026-09-15');

      // Test exactly at start
      const pdStart = resolvePlanningDayForTime(fajrConfig, timeline, pd.start);
      expect(pdStart.key).toBe(pd.key);

      // Test 1ms before end
      const justBeforeEnd = pd.end.minus({ milliseconds: 1 });
      const pdBeforeEnd = resolvePlanningDayForTime(fajrConfig, timeline, justBeforeEnd);
      expect(pdBeforeEnd.key).toBe(pd.key);

      // Test exactly at end: belongs to next planning day
      const pdAtEnd = resolvePlanningDayForTime(fajrConfig, timeline, pd.end);
      expect(pdAtEnd.key).toBe('2026-09-16');
      expect(pdAtEnd.start.toMillis()).toBe(pd.end.toMillis());
    });

    it('normalizes reference times across display timezones to effective planning timezone', () => {
      // The exact same instant expressed in UTC, New York, or Mecca
      const instantUtc = DateTime.fromISO('2026-09-15T10:00:00Z');
      const instantNy = instantUtc.setZone('America/New_York');
      const instantMecca = instantUtc.setZone('Asia/Riyadh');

      // In Mecca (UTC+3), 10:00 UTC is 13:00 (1:00 PM) Tuesday
      const pd1 = resolvePlanningDayForTime(fajrConfig, timeline, instantUtc);
      const pd2 = resolvePlanningDayForTime(fajrConfig, timeline, instantNy);
      const pd3 = resolvePlanningDayForTime(fajrConfig, timeline, instantMecca);

      expect(pd1.key).toBe('2026-09-15');
      expect(pd2.key).toBe('2026-09-15');
      expect(pd3.key).toBe('2026-09-15');
      expect(pd1.start.toMillis()).toBe(pd2.start.toMillis());
      expect(pd2.start.toMillis()).toBe(pd3.start.toMillis());
    });

    it('requires full timeline coverage and throws PlanningDayError if insufficient', () => {
      // A truncated timeline that only covers 1 day (e.g. 2026-09-15 only)
      const truncatedTimeline = {
        periods: timeline.periods.filter((p) => p.sourceDate === '2026-09-15'),
        findPeriod: timeline.findPeriod,
      };

      // Custom 19:00 for key '2026-09-15' requires Monday 19:00 to Tuesday 19:00
      // But truncatedTimeline only starts at Tuesday Fajr!
      expect(() => {
        buildPlanningDayForKey(custom19Config, truncatedTimeline, '2026-09-15');
      }).toThrow(PlanningDayError);

      expect(() => {
        buildPlanningDayForKey(custom19Config, truncatedTimeline, '2026-09-15');
      }).toThrow(/does not cover planning day start/);
    });

    it('throws PlanningDayError for invalid time format in custom config', () => {
      const invalidConfig: PlanningDayConfig = { mode: 'CUSTOM', localTime: '25:99' };
      expect(() => {
        buildPlanningDayForKey(invalidConfig, timeline, '2026-09-15');
      }).toThrow(PlanningDayError);
      expect(() => {
        buildPlanningDayForKey(invalidConfig, timeline, '2026-09-15');
      }).toThrow(/Expected "HH:mm"/);
    });

    it('throws PlanningDayError for invalid key format', () => {
      expect(() => {
        buildPlanningDayForKey(fajrConfig, timeline, '15-09-2026');
      }).toThrow(PlanningDayError);
    });
  });

  describe('Calendar Date Transitions & Leap Year Edge Cases', () => {
    it('handles month-end boundary: Jan 31 -> Feb 1', () => {
      const timelineMonthEnd = buildPrayerTimeline('2026-01-31', LOCATIONS.mecca, meccaParams);
      const pd = buildPlanningDayForKey(fajrConfig, timelineMonthEnd, '2026-01-31');

      expect(pd.key).toBe('2026-01-31');
      // Ends at Feb 1 Fajr
      const feb1Fajr = timelineMonthEnd.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2026-02-01'
      )!.start;
      expect(pd.end.toMillis()).toBe(feb1Fajr.toMillis());
    });

    it('handles leap year boundary: Feb 28 -> Feb 29 -> Mar 1 in 2028', () => {
      const timelineLeap = buildPrayerTimeline('2028-02-28', LOCATIONS.mecca, meccaParams);

      const pdFeb28 = buildPlanningDayForKey(fajrConfig, timelineLeap, '2028-02-28');
      expect(pdFeb28.key).toBe('2028-02-28');
      // Ends at Feb 29 Fajr
      const feb29Fajr = timelineLeap.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2028-02-29'
      )!.start;
      expect(pdFeb28.end.toMillis()).toBe(feb29Fajr.toMillis());

      // Next day is Feb 29
      const pdFeb29 = buildPlanningDayForKey(fajrConfig, timelineLeap, '2028-02-29');
      expect(pdFeb29.key).toBe('2028-02-29');
      // Ends at March 1 Fajr (which is the exact end of Feb 29 Isha)
      const feb29Isha = timelineLeap.periods.find(
        (p) => p.prayer === 'ISHA' && p.sourceDate === '2028-02-29'
      )!;
      expect(pdFeb29.end.toMillis()).toBe(feb29Isha.end.toMillis());
      expect(pdFeb29.end.toISODate()).toBe('2028-03-01');
    });

    it('handles year-end boundary: Dec 31 -> Jan 1', () => {
      const timelineYearEnd = buildPrayerTimeline('2026-12-31', LOCATIONS.mecca, meccaParams);
      const pd = buildPlanningDayForKey(fajrConfig, timelineYearEnd, '2026-12-31');

      expect(pd.key).toBe('2026-12-31');
      const jan1Fajr = timelineYearEnd.periods.find(
        (p) => p.prayer === 'FAJR' && p.sourceDate === '2027-01-01'
      )!.start;
      expect(pd.end.toMillis()).toBe(jan1Fajr.toMillis());
    });
  });

  describe('PlanningDayEngine Facade API', () => {
    it('PlanningDayEngine facade object exposes all API methods correctly', () => {
      const timeline = buildPrayerTimeline('2026-09-15', LOCATIONS.mecca, meccaParams);

      expect(typeof PlanningDayEngine.resolvePlanningDayBoundaries).toBe('function');
      expect(typeof PlanningDayEngine.buildPlanningDay).toBe('function');
      expect(typeof PlanningDayEngine.resolvePlanningDayForTime).toBe('function');
      expect(typeof PlanningDayEngine.buildPlanningDayForKey).toBe('function');
      expect(typeof PlanningDayEngine.getPeriodsForPrayer).toBe('function');

      const pd = PlanningDayEngine.buildPlanningDay(fajrConfig, timeline, '2026-09-15');
      expect(pd.key).toBe('2026-09-15');
      const maghribs = PlanningDayEngine.getPeriodsForPrayer(pd, 'MAGHRIB');
      expect(maghribs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
