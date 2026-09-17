import { UserSettingsRepository } from '../UserSettingsRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';

describe('UserSettingsRepository', () => {
  let repo: UserSettingsRepository;

  beforeEach(() => {
    createTestDatabase();
    repo = new UserSettingsRepository();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('returns null on empty table', async () => {
    const settings = await repo.get();
    expect(settings).toBeNull();
  });

  it('upserts initial default row', async () => {
    const created = await repo.upsert({
      calculationMethod: 'ISNA',
    });

    expect(created).toBeDefined();
    expect(created.id).toBe('default');
    expect(created.calculationMethod).toBe('ISNA');
    expect(created.locationMode).toBe('AUTO');
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();
  });

  it('saveAutoLocation writes AUTO fields with strict isolation', async () => {
    // 1. Pre-populate some manual fields
    await repo.upsert({
      locationMode: 'MANUAL',
      manualLatitude: 41.8781,
      manualLongitude: -87.6298,
      manualLocationName: 'Chicago',
      manualTimezone: 'America/Chicago',
    });

    // 2. Save AUTO location
    await repo.saveAutoLocation(
      { latitude: 51.5074, longitude: -0.1278 },
      'Europe/London'
    );

    const row = await repo.get();
    expect(row).toBeDefined();
    expect(row!.locationMode).toBe('AUTO');
    expect(row!.lastAutoLatitude).toBeCloseTo(51.5074);
    expect(row!.lastAutoLongitude).toBeCloseTo(-0.1278);
    expect(row!.lastKnownTimezone).toBe('Europe/London');

    // Crucial isolation check: manual fields were NOT overwritten
    expect(row!.manualLatitude).toBeCloseTo(41.8781);
    expect(row!.manualLongitude).toBeCloseTo(-87.6298);
    expect(row!.manualLocationName).toBe('Chicago');
    expect(row!.manualTimezone).toBe('America/Chicago');
  });

  it('saveManualLocation writes MANUAL fields with strict isolation', async () => {
    // 1. Pre-populate AUTO fields
    await repo.upsert({
      locationMode: 'AUTO',
      lastAutoLatitude: 51.5074,
      lastAutoLongitude: -0.1278,
      lastKnownTimezone: 'Europe/London',
    });

    // 2. Save MANUAL location
    await repo.saveManualLocation(
      { latitude: 24.4672, longitude: 39.6111 },
      'Medina',
      'Asia/Riyadh'
    );

    const row = await repo.get();
    expect(row).toBeDefined();
    expect(row!.locationMode).toBe('MANUAL');
    expect(row!.manualLatitude).toBeCloseTo(24.4672);
    expect(row!.manualLongitude).toBeCloseTo(39.6111);
    expect(row!.manualLocationName).toBe('Medina');
    expect(row!.manualTimezone).toBe('Asia/Riyadh');

    // Crucial isolation check: auto fields were NOT overwritten
    expect(row!.lastAutoLatitude).toBeCloseTo(51.5074);
    expect(row!.lastAutoLongitude).toBeCloseTo(-0.1278);
    expect(row!.lastKnownTimezone).toBe('Europe/London');
  });

  it('updateLastKnownTimezone updates timezone without mutating coordinates', async () => {
    await repo.saveAutoLocation(
      { latitude: 41.8781, longitude: -87.6298 },
      'America/Chicago'
    );

    await repo.updateLastKnownTimezone('America/New_York');

    const row = await repo.get();
    expect(row!.lastKnownTimezone).toBe('America/New_York');
    expect(row!.lastAutoLatitude).toBeCloseTo(41.8781);
  });
});
