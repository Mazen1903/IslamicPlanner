import { OnboardingCoordinator } from '../OnboardingCoordinator';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import type { UserSettingsRepository, UserSettingsRow } from '@/data/repositories/UserSettingsRepository';
import type { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';

describe('OnboardingEdgeCases (OE-01 to OE-05)', () => {
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
    completedTasksMode: 'KEEP',
    overdueTasksMode: 'KEEP',
    prayerVibrationEnabled: true,
    taskRemindersEnabled: true,
    taskVibrationEnabled: true,
    quietHoursEnabled: false,
    themeMode: 'SYSTEM',
    isPremium: false,
    onboardingCompleted: false,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    useOnboardingStore.getState().reset();
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

  it('OE-01: (UNIT) Completion persistence failure (DB error on onboardingCompleted write): gate remains PENDING', async () => {
    // calculationMethod upsert succeeds, onboardingCompleted upsert fails
    mockRepo.upsert
      .mockResolvedValueOnce({ ...mockSettings, calculationMethod: 'ISNA' })
      .mockRejectedValueOnce(new Error('Disk I/O error on onboardingCompleted write'));

    const result = await coordinator.complete({ calculationMethod: 'ISNA' });
    expect(result.status).toBe('FAILED');

    // Gate initialization should see onboardingCompleted === false and remain PENDING
    await useOnboardingStore.getState().initialize(mockRepo);
    expect(useOnboardingStore.getState().status).toBe('PENDING');
  });

  it('OE-02: (UNIT) Partial persistence: calculationMethod write succeeds but onboardingCompleted write fails: gate remains PENDING; settings not corrupted', async () => {
    mockRepo.upsert
      .mockImplementationOnce(async patch => {
        mockSettings = { ...mockSettings, ...patch };
        return mockSettings;
      })
      .mockRejectedValueOnce(new Error('Lock acquisition timeout on step 5'));

    const result = await coordinator.complete({ calculationMethod: 'EGYPT' });
    expect(result.status).toBe('FAILED');

    // calculationMethod was persisted
    expect(mockSettings.calculationMethod).toBe('EGYPT');
    // onboardingCompleted remains false
    expect(mockSettings.onboardingCompleted).toBe(false);

    // Gate status is evaluated from DB and remains PENDING
    await useOnboardingStore.getState().initialize(mockRepo);
    expect(useOnboardingStore.getState().status).toBe('PENDING');
  });

  it('OE-03: (UNIT) fullRefresh failure after successful onboardingCompleted: true write: returns PERSISTED_REFRESH_FAILED; does NOT roll back onboardingCompleted', async () => {
    mockRefreshCoordinator.fullRefresh.mockRejectedValueOnce(new Error('Network or coordinator timeout'));

    const result = await coordinator.complete({ calculationMethod: 'ISNA' });
    expect(result.status).toBe('PERSISTED_REFRESH_FAILED');

    // Invariant: onboardingCompleted is NOT rolled back
    expect(mockSettings.onboardingCompleted).toBe(true);

    const rollbackCalls = mockRepo.upsert.mock.calls.filter(call => call[0]?.onboardingCompleted === false);
    expect(rollbackCalls).toHaveLength(0);

    // Gate should recognize completion so user is not trapped
    await useOnboardingStore.getState().initialize(mockRepo);
    expect(useOnboardingStore.getState().status).toBe('COMPLETE');
  });

  it('OE-04: (UNIT) Missing user_settings row (fresh install): resolves to PENDING; not ERROR', async () => {
    mockRepo.get.mockResolvedValueOnce(null);

    await useOnboardingStore.getState().initialize(mockRepo);

    expect(useOnboardingStore.getState().status).toBe('PENDING');
  });

  it('OE-05: (UNIT) DB infrastructure failure during gate initialize(): resolves to ERROR; not PENDING', async () => {
    mockRepo.get.mockRejectedValueOnce(new Error('Fatal SQLite table lock or corrupted file'));

    await useOnboardingStore.getState().initialize(mockRepo);

    expect(useOnboardingStore.getState().status).toBe('ERROR');
  });
});
