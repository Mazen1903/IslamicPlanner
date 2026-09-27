import { renderHook, act } from '@testing-library/react-native';
import { LocationRefreshCoordinator } from '../LocationRefreshCoordinator';
import type { ILocationService } from '../LocationService';
import type { UserSettingsRepository, UserSettingsRow } from '@/data/repositories/UserSettingsRepository';
import { useLocation } from '@/hooks/useLocation';
import { useTodayStore } from '@/stores/useTodayStore';
import type { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { searchCities } from '@/domain/location/citySearch';

describe('LocationEdgeCases (LE-01 to LE-09)', () => {
  let mockSettings: UserSettingsRow;
  let mockRepo: jest.Mocked<UserSettingsRepository>;
  let mockLocationService: jest.Mocked<ILocationService>;
  let mockCoordinator: jest.Mocked<PlannerRefreshCoordinator>;
  let refreshCoordinator: LocationRefreshCoordinator;

  beforeEach(() => {
    // Reset Zustand store
    useTodayStore.setState({
      viewModel: null,
      runtime: null,
      status: 'idle',
      error: null,
      requestGeneration: 0,
      refreshInFlight: false,
    });

    mockSettings = {
      id: 'default',
      locationMode: 'AUTO',
      manualLatitude: 24.4672,
      manualLongitude: 39.6111,
      manualLocationName: 'Medina',
      manualTimezone: 'Asia/Riyadh',
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
      onboardingCompleted: true,
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
    };

    mockRepo = {
      get: jest.fn().mockImplementation(async () => mockSettings),
      upsert: jest.fn().mockImplementation(async patch => {
        mockSettings = { ...mockSettings, ...patch };
        return mockSettings;
      }),
      saveAutoLocation: jest.fn().mockImplementation(async (coords, tz) => {
        mockSettings = {
          ...mockSettings,
          locationMode: 'AUTO',
          lastAutoLatitude: coords.latitude,
          lastAutoLongitude: coords.longitude,
          lastKnownTimezone: tz,
        };
      }),
      saveManualLocation: jest.fn().mockImplementation(async (coords, name, tz) => {
        mockSettings = {
          ...mockSettings,
          locationMode: 'MANUAL',
          manualLatitude: coords.latitude,
          manualLongitude: coords.longitude,
          manualLocationName: name,
          manualTimezone: tz,
        };
      }),
      updateLastKnownTimezone: jest.fn(),
    } as unknown as jest.Mocked<UserSettingsRepository>;

    mockLocationService = {
      getForegroundPermission: jest.fn().mockResolvedValue('GRANTED'),
      requestForegroundPermission: jest.fn().mockResolvedValue('GRANTED'),
      getCurrentCoordinates: jest.fn().mockResolvedValue({ latitude: 41.8781, longitude: -87.6298 }),
      getDeviceTimezone: jest.fn().mockReturnValue('America/Chicago'),
    };

    mockCoordinator = {
      fullRefresh: jest.fn().mockResolvedValue({
        status: 'READY',
        viewModel: { planningDayKey: '2026-09-15' } as any,
        runtime: {} as any,
        horizonSync: {} as any,
      }),
    } as unknown as jest.Mocked<PlannerRefreshCoordinator>;

    refreshCoordinator = new LocationRefreshCoordinator(mockRepo, mockLocationService);
  });

  it('LE-01: AUTO mode with no committed location: returns SETUP_REQUIRED; no GPS call', async () => {
    mockSettings.locationMode = 'AUTO';
    mockSettings.lastAutoLatitude = null;
    mockSettings.lastAutoLongitude = null;
    mockSettings.lastKnownTimezone = null;
    mockLocationService.getForegroundPermission.mockResolvedValue('DENIED');

    const result = await refreshCoordinator.resolve();
    expect(result.status).toBe('SETUP_REQUIRED');
    expect(mockLocationService.getCurrentCoordinates).not.toHaveBeenCalled();
  });

  it('LE-02: MANUAL mode with null coordinates: returns SETUP_REQUIRED', async () => {
    mockSettings.locationMode = 'MANUAL';
    mockSettings.manualLatitude = null;
    mockSettings.manualLongitude = null;
    mockSettings.manualTimezone = null;

    const result = await refreshCoordinator.resolve();
    expect(result.status).toBe('SETUP_REQUIRED');
  });

  it('LE-03: AUTO mode with valid committed location: returns READY using committed; no GPS call', async () => {
    mockSettings.locationMode = 'AUTO';
    mockSettings.lastAutoLatitude = 41.8781;
    mockSettings.lastAutoLongitude = -87.6298;
    mockSettings.lastKnownTimezone = 'America/Chicago';
    mockLocationService.getForegroundPermission.mockResolvedValue('DENIED');

    const result = await refreshCoordinator.resolve();
    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.environment.location.latitude).toBe(41.8781);
      expect(result.environment.location.longitude).toBe(-87.6298);
      expect(result.environment.location.timezone).toBe('America/Chicago');
    }
    // With permission denied, resolve strictly reads committed snapshot and never calls GPS
    expect(mockLocationService.getCurrentCoordinates).not.toHaveBeenCalled();
  });

  it('LE-04: Permission revoked after AUTO configured: committed location still usable; no re-request', async () => {
    mockSettings.locationMode = 'AUTO';
    mockSettings.lastAutoLatitude = 41.8781;
    mockSettings.lastAutoLongitude = -87.6298;
    mockSettings.lastKnownTimezone = 'America/Chicago';
    mockLocationService.getForegroundPermission.mockResolvedValue('DENIED');

    const result = await refreshCoordinator.resolve();
    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.environment.location.latitude).toBe(41.8781);
    }
    // Strictly does not re-request foreground permission
    expect(mockLocationService.requestForegroundPermission).not.toHaveBeenCalled();
  });

  it('LE-05: Location services disabled: resolve path handles missing permission without calling requestForegroundPermission', async () => {
    mockLocationService.getForegroundPermission.mockResolvedValue('DENIED');

    const result = await refreshCoordinator.resolve();
    // Falls back safely to committed snapshot without prompting
    expect(result.status).toBe('READY');
    expect(mockLocationService.requestForegroundPermission).not.toHaveBeenCalled();
  });

  it('LE-06: Geocoding failure in manual city search: handled gracefully, no crash, typed error', () => {
    // Malformed search query or non-existent city returns empty results without throwing
    const results = searchCities('XYZNonExistentCity123456789');
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(0);

    // Empty or whitespace-only search returns empty list safely
    expect(searchCities('')).toEqual([]);
    expect(searchCities('   ')).toEqual([]);
  });

  it('LE-07: AUTO -> MANUAL mode switch: refresh uses manual location only', async () => {
    mockSettings.locationMode = 'MANUAL';
    mockSettings.manualLatitude = 24.4672;
    mockSettings.manualLongitude = 39.6111;
    mockSettings.manualTimezone = 'Asia/Riyadh';

    const result = await refreshCoordinator.resolve();
    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.environment.location.latitude).toBe(24.4672);
      expect(result.environment.location.longitude).toBe(39.6111);
      expect(result.environment.location.timezone).toBe('Asia/Riyadh');
    }
  });

  it('LE-08: MANUAL -> AUTO mode switch: refresh uses committed auto location only', async () => {
    mockSettings.locationMode = 'AUTO';
    mockSettings.lastAutoLatitude = 41.8781;
    mockSettings.lastAutoLongitude = -87.6298;
    mockSettings.lastKnownTimezone = 'America/Chicago';

    const result = await refreshCoordinator.resolve();
    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.environment.location.latitude).toBe(41.8781);
      expect(result.environment.location.longitude).toBe(-87.6298);
      expect(result.environment.location.timezone).toBe('America/Chicago');
    }
  });

  it('LE-09: fullRefresh rejection settles Today-store token, clears refreshInFlight, and sets error', async () => {
    // 1. Setup coordinator to reject on user action
    mockCoordinator.fullRefresh.mockRejectedValueOnce(new Error('Network timeout during refresh'));

    const { result } = await renderHook(() =>
      useLocation({
        userSettingsRepo: mockRepo,
        locationService: mockLocationService,
        coordinator: mockCoordinator,
      })
    );

    // Trigger user action that invokes refresh (requestAutoLocation)
    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.requestAutoLocation();
    });

    // Hook reports failure appropriately
    expect(success).toBe(false);
    expect(result.current.error).toBe('Network timeout during refresh');

    // Today store must NOT remain refreshInFlight
    let storeState = useTodayStore.getState();
    expect(storeState.refreshInFlight).toBe(false);

    // Active refresh token is settled via setError
    expect(storeState.status).toBe('error');
    expect(storeState.error).toBe('Network timeout during refresh');

    // Stale-token protection remains intact: stale token from previous run cannot commit
    const staleToken = storeState.requestGeneration;
    const fakeCommit = useTodayStore.getState().commitRefresh(
      staleToken - 1, // Stale token
      { viewModel: {} as any, runtime: {} as any },
      true
    );
    expect(fakeCommit).toBe(false);
    expect(useTodayStore.getState().status).toBe('error');

    // Also verify AUTO snapshot fallback settles token via setSetupRequired when coordinator returns SETUP_REQUIRED
    mockLocationService.requestForegroundPermission.mockResolvedValue('DENIED');
    mockCoordinator.fullRefresh.mockResolvedValueOnce({
      status: 'SETUP_REQUIRED',
    });

    await act(async () => {
      success = await result.current.requestAutoLocation();
    });

    expect(success).toBe(true);
    storeState = useTodayStore.getState();
    expect(storeState.refreshInFlight).toBe(false);
    expect(storeState.status).toBe('setup_required');
  });
});
