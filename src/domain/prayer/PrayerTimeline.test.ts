import { DateTime } from 'luxon';
import { calculate } from './PrayerEngine';
import {
  buildPrayerTimeline,
  findPeriodInTimeline,
  getNextPrayer,
  PrayerTimelineError,
} from './PrayerTimeline';
import type { Coordinates, PrayerCalculationParams } from './types';

describe('PrayerTimeline', () => {
  const coordinates: Coordinates = {
    latitude: 40.7128,
    longitude: -74.006,
  };

  const defaultParams: PrayerCalculationParams = {
    method: 'ISNA',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: {
      fajr: 0,
      sunrise: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    },
    timezone: 'America/New_York',
  };

  const centerDate = '2026-09-15'; // Tuesday

  it('PT-01: timeline contains exactly 15 contiguous periods covering 3 calendar dates', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);

    expect(timeline.periods).toHaveLength(15);
  });

  it('PT-02: no gaps or overlaps between periods (period[i].end === period[i+1].start)', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);

    for (let i = 0; i < timeline.periods.length - 1; i++) {
      const current = timeline.periods[i];
      const next = timeline.periods[i + 1];

      expect(current.end.toMillis()).toBe(next.start.toMillis());
      expect(current.start.toMillis()).toBeLessThan(current.end.toMillis());
    }
  });

  it('PT-03: findPeriod(02:00 Tuesday) returns Monday ISHA with sourceDate=Monday', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);

    // 02:00 AM on Tuesday 2026-09-15
    const queryTime = DateTime.fromISO('2026-09-15T02:00:00', { zone: defaultParams.timezone });
    const period = timeline.findPeriod(queryTime);

    expect(period.prayer).toBe('ISHA');
    expect(period.sourceDate).toBe('2026-09-14'); // Monday!
  });

  it('PT-04: findPeriod(05:20 Tuesday) returns Tuesday FAJR with sourceDate=Tuesday', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);
    const centerTimes = calculate(centerDate, coordinates, defaultParams);

    const period = timeline.findPeriod(centerTimes.fajr);

    expect(period.prayer).toBe('FAJR');
    expect(period.sourceDate).toBe(centerDate);
  });

  it('PT-05: findPeriod respects inclusive-start / exclusive-end semantics across all boundaries', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);
    const centerTimes = calculate(centerDate, coordinates, defaultParams);

    // Boundaries to test: Fajr, Dhuhr, Asr, Maghrib, Isha
    const transitions = [
      { boundary: centerTimes.fajr, expectedBefore: 'ISHA', expectedAt: 'FAJR' },
      { boundary: centerTimes.dhuhr, expectedBefore: 'FAJR', expectedAt: 'DHUHR' },
      { boundary: centerTimes.asr, expectedBefore: 'DHUHR', expectedAt: 'ASR' },
      { boundary: centerTimes.maghrib, expectedBefore: 'ASR', expectedAt: 'MAGHRIB' },
      { boundary: centerTimes.isha, expectedBefore: 'MAGHRIB', expectedAt: 'ISHA' },
    ];

    for (const { boundary, expectedBefore, expectedAt } of transitions) {
      // Exactly at the boundary -> new prayer period
      const atPeriod = timeline.findPeriod(boundary);
      expect(atPeriod.prayer).toBe(expectedAt);

      // 1 millisecond before boundary -> previous prayer period
      const beforePeriod = timeline.findPeriod(boundary.minus({ milliseconds: 1 }));
      expect(beforePeriod.prayer).toBe(expectedBefore);
    }
  });

  it('PT-06: all periods have correct sourceDate provenance', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);

    // First 5 periods: Monday (2026-09-14)
    for (let i = 0; i < 5; i++) {
      expect(timeline.periods[i].sourceDate).toBe('2026-09-14');
    }

    // Middle 5 periods: Tuesday (2026-09-15)
    for (let i = 5; i < 10; i++) {
      expect(timeline.periods[i].sourceDate).toBe('2026-09-15');
    }

    // Final 5 periods: Wednesday (2026-09-16)
    for (let i = 10; i < 15; i++) {
      expect(timeline.periods[i].sourceDate).toBe('2026-09-16');
    }
  });

  it('PT-07: fullPeriodStart and fullPeriodEnd match start and end on unclipped timeline', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);

    for (const period of timeline.periods) {
      expect(period.start.toMillis()).toBe(period.fullPeriodStart.toMillis());
      expect(period.end.toMillis()).toBe(period.fullPeriodEnd.toMillis());
    }
  });

  it('PT-08: DST spring-forward produces valid, contiguous 15-period timeline', () => {
    // 2026-03-08 is NYC spring forward (2:00 AM -> 3:00 AM)
    const timeline = buildPrayerTimeline('2026-03-08', coordinates, defaultParams);

    expect(timeline.periods).toHaveLength(15);

    for (let i = 0; i < timeline.periods.length - 1; i++) {
      const curr = timeline.periods[i];
      const next = timeline.periods[i + 1];
      expect(curr.start.isValid).toBe(true);
      expect(curr.end.isValid).toBe(true);
      expect(curr.end.toMillis()).toBe(next.start.toMillis());
    }
  });

  it('PT-09: DST fall-back produces valid, contiguous 15-period timeline', () => {
    // 2026-11-01 is NYC fall back (2:00 AM -> 1:00 AM)
    const timeline = buildPrayerTimeline('2026-11-01', coordinates, defaultParams);

    expect(timeline.periods).toHaveLength(15);

    for (let i = 0; i < timeline.periods.length - 1; i++) {
      const curr = timeline.periods[i];
      const next = timeline.periods[i + 1];
      expect(curr.start.isValid).toBe(true);
      expect(curr.end.isValid).toBe(true);
      expect(curr.end.toMillis()).toBe(next.start.toMillis());
    }
  });

  it('TX-01: final Isha has exact end matching calculated D+2 Fajr (zero approximation)', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);

    // Center is 2026-09-15. D+2 is 2026-09-17.
    const dayAfterNextTimes = calculate('2026-09-17', coordinates, defaultParams);
    const finalIsha = timeline.periods[14];

    expect(finalIsha.prayer).toBe('ISHA');
    expect(finalIsha.sourceDate).toBe('2026-09-16');
    expect(finalIsha.end.toMillis()).toBe(dayAfterNextTimes.fajr.toMillis());
  });

  it('TX-02: timeline has 15 contiguous periods, strictly monotonic, no gaps or overlaps', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);

    expect(timeline.periods).toHaveLength(15);

    let lastEnd = timeline.periods[0].start.toMillis();
    for (const period of timeline.periods) {
      expect(period.start.toMillis()).toBe(lastEnd);
      expect(period.end.toMillis()).toBeGreaterThan(period.start.toMillis());
      lastEnd = period.end.toMillis();
    }
  });

  it('TX-03: timeline covers 3 full days from D-1 Fajr through D+1 Isha', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);

    const prevTimes = calculate('2026-09-14', coordinates, defaultParams);
    const dayAfterNextTimes = calculate('2026-09-17', coordinates, defaultParams);

    expect(timeline.periods[0].start.toMillis()).toBe(prevTimes.fajr.toMillis());
    expect(timeline.periods[14].end.toMillis()).toBe(dayAfterNextTimes.fajr.toMillis());
  });

  it('throws PrayerTimelineError when time is before timeline start', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);
    const beforeStart = timeline.periods[0].start.minus({ seconds: 1 });

    expect(() => timeline.findPeriod(beforeStart)).toThrow(PrayerTimelineError);
    expect(() => timeline.findPeriod(beforeStart)).toThrow('does not fall within any prayer period');
  });

  it('throws PrayerTimelineError when time is at or after timeline end', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);
    const atEnd = timeline.periods[14].end;

    expect(() => timeline.findPeriod(atEnd)).toThrow(PrayerTimelineError);
    expect(() => timeline.findPeriod(atEnd)).toThrow('does not fall within any prayer period');
  });

  it('throws PrayerTimelineError when queried with an invalid DateTime', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);
    const invalidDt = DateTime.fromISO('invalid-iso-string');

    expect(() => timeline.findPeriod(invalidDt)).toThrow(PrayerTimelineError);
  });

  it('getNextPrayer throws PrayerTimelineError during final period (D+1 Isha)', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);
    const finalPeriod = timeline.periods[14];

    // During D+1 Isha, there is no subsequent period in the 15-period timeline
    expect(() => getNextPrayer(finalPeriod.start.plus({ minutes: 5 }), timeline)).toThrow(
      PrayerTimelineError
    );
    expect(() => getNextPrayer(finalPeriod.start.plus({ minutes: 5 }), timeline)).toThrow(
      'Timeline does not extend far enough'
    );
  });

  it('findPeriodInTimeline standalone helper finds the matching period correctly', () => {
    const timeline = buildPrayerTimeline(centerDate, coordinates, defaultParams);
    const midPeriod = timeline.periods[6]; // D Dhuhr
    const midTime = midPeriod.start.plus({ minutes: 30 });

    const found = findPeriodInTimeline(timeline.periods, midTime);
    expect(found).toBe(midPeriod);
  });
});
