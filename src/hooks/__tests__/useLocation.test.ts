import { renderHook, act } from '@testing-library/react-native';
import { useLocation } from '../useLocation';
import type { UserSettingsRepository, UserSettingsRow } from '@/data/repositories/UserSettingsRepository';
import type { ILocationService } from '@/services/LocationService';
import type { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import type { CityRecord } from '@/domain/location/types';

describe('useLocation Hook', () => {
  let mockSettings: UserSettingsRow;
  let mockRepo: jest.Mocked<UserSettingsRepository>;
  let mockLocationService: jest.Mocked<ILocationService>;
  let mockCoordinator: jest.Mocked<PlannerRefreshCoordinator>;

  beforeEach(() => {
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
      themeMode: 'SYSTEM',
      isPremium: false,
      onboardingCompleted: false,
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
      getCurrentCoordinates: jest.fn().mockResolvedValue({ latitude: 51.5074, longitude: -0.1278 }),
      getDeviceTimezone: jest.fn().mockReturnValue('Europe/London'),
    };

    mockCoordinator = {
      fullRefresh: jest.fn().mockResolvedValue({
        status: 'READY',
        viewModel: {} as any,
        runtime: {} as any,
        horizonSync: {} as any,
      }),
    } as unknown as jest.Mocked<PlannerRefreshCoordinator>;
  });

  it('hydrates initial AUTO location settings', async () => {
    const { result } = await renderHook(() =>
      useLocation({
        userSettingsRepo: mockRepo,
        locationService: mockLocationService,
        coordinator: mockCoordinator,
      })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.locationMode).toBe('AUTO');
    expect(result.current.latitude).toBeCloseTo(41.8781);
    expect(result.current.longitude).toBeCloseTo(-87.6298);
    expect(result.current.timezone).toBe('America/Chicago');
  });

  it('requestAutoLocation prompts user, saves AUTO location, and triggers fullRefresh', async () => {
    const { result } = await renderHook(() =>
      useLocation({
        userSettingsRepo: mockRepo,
        locationService: mockLocationService,
        coordinator: mockCoordinator,
      })
    );

    let success = false;
    await act(async () => {
      success = await result.current.requestAutoLocation();
    });

    expect(success).toBe(true);
    expect(mockLocationService.requestForegroundPermission).toHaveBeenCalledTimes(1);
    expect(mockRepo.saveAutoLocation).toHaveBeenCalledWith(
      { latitude: 51.5074, longitude: -0.1278 },
      'Europe/London'
    );
    expect(mockCoordinator.fullRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.timezone).toBe('Europe/London');
  });

  it('requestAutoLocation handles permission denial gracefully', async () => {
    mockLocationService.requestForegroundPermission.mockResolvedValue('DENIED');

    const { result } = await renderHook(() =>
      useLocation({
        userSettingsRepo: mockRepo,
        locationService: mockLocationService,
        coordinator: mockCoordinator,
      })
    );

    let success = true;
    await act(async () => {
      success = await result.current.requestAutoLocation();
    });

    expect(success).toBe(false);
    expect(mockRepo.saveAutoLocation).not.toHaveBeenCalled();
    expect(mockCoordinator.fullRefresh).not.toHaveBeenCalled();
    expect(result.current.error).toContain('denied');
  });

  it('setManualLocation validates city, persists MANUAL mode, and triggers fullRefresh', async () => {
    const { result } = await renderHook(() =>
      useLocation({
        userSettingsRepo: mockRepo,
        locationService: mockLocationService,
        coordinator: mockCoordinator,
      })
    );

    const city: CityRecord = {
      id: '123',
      name: 'Tokyo',
      countryCode: 'JP',
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
    };

    let success = false;
    await act(async () => {
      success = await result.current.setManualLocation(city);
    });

    expect(success).toBe(true);
    expect(mockRepo.saveManualLocation).toHaveBeenCalledWith(
      { latitude: 35.6762, longitude: 139.6503 },
      'Tokyo',
      'Asia/Tokyo'
    );
    expect(mockCoordinator.fullRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.locationMode).toBe('MANUAL');
    expect(result.current.locationName).toBe('Tokyo');
    expect(result.current.timezone).toBe('Asia/Tokyo');
  });

  it('setManualLocation rejects invalid timezone without updating store', async () => {
    const { result } = await renderHook(() =>
      useLocation({
        userSettingsRepo: mockRepo,
        locationService: mockLocationService,
        coordinator: mockCoordinator,
      })
    );

    const city: CityRecord = {
      id: '999',
      name: 'Nowhere',
      countryCode: 'XX',
      latitude: 0,
      longitude: 0,
      timezone: 'Fake/Timezone',
    };

    let success = true;
    await act(async () => {
      success = await result.current.setManualLocation(city);
    });

    expect(success).toBe(false);
    expect(mockRepo.saveManualLocation).not.toHaveBeenCalled();
    expect(mockCoordinator.fullRefresh).not.toHaveBeenCalled();
    expect(result.current.error).toContain('Invalid timezone');
  });
});
