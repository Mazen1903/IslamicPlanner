import { calculationConfigFingerprint } from './cacheFingerprint';
import type { Coordinates, PrayerCalculationParams } from './types';

describe('calculationConfigFingerprint', () => {
  const baseCoordinates: Coordinates = {
    latitude: 40.7128,
    longitude: -74.006,
  };

  const baseParams: PrayerCalculationParams = {
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

  const baseDate = '2026-09-15';

  it('CF-01: produces identical fingerprint for identical inputs', () => {
    const fp1 = calculationConfigFingerprint(baseDate, baseCoordinates, baseParams);
    const fp2 = calculationConfigFingerprint(baseDate, { ...baseCoordinates }, {
      ...baseParams,
      adjustments: { ...baseParams.adjustments },
    });
    expect(fp1).toBe(fp2);
  });

  it('CF-02: changes fingerprint when calculation method changes', () => {
    const fpBase = calculationConfigFingerprint(baseDate, baseCoordinates, baseParams);
    const fpModified = calculationConfigFingerprint(baseDate, baseCoordinates, {
      ...baseParams,
      method: 'MWL',
    });
    expect(fpModified).not.toBe(fpBase);
  });

  it('CF-03: changes fingerprint when Asr method changes', () => {
    const fpBase = calculationConfigFingerprint(baseDate, baseCoordinates, baseParams);
    const fpModified = calculationConfigFingerprint(baseDate, baseCoordinates, {
      ...baseParams,
      asrMethod: 'HANAFI',
    });
    expect(fpModified).not.toBe(fpBase);
  });

  it('CF-04: changes fingerprint when high-latitude rule changes', () => {
    const fpBase = calculationConfigFingerprint(baseDate, baseCoordinates, baseParams);
    const fpModified = calculationConfigFingerprint(baseDate, baseCoordinates, {
      ...baseParams,
      highLatitudeRule: 'ANGLE_BASED',
    });
    expect(fpModified).not.toBe(fpBase);
  });

  it('CF-05: changes fingerprint when polar circle resolution changes', () => {
    const fpBase = calculationConfigFingerprint(baseDate, baseCoordinates, baseParams);
    const fpModified = calculationConfigFingerprint(baseDate, baseCoordinates, {
      ...baseParams,
      polarCircleResolution: 'AQRAB_BALAD',
    });
    expect(fpModified).not.toBe(fpBase);
  });

  it('CF-06: changes fingerprint when any single adjustment changes', () => {
    const fpBase = calculationConfigFingerprint(baseDate, baseCoordinates, baseParams);

    const adjustmentKeys: (keyof typeof baseParams.adjustments)[] = [
      'fajr',
      'sunrise',
      'dhuhr',
      'asr',
      'maghrib',
      'isha',
    ];

    for (const key of adjustmentKeys) {
      const modifiedParams: PrayerCalculationParams = {
        ...baseParams,
        adjustments: {
          ...baseParams.adjustments,
          [key]: 1,
        },
      };
      const fpModified = calculationConfigFingerprint(baseDate, baseCoordinates, modifiedParams);
      expect(fpModified).not.toBe(fpBase);
    }
  });

  it('CF-07: changes fingerprint when latitude changes by 0.01', () => {
    const fp1 = calculationConfigFingerprint(baseDate, { latitude: 40.71, longitude: -74.0 }, baseParams);
    const fp2 = calculationConfigFingerprint(baseDate, { latitude: 40.72, longitude: -74.0 }, baseParams);
    expect(fp2).not.toBe(fp1);
  });

  it('CF-08: changes fingerprint when timezone changes', () => {
    const fpBase = calculationConfigFingerprint(baseDate, baseCoordinates, baseParams);
    const fpModified = calculationConfigFingerprint(baseDate, baseCoordinates, {
      ...baseParams,
      timezone: 'America/Chicago',
    });
    expect(fpModified).not.toBe(fpBase);
  });

  it('CF-09: rounds coordinates to 2 decimal places preventing micro-jitter invalidation', () => {
    const fp1 = calculationConfigFingerprint(
      baseDate,
      { latitude: 40.712, longitude: -74.006 },
      baseParams
    );
    const fp2 = calculationConfigFingerprint(
      baseDate,
      { latitude: 40.714, longitude: -74.006 },
      baseParams
    );
    expect(fp1).toBe(fp2);
  });

  it('CF-10: normalizes negative zero coordinates to 0.00', () => {
    const fpZero = calculationConfigFingerprint(
      baseDate,
      { latitude: 0.0, longitude: 0.0 },
      baseParams
    );
    const fpNegZero = calculationConfigFingerprint(
      baseDate,
      { latitude: -0.0001, longitude: -0.0001 },
      baseParams
    );
    expect(fpNegZero).toBe(fpZero);
  });
});
