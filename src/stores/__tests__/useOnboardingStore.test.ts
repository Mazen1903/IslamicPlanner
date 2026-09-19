import { useOnboardingStore } from '../useOnboardingStore';
import type { UserSettingsRepository, UserSettingsRow } from '@/data/repositories/UserSettingsRepository';

describe('useOnboardingStore (B-series tests)', () => {
  let mockRepo: jest.Mocked<UserSettingsRepository>;

  const createSettings = (onboardingCompleted: boolean): UserSettingsRow => ({
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
    onboardingCompleted,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
  });

  beforeEach(() => {
    useOnboardingStore.getState().reset();
    mockRepo = {
      get: jest.fn(),
      upsert: jest.fn(),
      saveAutoLocation: jest.fn(),
      saveManualLocation: jest.fn(),
      updateLastKnownTimezone: jest.fn(),
    } as unknown as jest.Mocked<UserSettingsRepository>;
  });

  it('B-01: resolves to PENDING when no user_settings row exists (null)', async () => {
    mockRepo.get.mockResolvedValue(null);

    await useOnboardingStore.getState().initialize(mockRepo);

    expect(useOnboardingStore.getState().status).toBe('PENDING');
    expect(mockRepo.get).toHaveBeenCalledTimes(1);
  });

  it('B-02: resolves to PENDING when user_settings row has onboardingCompleted = false', async () => {
    mockRepo.get.mockResolvedValue(createSettings(false));

    await useOnboardingStore.getState().initialize(mockRepo);

    expect(useOnboardingStore.getState().status).toBe('PENDING');
    expect(mockRepo.get).toHaveBeenCalledTimes(1);
  });

  it('B-03: resolves to COMPLETE when user_settings row has onboardingCompleted = true', async () => {
    mockRepo.get.mockResolvedValue(createSettings(true));

    await useOnboardingStore.getState().initialize(mockRepo);

    expect(useOnboardingStore.getState().status).toBe('COMPLETE');
    expect(mockRepo.get).toHaveBeenCalledTimes(1);
  });

  it('B-04: resolves to ERROR when DB get() throws an exception', async () => {
    mockRepo.get.mockRejectedValue(new Error('SQLite disk I/O error'));

    await useOnboardingStore.getState().initialize(mockRepo);

    expect(useOnboardingStore.getState().status).toBe('ERROR');
    expect(mockRepo.get).toHaveBeenCalledTimes(1);
  });

  it('B-11: retry re-runs initialization and transitions from ERROR to PENDING on DB recovery', async () => {
    mockRepo.get.mockRejectedValueOnce(new Error('Temporary DB lock'));

    await useOnboardingStore.getState().initialize(mockRepo);
    expect(useOnboardingStore.getState().status).toBe('ERROR');

    // DB recovers
    mockRepo.get.mockResolvedValueOnce(createSettings(false));

    await useOnboardingStore.getState().retry(mockRepo);

    expect(useOnboardingStore.getState().status).toBe('PENDING');
    expect(mockRepo.get).toHaveBeenCalledTimes(2);
  });

  it('B-11b: retry re-runs initialization and transitions from ERROR to COMPLETE when DB recovers with completed setup', async () => {
    mockRepo.get.mockRejectedValueOnce(new Error('Temporary DB lock'));

    await useOnboardingStore.getState().initialize(mockRepo);
    expect(useOnboardingStore.getState().status).toBe('ERROR');

    // DB recovers with completed flag
    mockRepo.get.mockResolvedValueOnce(createSettings(true));

    await useOnboardingStore.getState().retry(mockRepo);

    expect(useOnboardingStore.getState().status).toBe('COMPLETE');
  });

  it('B-11c: retry remains ERROR if DB failure persists', async () => {
    mockRepo.get.mockRejectedValue(new Error('Persistent corruption'));

    await useOnboardingStore.getState().initialize(mockRepo);
    expect(useOnboardingStore.getState().status).toBe('ERROR');

    await useOnboardingStore.getState().retry(mockRepo);
    expect(useOnboardingStore.getState().status).toBe('ERROR');
  });

  it('markComplete synchronously updates in-memory status to COMPLETE', () => {
    useOnboardingStore.setState({ status: 'PENDING' });
    expect(useOnboardingStore.getState().status).toBe('PENDING');

    useOnboardingStore.getState().markComplete();
    expect(useOnboardingStore.getState().status).toBe('COMPLETE');
  });

  it('initialize is a no-op when status is already COMPLETE', async () => {
    useOnboardingStore.setState({ status: 'COMPLETE' });

    await useOnboardingStore.getState().initialize(mockRepo);

    expect(mockRepo.get).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().status).toBe('COMPLETE');
  });
});
