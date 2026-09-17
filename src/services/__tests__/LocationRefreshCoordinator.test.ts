import { LocationRefreshCoordinator } from '../LocationRefreshCoordinator';
import type { ILocationService } from '../LocationService';
import type { UserSettingsRepository, UserSettingsRow } from '@/data/repositories/UserSettingsRepository';
import type { Coordinates } from '@/domain/prayer/types';

describe('LocationRefreshCoordinator', () => {
  let mockSettings: UserSettingsRow | null = null;
  let mockRepo: jest.Mocked<UserSettingsRepository>;
  let mockLocationService: jest.Mocked<ILocationService>;
  let coordinator: LocationRefreshCoordinator;

  beforeEach(() => {
    mockSettings = {
      id: 'default',
      locationMode: 'AUTO',
      manualLatitude: null,
      manualLongitude: null,
      manualLocationName: null,
      manualTimezone: null,
      lastKnownTimezone: null,
      lastAutoLatitude: null,
      lastAutoLongitude: null,
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
        mockSettings = { ...mockSettings!, ...patch } as UserSettingsRow;
        return mockSettings;
      }),
      saveAutoLocation: jest.fn().mockImplementation(async (coords: Coordinates, tz: string) => {
        mockSettings = {
          ...mockSettings!,
          locationMode: 'AUTO',
          lastAutoLatitude: coords.latitude,
          lastAutoLongitude: coords.longitude,
          lastKnownTimezone: tz,
        } as UserSettingsRow;
      }),
      saveManualLocation: jest.fn(),
      updateLastKnownTimezone: jest.fn(),
    } as unknown as jest.Mocked<UserSettingsRepository>;

    mockLocationService = {
      getForegroundPermission: jest.fn().mockResolvedValue('GRANTED'),
      requestForegroundPermission: jest.fn(),
      getCurrentCoordinates: jest.fn().mockResolvedValue({ latitude: 41.8781, longitude: -87.6298 }),
      getDeviceTimezone: jest.fn().mockReturnValue('America/Chicago'),
    };

    coordinator = new LocationRefreshCoordinator(mockRepo, mockLocationService);
  });

  describe('Non-prompting Permission Contract', () => {
    it('strictly calls getForegroundPermission and NEVER calls requestForegroundPermission during ordinary resolve', async () => {
      await coordinator.resolve();

      expect(mockLocationService.getForegroundPermission).toHaveBeenCalledTimes(1);
      expect(mockLocationService.requestForegroundPermission).not.toHaveBeenCalled();
    });
  });

  describe('Unconfigured & First-Run Fallbacks', () => {
    it('returns SETUP_REQUIRED when permission is denied and no committed AUTO snapshot exists', async () => {
      mockLocationService.getForegroundPermission.mockResolvedValue('DENIED');

      const result = await coordinator.resolve();
      expect(result.status).toBe('SETUP_REQUIRED');
    });

    it('returns SETUP_REQUIRED when GPS fails and no committed AUTO snapshot exists', async () => {
      mockLocationService.getCurrentCoordinates.mockResolvedValue(null);

      const result = await coordinator.resolve();
      expect(result.status).toBe('SETUP_REQUIRED');
    });

    it('returns SETUP_REQUIRED when device timezone is invalid and no committed AUTO snapshot exists', async () => {
      mockLocationService.getDeviceTimezone.mockReturnValue('Invalid/Timezone');

      const result = await coordinator.resolve();
      expect(result.status).toBe('SETUP_REQUIRED');
    });
  });

  describe('Committed Snapshot Fallback on Failure', () => {
    beforeEach(() => {
      // Pre-commit valid AUTO snapshot
      mockSettings!.lastAutoLatitude = 41.8781;
      mockSettings!.lastAutoLongitude = -87.6298;
      mockSettings!.lastKnownTimezone = 'America/Chicago';
    });

    it('uses committed AUTO snapshot when permission is denied/revoked', async () => {
      mockLocationService.getForegroundPermission.mockResolvedValue('DENIED');

      const result = await coordinator.resolve();
      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.changed).toBe(false);
        expect(result.environment.location.latitude).toBeCloseTo(41.8781);
        expect(result.environment.location.timezone).toBe('America/Chicago');
      }
    });

    it('uses committed AUTO snapshot when GPS coordinates fail/timeout', async () => {
      mockLocationService.getCurrentCoordinates.mockResolvedValue(null);

      const result = await coordinator.resolve();
      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.changed).toBe(false);
        expect(result.environment.location.latitude).toBeCloseTo(41.8781);
      }
    });
  });

  describe('Jitter Suppression & Material Change', () => {
    beforeEach(() => {
      mockSettings!.lastAutoLatitude = 41.8781;
      mockSettings!.lastAutoLongitude = -87.6298;
      mockSettings!.lastKnownTimezone = 'America/Chicago';
    });

    it('discards candidate observation < 10 km: does NOT persist, does NOT return candidate, returns committed', async () => {
      // 3 km movement within Chicago
      const jitterCoords = { latitude: 41.8981, longitude: -87.6298 };
      mockLocationService.getCurrentCoordinates.mockResolvedValue(jitterCoords);
      mockLocationService.getDeviceTimezone.mockReturnValue('America/Chicago');

      const result = await coordinator.resolve();
      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.changed).toBe(false);
        // Effective coordinates are the COMMITTED ones, NOT the jitter candidate
        expect(result.environment.location.latitude).toBeCloseTo(41.8781);
        expect(result.environment.location.longitude).toBeCloseTo(-87.6298);
      }

      // Candidate was NOT saved to database
      expect(mockRepo.saveAutoLocation).not.toHaveBeenCalled();
    });

    it('commits candidate when movement >= 10 km and returns changed: true', async () => {
      // Rockford, IL is ~120 km from Chicago
      const newCityCoords = { latitude: 42.2711, longitude: -89.094 };
      mockLocationService.getCurrentCoordinates.mockResolvedValue(newCityCoords);
      mockLocationService.getDeviceTimezone.mockReturnValue('America/Chicago');

      const result = await coordinator.resolve();
      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.changed).toBe(true);
        expect(result.environment.location.latitude).toBeCloseTo(42.2711);
        expect(result.environment.location.longitude).toBeCloseTo(-89.094);
      }

      expect(mockRepo.saveAutoLocation).toHaveBeenCalledWith(newCityCoords, 'America/Chicago');
    });

    it('commits candidate when timezone identity changes even if coordinates are close', async () => {
      // Timezone changes to New York
      mockLocationService.getDeviceTimezone.mockReturnValue('America/New_York');

      const result = await coordinator.resolve();
      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.changed).toBe(true);
        expect(result.environment.location.timezone).toBe('America/New_York');
      }

      expect(mockRepo.saveAutoLocation).toHaveBeenCalledWith(
        { latitude: 41.8781, longitude: -87.6298 },
        'America/New_York'
      );
    });
  });

  describe('MANUAL Mode Isolation', () => {
    beforeEach(() => {
      mockSettings!.locationMode = 'MANUAL';
      mockSettings!.manualLatitude = 24.4672;
      mockSettings!.manualLongitude = 39.6111;
      mockSettings!.manualLocationName = 'Medina';
      mockSettings!.manualTimezone = 'Asia/Riyadh';

      // Also set some old auto values
      mockSettings!.lastAutoLatitude = 41.8781;
      mockSettings!.lastAutoLongitude = -87.6298;
      mockSettings!.lastKnownTimezone = 'America/Chicago';
    });

    it('returns manual location without polling GPS hardware and returns changed: false', async () => {
      const result = await coordinator.resolve();

      expect(result.status).toBe('READY');
      if (result.status === 'READY') {
        expect(result.changed).toBe(false);
        expect(result.environment.location.source).toBe('MANUAL');
        expect(result.environment.location.cityName).toBe('Medina');
        expect(result.environment.location.latitude).toBeCloseTo(24.4672);
        expect(result.environment.location.timezone).toBe('Asia/Riyadh');
      }

      // No GPS hardware polled
      expect(mockLocationService.getForegroundPermission).not.toHaveBeenCalled();
      expect(mockLocationService.getCurrentCoordinates).not.toHaveBeenCalled();
    });

    it('returns SETUP_REQUIRED if manual mode lacks valid coordinates or timezone', async () => {
      mockSettings!.manualLatitude = null;

      const result = await coordinator.resolve();
      expect(result.status).toBe('SETUP_REQUIRED');
    });
  });
});
