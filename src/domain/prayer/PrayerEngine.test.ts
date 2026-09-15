import { DateTime } from 'luxon';
import {
  calculate,
  calculateRange,
  getCurrentPrayer,
  getNextPrayer,
  recommendCalculationMethod,
  PrayerEngine,
} from './PrayerEngine';
import { buildPrayerTimeline } from './PrayerTimeline';
import type { Coordinates, PrayerCalculationParams } from './types';

describe('PrayerEngine', () => {
  // Test location fixtures matching TEST_PLAN.md §7.1
  const LOCATIONS = {
    mecca: { lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' },
    newYork: { lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
    london: { lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
    tromso: { lat: 69.6496, lng: 18.956, tz: 'Europe/Oslo' },
  };

  const defaultAdjustments = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  };

  /**
   * Helper to verify a Luxon DateTime against an expected "HH:mm" time string within a tolerance.
   */
  function expectTimeWithinTolerance(
    actual: DateTime,
    expectedHHmm: string,
    toleranceMinutes = 1
  ): void {
    const [expHours, expMinutes] = expectedHHmm.split(':').map(Number);
    const expectedTime = actual.set({
      hour: expHours,
      minute: expMinutes,
      second: 0,
      millisecond: 0,
    });
    const diffMinutes = Math.abs(actual.diff(expectedTime, 'minutes').minutes);
    expect(diffMinutes).toBeLessThanOrEqual(toleranceMinutes);
  }

  it('PE-01: matches published timetable for Mecca (Umm Al-Qura) within ±1 min', () => {
    // Reference date: 2026-09-15 in Makkah
    // Official Umm al-Qura standard times for Mecca:
    // Fajr: 04:51, Sunrise: 06:08, Dhuhr: 12:16, Asr: 15:41, Maghrib: 18:24, Isha: 19:54 (90m interval)
    const params: PrayerCalculationParams = {
      method: 'MAKKAH',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.mecca.tz,
    };

    const result = calculate(
      '2026-09-15',
      { latitude: LOCATIONS.mecca.lat, longitude: LOCATIONS.mecca.lng },
      params
    );

    expect(result.date).toBe('2026-09-15');
    expect(result.timezone).toBe(LOCATIONS.mecca.tz);
    expectTimeWithinTolerance(result.fajr, '04:51');
    expectTimeWithinTolerance(result.sunrise, '06:08');
    expectTimeWithinTolerance(result.dhuhr, '12:16');
    expectTimeWithinTolerance(result.asr, '15:41');
    expectTimeWithinTolerance(result.maghrib, '18:24');
    expectTimeWithinTolerance(result.isha, '19:54');
  });

  it('PE-02: matches published timetable for New York (ISNA) within ±1 min', () => {
    // Reference date: 2026-09-15 in New York
    // Standard ISNA times for NYC (40.7128, -74.0060, America/New_York):
    // Fajr: 05:20, Sunrise: 06:37, Dhuhr: 12:52, Asr: 16:21, Maghrib: 19:05, Isha: 20:21
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    const result = calculate(
      '2026-09-15',
      { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng },
      params
    );

    expect(result.date).toBe('2026-09-15');
    expect(result.timezone).toBe(LOCATIONS.newYork.tz);
    expectTimeWithinTolerance(result.fajr, '05:20');
    expectTimeWithinTolerance(result.sunrise, '06:37');
    expectTimeWithinTolerance(result.dhuhr, '12:52');
    expectTimeWithinTolerance(result.asr, '16:21');
    expectTimeWithinTolerance(result.maghrib, '19:05');
    expectTimeWithinTolerance(result.isha, '20:21');
  });

  it('PE-03: calculates valid, ordered times for London on summer solstice (51°N)', () => {
    const params: PrayerCalculationParams = {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.london.tz,
    };

    const result = calculate(
      '2026-06-21',
      { latitude: LOCATIONS.london.lat, longitude: LOCATIONS.london.lng },
      params
    );

    expect(result.fajr.isValid).toBe(true);
    expect(result.sunrise.isValid).toBe(true);
    expect(result.dhuhr.isValid).toBe(true);
    expect(result.asr.isValid).toBe(true);
    expect(result.maghrib.isValid).toBe(true);
    expect(result.isha.isValid).toBe(true);

    // Verify chronological progression
    expect(result.fajr.toMillis()).toBeLessThan(result.sunrise.toMillis());
    expect(result.sunrise.toMillis()).toBeLessThan(result.dhuhr.toMillis());
    expect(result.dhuhr.toMillis()).toBeLessThan(result.asr.toMillis());
    expect(result.asr.toMillis()).toBeLessThan(result.maghrib.toMillis());
    expect(result.maghrib.toMillis()).toBeLessThan(result.isha.toMillis());
  });

  it('PE-04: falls back gracefully without crash in polar regions (Tromsø, 69.6°N on Jun 21)', () => {
    const params: PrayerCalculationParams = {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.tromso.tz,
    };

    const result = calculate(
      '2026-06-21',
      { latitude: LOCATIONS.tromso.lat, longitude: LOCATIONS.tromso.lng },
      params
    );

    expect(result.fajr.isValid).toBe(true);
    expect(result.sunrise.isValid).toBe(true);
    expect(result.dhuhr.isValid).toBe(true);
    expect(result.asr.isValid).toBe(true);
    expect(result.maghrib.isValid).toBe(true);
    expect(result.isha.isValid).toBe(true);
  });

  it('falls back to AqrabYaum when polar region produces Invalid Date with UNRESOLVED resolution', () => {
    const coords: Coordinates = { latitude: 75.0, longitude: 15.0 };
    const params: PrayerCalculationParams = {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'UNRESOLVED',
      adjustments: defaultAdjustments,
      timezone: 'Europe/Oslo',
    };

    const result = calculate('2026-06-21', coords, params);
    expect(result.fajr.isValid).toBe(true);
    expect(result.isha.isValid).toBe(true);
  });

  it('PE-05: Hanafi Asr is strictly later than Shafi Asr', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const shafiParams: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };
    const hanafiParams: PrayerCalculationParams = {
      ...shafiParams,
      asrMethod: 'HANAFI',
    };

    const shafiResult = calculate('2026-09-15', coords, shafiParams);
    const hanafiResult = calculate('2026-09-15', coords, hanafiParams);

    expect(hanafiResult.asr.toMillis()).toBeGreaterThan(shafiResult.asr.toMillis());
    // Difference between shadow factor 1 and 2 in NYC is ~54 minutes
    const diffMinutes = hanafiResult.asr.diff(shafiResult.asr, 'minutes').minutes;
    expect(diffMinutes).toBeGreaterThanOrEqual(40);
  });

  it('PE-06: manual minute adjustments apply exactly to prayer times', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const baseParams: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    const baseResult = calculate('2026-09-15', coords, baseParams);

    const adjustedParams: PrayerCalculationParams = {
      ...baseParams,
      adjustments: {
        ...defaultAdjustments,
        fajr: 5,
        dhuhr: -10,
        isha: 15,
      },
    };

    const adjustedResult = calculate('2026-09-15', coords, adjustedParams);

    expect(adjustedResult.fajr.diff(baseResult.fajr, 'minutes').minutes).toBe(5);
    expect(adjustedResult.dhuhr.diff(baseResult.dhuhr, 'minutes').minutes).toBe(-10);
    expect(adjustedResult.isha.diff(baseResult.isha, 'minutes').minutes).toBe(15);
    // Unadjusted prayer remains identical
    expect(adjustedResult.asr.toMillis()).toBe(baseResult.asr.toMillis());
  });

  it('PE-07: getCurrentPrayer returns FAJR at exact Fajr boundary', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    const timeline = buildPrayerTimeline('2026-09-15', coords, params);
    const currTimes = calculate('2026-09-15', coords, params);

    expect(getCurrentPrayer(currTimes.fajr, timeline)).toBe('FAJR');
  });

  it('PE-08: getCurrentPrayer before Fajr resolves to previous day ISHA', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    const timeline = buildPrayerTimeline('2026-09-15', coords, params);
    // 03:00 AM on Tuesday 2026-09-15 (Fajr is at 05:20 AM)
    const earlyMorningTime = DateTime.fromISO('2026-09-15T03:00:00', { zone: LOCATIONS.newYork.tz });

    expect(getCurrentPrayer(earlyMorningTime, timeline)).toBe('ISHA');
    const period = timeline.findPeriod(earlyMorningTime);
    expect(period.sourceDate).toBe('2026-09-14'); // Sourced from Monday!
  });

  it('PE-09: getCurrentPrayer returns the correct prayer at every boundary transition', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    const timeline = buildPrayerTimeline('2026-09-15', coords, params);
    const times = calculate('2026-09-15', coords, params);

    expect(getCurrentPrayer(times.fajr, timeline)).toBe('FAJR');
    expect(getCurrentPrayer(times.dhuhr, timeline)).toBe('DHUHR');
    expect(getCurrentPrayer(times.asr, timeline)).toBe('ASR');
    expect(getCurrentPrayer(times.maghrib, timeline)).toBe('MAGHRIB');
    expect(getCurrentPrayer(times.isha, timeline)).toBe('ISHA');
  });

  it('PE-10: getNextPrayer returns correct next prayer and start time across transitions', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    const timeline = buildPrayerTimeline('2026-09-15', coords, params);
    const times = calculate('2026-09-15', coords, params);
    const nextTimes = calculate('2026-09-16', coords, params);

    // During Fajr -> next is Dhuhr
    const nextFromFajr = getNextPrayer(times.fajr.plus({ minutes: 10 }), timeline);
    expect(nextFromFajr.prayer).toBe('DHUHR');
    expect(nextFromFajr.time.toMillis()).toBe(times.dhuhr.toMillis());

    // During Dhuhr -> next is Asr
    const nextFromDhuhr = getNextPrayer(times.dhuhr.plus({ minutes: 10 }), timeline);
    expect(nextFromDhuhr.prayer).toBe('ASR');
    expect(nextFromDhuhr.time.toMillis()).toBe(times.asr.toMillis());

    // During Asr -> next is Maghrib
    const nextFromAsr = getNextPrayer(times.asr.plus({ minutes: 10 }), timeline);
    expect(nextFromAsr.prayer).toBe('MAGHRIB');
    expect(nextFromAsr.time.toMillis()).toBe(times.maghrib.toMillis());

    // During Maghrib -> next is Isha
    const nextFromMaghrib = getNextPrayer(times.maghrib.plus({ minutes: 10 }), timeline);
    expect(nextFromMaghrib.prayer).toBe('ISHA');
    expect(nextFromMaghrib.time.toMillis()).toBe(times.isha.toMillis());

    // During Isha -> next is next day's Fajr
    const nextFromIsha = getNextPrayer(times.isha.plus({ minutes: 10 }), timeline);
    expect(nextFromIsha.prayer).toBe('FAJR');
    expect(nextFromIsha.time.toMillis()).toBe(nextTimes.fajr.toMillis());
  });

  it('PE-11: determinism — identical inputs produce identical output down to millisecond', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    const res1 = calculate('2026-09-15', coords, params);
    const res2 = calculate('2026-09-15', coords, params);

    expect(res1.fajr.toMillis()).toBe(res2.fajr.toMillis());
    expect(res1.sunrise.toMillis()).toBe(res2.sunrise.toMillis());
    expect(res1.dhuhr.toMillis()).toBe(res2.dhuhr.toMillis());
    expect(res1.asr.toMillis()).toBe(res2.asr.toMillis());
    expect(res1.maghrib.toMillis()).toBe(res2.maghrib.toMillis());
    expect(res1.isha.toMillis()).toBe(res2.isha.toMillis());
  });

  it('PE-12: handles DST transition dates without errors or invalid times', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    // NYC DST spring-forward: 2026-03-08 (2:00 AM -> 3:00 AM)
    const springResult = calculate('2026-03-08', coords, params);
    expect(springResult.fajr.isValid).toBe(true);
    expect(springResult.dhuhr.isValid).toBe(true);
    expect(springResult.asr.isValid).toBe(true);
    expect(springResult.maghrib.isValid).toBe(true);
    expect(springResult.isha.isValid).toBe(true);

    // NYC DST fall-back: 2026-11-01 (2:00 AM -> 1:00 AM)
    const fallResult = calculate('2026-11-01', coords, params);
    expect(fallResult.fajr.isValid).toBe(true);
    expect(fallResult.dhuhr.isValid).toBe(true);
    expect(fallResult.asr.isValid).toBe(true);
    expect(fallResult.maghrib.isValid).toBe(true);
    expect(fallResult.isha.isValid).toBe(true);
  });

  it('calculateRange: throws for invalid date range', () => {
    const coords: Coordinates = { latitude: LOCATIONS.mecca.lat, longitude: LOCATIONS.mecca.lng };
    const params: PrayerCalculationParams = {
      method: 'MAKKAH',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.mecca.tz,
    };

    expect(() => calculateRange('invalid', '2026-09-16', coords, params)).toThrow(
      'Invalid date range'
    );
  });

  it('calculate: supports explicit non-AUTO highLatitudeRule', () => {
    const coords: Coordinates = { latitude: LOCATIONS.london.lat, longitude: LOCATIONS.london.lng };
    const params: PrayerCalculationParams = {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'MIDDLE_OF_NIGHT',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.london.tz,
    };

    const result = calculate('2026-06-21', coords, params);
    expect(result.fajr.isValid).toBe(true);
  });

  it('calculateRange: produces complete map of results across date range', () => {
    const coords: Coordinates = { latitude: LOCATIONS.mecca.lat, longitude: LOCATIONS.mecca.lng };
    const params: PrayerCalculationParams = {
      method: 'MAKKAH',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.mecca.tz,
    };

    const rangeMap = calculateRange('2026-09-14', '2026-09-16', coords, params);
    expect(rangeMap.size).toBe(3);
    expect(rangeMap.has('2026-09-14')).toBe(true);
    expect(rangeMap.has('2026-09-15')).toBe(true);
    expect(rangeMap.has('2026-09-16')).toBe(true);
  });

  it('recommendCalculationMethod: returns default method MWL for general coordinates', () => {
    expect(recommendCalculationMethod({ latitude: 0, longitude: 0 })).toBe('MWL');
  });

  it('validates input date format strictly', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: LOCATIONS.newYork.tz,
    };

    expect(() => calculate('15-09-2026', coords, params)).toThrow('Invalid date format');
    expect(() => calculate('invalid-date', coords, params)).toThrow('Invalid date format');
  });

  it('validates input timezone strictly', () => {
    const coords: Coordinates = { latitude: LOCATIONS.newYork.lat, longitude: LOCATIONS.newYork.lng };
    const params: PrayerCalculationParams = {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: defaultAdjustments,
      timezone: 'Invalid/Zone',
    };

    expect(() => calculate('2026-09-15', coords, params)).toThrow('Invalid IANA timezone');
  });

  it('PrayerEngine API matches PrayerEngineAPI interface', () => {
    expect(typeof PrayerEngine.calculate).toBe('function');
    expect(typeof PrayerEngine.calculateRange).toBe('function');
    expect(typeof PrayerEngine.buildPrayerTimeline).toBe('function');
    expect(typeof PrayerEngine.getCurrentPrayer).toBe('function');
    expect(typeof PrayerEngine.getNextPrayer).toBe('function');
    expect(typeof PrayerEngine.recommendCalculationMethod).toBe('function');
    expect(typeof PrayerEngine.calculationConfigFingerprint).toBe('function');
  });
});
