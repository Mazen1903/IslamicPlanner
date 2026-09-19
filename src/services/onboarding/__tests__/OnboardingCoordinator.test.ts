import { OnboardingCoordinator } from '../OnboardingCoordinator';
import type { UserSettingsRepository, UserSettingsRow } from '@/data/repositories/UserSettingsRepository';
import type { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { SettingsMutationCoordinator } from '@/services/SettingsMutationCoordinator';

describe('OnboardingCoordinator (OC-series tests)', () => {
  let mockSettings: UserSettingsRow;
  let mockRepo: jest.Mocked<UserSettingsRepository>;
  let mockRefreshCoordinator: jest.Mocked<PlannerRefreshCoordinator>;
  let coordinator: OnboardingCoordinator;

  const createValidSettings = (overrides?: Partial<UserSettingsRow>): UserSettingsRow => ({
    id: 'default',
    locationMode: 'AUTO',
    manualLatitude: null,
    manualLongitude: null,
    manualLocationName: null,
    manualTimezone: null,
    lastKnownTimezone: 'America/Chicago',
    lastAutoLatitude: 41.8781,
    lastAutoLongitude: -87.6298,
    calculationMethod: 'MWL',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    prayerAdjustments: '{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}',
    planningDayStart: 'FAJR',
    hijriBaseMethod: 'UMM_AL_QURA',
    hijriGlobalAdjustment: 0,
    worshipSuggestionsEnabled: true,
    prayerAlertsEnabled: true,
    themeMode: 'SYSTEM',
    isPremium: false,
    onboardingCompleted: false,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    mockSettings = createValidSettings();
    mockRepo = {
      get: jest.fn().mockImplementation(async () => mockSettings),
      upsert: jest.fn().mockImplementation(async patch => {
        mockSettings = { ...mockSettings, ...patch };
        return mockSettings;
      }),
      saveAutoLocation: jest.fn(),
      saveManualLocation: jest.fn(),
      updateLastKnownTimezone: jest.fn(),
    } as unknown as jest.Mocked<UserSettingsRepository>;

    mockRefreshCoordinator = {
      fullRefresh: jest.fn().mockResolvedValue({
        status: 'READY',
        viewModel: {} as any,
        runtime: {} as any,
        horizonSync: {} as any,
      }),
    } as unknown as jest.Mocked<PlannerRefreshCoordinator>;

    coordinator = new OnboardingCoordinator(mockRepo, mockRefreshCoordinator);
  });

  it('OC-01: returns LOCATION_REQUIRED when no location exists (null settings)', async () => {
    mockRepo.get.mockResolvedValue(null);

    const result = await coordinator.complete({ calculationMethod: 'ISNA' });

    expect(result.status).toBe('LOCATION_REQUIRED');
  });

  it('OC-01b: returns LOCATION_REQUIRED when AUTO mode has missing coordinates or invalid timezone', async () => {
    mockRepo.get.mockResolvedValue(
      createValidSettings({
        locationMode: 'AUTO',
        lastAutoLatitude: null,
        lastAutoLongitude: null,
      })
    );

    const result = await coordinator.complete({ calculationMethod: 'ISNA' });
    expect(result.status).toBe('LOCATION_REQUIRED');
  });

  it('OC-01c: returns LOCATION_REQUIRED when coordinates are fake fallback (0, 0)', async () => {
    mockRepo.get.mockResolvedValue(
      createValidSettings({
        locationMode: 'AUTO',
        lastAutoLatitude: 0,
        lastAutoLongitude: 0,
        lastKnownTimezone: 'UTC',
      })
    );

    const result = await coordinator.complete({ calculationMethod: 'ISNA' });
    expect(result.status).toBe('LOCATION_REQUIRED');
  });

  it('OC-01d: returns LOCATION_REQUIRED when timezone is invalid', async () => {
    mockRepo.get.mockResolvedValue(
      createValidSettings({
        locationMode: 'AUTO',
        lastAutoLatitude: 41.8781,
        lastAutoLongitude: -87.6298,
        lastKnownTimezone: 'Invalid/NonExistent_Zone',
      })
    );

    const result = await coordinator.complete({ calculationMethod: 'ISNA' });
    expect(result.status).toBe('LOCATION_REQUIRED');
  });

  it('OC-02: LOCATION_REQUIRED does NOT write onboardingCompleted or calculationMethod to DB', async () => {
    mockRepo.get.mockResolvedValue(null);

    await coordinator.complete({ calculationMethod: 'ISNA' });

    expect(mockRepo.upsert).not.toHaveBeenCalled();
    expect(mockRefreshCoordinator.fullRefresh).not.toHaveBeenCalled();
  });

  it('OC-03: Valid setup persists calculationMethod then onboardingCompleted=true, without themeMode', async () => {
    const result = await coordinator.complete({ calculationMethod: 'ISNA' });

    expect(result.status).toBe('SUCCESS');

    // Verify upsert calls
    expect(mockRepo.upsert).toHaveBeenCalledTimes(2);
    expect(mockRepo.upsert).toHaveBeenNthCalledWith(1, { calculationMethod: 'ISNA' });
    expect(mockRepo.upsert).toHaveBeenNthCalledWith(2, { onboardingCompleted: true });

    // Verify no themeMode in upsert calls
    for (const call of mockRepo.upsert.mock.calls) {
      expect(call[0]).not.toHaveProperty('themeMode');
    }
  });

  it('OC-03b: Valid MANUAL location is accepted and completed', async () => {
    mockRepo.get.mockResolvedValue(
      createValidSettings({
        locationMode: 'MANUAL',
        manualLatitude: 24.4672,
        manualLongitude: 39.6111,
        manualLocationName: 'Medina',
        manualTimezone: 'Asia/Riyadh',
        lastAutoLatitude: null,
        lastAutoLongitude: null,
      })
    );

    const result = await coordinator.complete({ calculationMethod: 'MAKKAH' });

    expect(result.status).toBe('SUCCESS');
    expect(mockRepo.upsert).toHaveBeenNthCalledWith(1, { calculationMethod: 'MAKKAH' });
    expect(mockRepo.upsert).toHaveBeenNthCalledWith(2, { onboardingCompleted: true });
  });

  it('OC-04: Returns SETUP_INCOMPLETE for invalid calculation method and does NOT write onboardingCompleted', async () => {
    const result = await coordinator.complete({ calculationMethod: 'INVALID_METHOD' as any });

    expect(result.status).toBe('SETUP_INCOMPLETE');
    expect(mockRepo.upsert).not.toHaveBeenCalled();
    expect(mockRefreshCoordinator.fullRefresh).not.toHaveBeenCalled();
  });

  it('OC-05: Calculation method persistence failure returns FAILED and does not write onboardingCompleted', async () => {
    mockRepo.upsert.mockRejectedValueOnce(new Error('Disk write error'));

    const result = await coordinator.complete({ calculationMethod: 'ISNA' });

    expect(result.status).toBe('FAILED');
    expect(mockRepo.upsert).toHaveBeenCalledTimes(1); // Only tried calculationMethod
    expect(mockRefreshCoordinator.fullRefresh).not.toHaveBeenCalled();
  });

  it('OC-06: onboardingCompleted persistence failure returns FAILED and does not trigger refresh', async () => {
    mockRepo.upsert
      .mockResolvedValueOnce(mockSettings) // calculationMethod succeeds
      .mockRejectedValueOnce(new Error('Lock error on onboardingCompleted write')); // onboardingCompleted fails

    const result = await coordinator.complete({ calculationMethod: 'ISNA' });

    expect(result.status).toBe('FAILED');
    expect(mockRefreshCoordinator.fullRefresh).not.toHaveBeenCalled();
  });

  it('OC-07: Successful persistence calls fullRefresh exactly once', async () => {
    const result = await coordinator.complete({ calculationMethod: 'MWL' });

    expect(result.status).toBe('SUCCESS');
    expect(mockRefreshCoordinator.fullRefresh).toHaveBeenCalledTimes(1);
  });

  it('OC-08: fullRefresh throwing returns PERSISTED_REFRESH_FAILED without rolling back onboardingCompleted', async () => {
    mockRefreshCoordinator.fullRefresh.mockRejectedValueOnce(new Error('Planner computation crashed'));

    const result = await coordinator.complete({ calculationMethod: 'MWL' });

    expect(result.status).toBe('PERSISTED_REFRESH_FAILED');
    // Verify onboardingCompleted was persisted and NOT rolled back
    expect(mockRepo.upsert).toHaveBeenCalledWith({ onboardingCompleted: true });
    // No rollback upsert called
    const rollbackCalls = mockRepo.upsert.mock.calls.filter(call => call[0]?.onboardingCompleted === false);
    expect(rollbackCalls.length).toBe(0);
  });

  it('OC-09: fullRefresh returning SETUP_REQUIRED returns PERSISTED_REFRESH_FAILED (not SUCCESS)', async () => {
    mockRefreshCoordinator.fullRefresh.mockResolvedValueOnce({
      status: 'SETUP_REQUIRED',
    });

    const result = await coordinator.complete({ calculationMethod: 'MWL' });

    expect(result.status).toBe('PERSISTED_REFRESH_FAILED');
  });

  it('OC-11: SettingsMutationCoordinator cannot write onboardingCompleted because it is in FORBIDDEN_PATCH_KEYS', async () => {
    const settingsCoordinator = new SettingsMutationCoordinator(mockRepo, mockRefreshCoordinator);

    const result = await settingsCoordinator.applySettingsChange(
      {
        onboardingCompleted: true,
      } as any,
      'TEMPORAL_FULL_REFRESH'
    );

    expect(result.status).toBe('FAILED');
    expect((result as any).error).toContain('cannot be mutated via user settings');
  });
});
