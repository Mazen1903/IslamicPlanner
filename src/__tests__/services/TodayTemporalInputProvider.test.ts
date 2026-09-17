import {
  LocationAwareTodayTemporalInputProvider,
  M7BootstrapInputProvider,
  StaticTodayTemporalInputProvider,
} from '@/services/TodayTemporalInputProvider';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { getDatabase } from '@/data/db';
import { userSettings } from '@/data/schema';
import type { TodayTemporalInputs } from '@/services/types';

describe('TodayTemporalInputProvider (TI-01 to TI-04)', () => {
  const dummyInputs: TodayTemporalInputs = {
    coordinates: { latitude: 40.7128, longitude: -74.006 },
    params: {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'America/New_York',
    },
    planningDayConfig: { mode: 'FAJR' },
  };

  beforeEach(() => {
    createTestDatabase();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('TI-01: unconfigured provider returns SETUP_REQUIRED', async () => {
    const provider = new M7BootstrapInputProvider();
    const result = await provider.getInputs();

    expect(result.status).toBe('SETUP_REQUIRED');
  });

  it('TI-02: SETUP_REQUIRED prevents fake materialization and invalidates stale data', async () => {
    const provider = new M7BootstrapInputProvider();
    const result = await provider.getInputs();

    expect(result.status).toBe('SETUP_REQUIRED');
    // Ensure inputs property does not exist on SETUP_REQUIRED result
    expect((result as any).inputs).toBeUndefined();
  });

  it('TI-03: static provider returns READY with explicitly configured inputs', async () => {
    const provider = new StaticTodayTemporalInputProvider(dummyInputs);
    const result = await provider.getInputs();

    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.inputs.coordinates.latitude).toBe(40.7128);
      expect(result.inputs.params.timezone).toBe('America/New_York');
      expect(result.inputs.planningDayConfig.mode).toBe('FAJR');
    }
  });

  it('TI-04: production provider has no silent Mecca/Riyadh fallback', async () => {
    // Ensure table has no manual coordinates
    const db = getDatabase();
    db.delete(userSettings).run();

    const provider = new M7BootstrapInputProvider();
    const result = await provider.getInputs();

    expect(result.status).toBe('SETUP_REQUIRED');
    if (result.status === 'READY') {
      // Must never be reached
      throw new Error('Expected SETUP_REQUIRED but got READY');
    }

    // Now configure legitimate manual settings
    db.insert(userSettings)
      .values({
        id: 'default',
        locationMode: 'MANUAL',
        manualLatitude: 51.5074,
        manualLongitude: -0.1278,
        manualLocationName: 'London',
        manualTimezone: 'Europe/London',
        calculationMethod: 'MWL',
        asrMethod: 'SHAFI',
        highLatitudeRule: 'ANGLE_BASED',
        polarCircleResolution: 'AQRAB_YAUM',
        prayerAdjustments: '{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}',
        planningDayStart: 'FAJR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();

    const configuredResult = await provider.getInputs();
    expect(configuredResult.status).toBe('READY');
    if (configuredResult.status === 'READY') {
      expect(configuredResult.inputs.coordinates.latitude).toBe(51.5074);
      expect(configuredResult.inputs.params.timezone).toBe('Europe/London');
    }
  });

  describe('LocationAwareTodayTemporalInputProvider (TI-05 to TI-09)', () => {
    it('TI-05: returns SETUP_REQUIRED when user_settings table is empty', async () => {
      const db = getDatabase();
      db.delete(userSettings).run();

      const provider = new LocationAwareTodayTemporalInputProvider();
      const result = await provider.getInputs();
      expect(result.status).toBe('SETUP_REQUIRED');
    });

    it('TI-06: in AUTO mode, reads ONLY last_auto_* and last_known_timezone', async () => {
      const db = getDatabase();
      db.delete(userSettings).run();
      db.insert(userSettings)
        .values({
          id: 'default',
          locationMode: 'AUTO',
          lastAutoLatitude: 41.8781,
          lastAutoLongitude: -87.6298,
          lastKnownTimezone: 'America/Chicago',
          // Set distinct manual coordinates to verify isolation
          manualLatitude: 24.4672,
          manualLongitude: 39.6111,
          manualTimezone: 'Asia/Riyadh',
          calculationMethod: 'ISNA',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .run();

      const provider = new LocationAwareTodayTemporalInputProvider();
      const result = await provider.getInputs();

      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.inputs.coordinates.latitude).toBeCloseTo(41.8781);
        expect(result.inputs.coordinates.longitude).toBeCloseTo(-87.6298);
        expect(result.inputs.params.timezone).toBe('America/Chicago');
        expect(result.inputs.params.method).toBe('ISNA');
      }
    });

    it('TI-07: in AUTO mode, returns SETUP_REQUIRED if auto coordinates are missing (NO fallback to manual)', async () => {
      const db = getDatabase();
      db.delete(userSettings).run();
      db.insert(userSettings)
        .values({
          id: 'default',
          locationMode: 'AUTO',
          lastAutoLatitude: null,
          lastAutoLongitude: null,
          lastKnownTimezone: null,
          // Manual fields populated
          manualLatitude: 41.8781,
          manualLongitude: -87.6298,
          manualTimezone: 'America/Chicago',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .run();

      const provider = new LocationAwareTodayTemporalInputProvider();
      const result = await provider.getInputs();

      // STRICT ISOLATION: Must NOT fall back to manual
      expect(result.status).toBe('SETUP_REQUIRED');
    });

    it('TI-08: in MANUAL mode, reads ONLY manual_* fields', async () => {
      const db = getDatabase();
      db.delete(userSettings).run();
      db.insert(userSettings)
        .values({
          id: 'default',
          locationMode: 'MANUAL',
          manualLatitude: 24.4672,
          manualLongitude: 39.6111,
          manualLocationName: 'Medina',
          manualTimezone: 'Asia/Riyadh',
          // Set distinct auto coordinates to verify isolation
          lastAutoLatitude: 51.5074,
          lastAutoLongitude: -0.1278,
          lastKnownTimezone: 'Europe/London',
          calculationMethod: 'MAKKAH',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .run();

      const provider = new LocationAwareTodayTemporalInputProvider();
      const result = await provider.getInputs();

      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.inputs.coordinates.latitude).toBeCloseTo(24.4672);
        expect(result.inputs.coordinates.longitude).toBeCloseTo(39.6111);
        expect(result.inputs.params.timezone).toBe('Asia/Riyadh');
        expect(result.inputs.params.method).toBe('MAKKAH');
      }
    });

    it('TI-09: in MANUAL mode, returns SETUP_REQUIRED if manual coordinates are missing (NO fallback to auto)', async () => {
      const db = getDatabase();
      db.delete(userSettings).run();
      db.insert(userSettings)
        .values({
          id: 'default',
          locationMode: 'MANUAL',
          manualLatitude: null,
          manualLongitude: null,
          manualTimezone: null,
          // Auto fields populated
          lastAutoLatitude: 51.5074,
          lastAutoLongitude: -0.1278,
          lastKnownTimezone: 'Europe/London',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .run();

      const provider = new LocationAwareTodayTemporalInputProvider();
      const result = await provider.getInputs();

      expect(result.status).toBe('SETUP_REQUIRED');
    });
  });
});
