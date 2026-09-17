import { isMaterialChange } from '../environmentComparator';
import type { TemporalEnvironment } from '../types';
import type { PrayerCalculationParams } from '@/domain/prayer/types';

const defaultParams: PrayerCalculationParams = {
  method: 'MWL',
  asrMethod: 'SHAFI',
  highLatitudeRule: 'AUTO',
  polarCircleResolution: 'AQRAB_YAUM',
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  timezone: 'America/Chicago',
};

const baseEnvironment: TemporalEnvironment = {
  location: {
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: 'America/Chicago',
    cityName: 'Chicago',
    source: 'AUTO',
  },
  calculationParams: defaultParams,
  planningDayConfig: { mode: 'FAJR' },
};

describe('environmentComparator', () => {
  it('identifies unconfigured (null) environment as material change', () => {
    expect(
      isMaterialChange(null, {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        timezone: 'America/Chicago',
      })
    ).toBe(true);
  });

  it('identifies mode switch (AUTO -> MANUAL) as material change', () => {
    expect(
      isMaterialChange(baseEnvironment, {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        timezone: 'America/Chicago',
        mode: 'MANUAL',
      })
    ).toBe(true);
  });

  it('identifies timezone change as material even if coordinates are identical', () => {
    expect(
      isMaterialChange(baseEnvironment, {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        timezone: 'America/New_York',
      })
    ).toBe(true);
  });

  it('identifies movement >= 10 km as material change', () => {
    // Rockford, IL is ~120 km from Chicago
    expect(
      isMaterialChange(baseEnvironment, {
        coordinates: { latitude: 42.2711, longitude: -89.094 },
        timezone: 'America/Chicago',
      })
    ).toBe(true);
  });

  it('rejects sub-10 km jitter when timezone and parameters remain unchanged', () => {
    // 3 km movement within Chicago
    expect(
      isMaterialChange(baseEnvironment, {
        coordinates: { latitude: 41.8981, longitude: -87.6298 },
        timezone: 'America/Chicago',
      })
    ).toBe(false);
  });

  it('identifies prayer calculation parameter change as material change', () => {
    expect(
      isMaterialChange(baseEnvironment, {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        timezone: 'America/Chicago',
        calculationParams: {
          ...defaultParams,
          method: 'ISNA',
        },
      })
    ).toBe(true);

    expect(
      isMaterialChange(baseEnvironment, {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        timezone: 'America/Chicago',
        calculationParams: {
          ...defaultParams,
          adjustments: { ...defaultParams.adjustments, fajr: 2 },
        },
      })
    ).toBe(true);
  });

  it('identifies planning day configuration change as material change', () => {
    expect(
      isMaterialChange(baseEnvironment, {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        timezone: 'America/Chicago',
        planningDayConfig: { mode: 'MIDNIGHT' },
      })
    ).toBe(true);

    expect(
      isMaterialChange(baseEnvironment, {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        timezone: 'America/Chicago',
        planningDayConfig: { mode: 'CUSTOM', localTime: '04:00' },
      })
    ).toBe(true);
  });
});
