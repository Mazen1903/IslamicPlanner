import { useState, useEffect, useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import type { CityRecord, LocationMode } from '@/domain/location/types';
import { isValidTimezone } from '@/domain/temporal/timezoneUtils';
import {
  UserSettingsRepository,
  userSettingsRepository as defaultUserSettingsRepo,
} from '@/data/repositories/UserSettingsRepository';
import {
  ILocationService,
  locationService as defaultLocationService,
} from '@/services/LocationService';
import {
  PlannerRefreshCoordinator,
} from '@/services/PlannerRefreshCoordinator';
import { useTodayStore } from '@/stores/useTodayStore';

export interface UseLocationOptions {
  userSettingsRepo?: UserSettingsRepository;
  locationService?: ILocationService;
  coordinator?: PlannerRefreshCoordinator;
}

export function useLocation(options: UseLocationOptions = {}) {
  const userSettingsRepo = options.userSettingsRepo ?? defaultUserSettingsRepo;
  const locationService = options.locationService ?? defaultLocationService;
  const defaultCoordinator = useMemo(() => new PlannerRefreshCoordinator(), []);
  const coordinator = options.coordinator ?? defaultCoordinator;

  const [locationMode, setLocationMode] = useState<LocationMode>('AUTO');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentSettings = useCallback(async () => {
    try {
      const settings = await userSettingsRepo.get();
      if (!settings) return;

      const mode = (settings.locationMode as LocationMode) ?? 'AUTO';
      setLocationMode(mode);

      if (mode === 'AUTO') {
        setLatitude(settings.lastAutoLatitude);
        setLongitude(settings.lastAutoLongitude);
        setLocationName(null);
        setTimezone(settings.lastKnownTimezone);
      } else {
        setLatitude(settings.manualLatitude);
        setLongitude(settings.manualLongitude);
        setLocationName(settings.manualLocationName);
        setTimezone(settings.manualTimezone);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load location settings');
    }
  }, [userSettingsRepo]);

  useEffect(() => {
    let active = true;
    userSettingsRepo
      .get()
      .then(settings => {
        if (!active || !settings) return;
        const mode = (settings.locationMode as LocationMode) ?? 'AUTO';
        setLocationMode(mode);
        if (mode === 'AUTO') {
          setLatitude(settings.lastAutoLatitude);
          setLongitude(settings.lastAutoLongitude);
          setLocationName(null);
          setTimezone(settings.lastKnownTimezone);
        } else {
          setLatitude(settings.manualLatitude);
          setLongitude(settings.manualLongitude);
          setLocationName(settings.manualLocationName);
          setTimezone(settings.manualTimezone);
        }
      })
      .catch((err: any) => {
        if (active) {
          setError(err?.message ?? 'Failed to load location settings');
        }
      });

    return () => {
      active = false;
    };
  }, [userSettingsRepo]);

  /**
   * Explicit user action: Request auto location.
   * Prompts for permission, acquires GPS coordinates and device timezone,
   * commits AUTO snapshot to repository, and runs one canonical full refresh.
   *
   * SAFEGUARD 3 (AUTO Mode Switching Determinism):
   * - Request permission only because this is an explicit user action
   * - If permission granted and GPS succeeds: resolve/commit candidate
   * - If GPS fails but committed AUTO snapshot exists: use committed snapshot
   * - If permission denied but committed AUTO snapshot exists: AUTO uses committed snapshot
   * - If no usable committed AUTO snapshot exists: remain in setup flow with manual fallback
   * - Never leave location_mode='AUTO' persisted without usable coordinates
   */
  const requestAutoLocation = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const current = await userSettingsRepo.get();
      const hasAutoSnapshot =
        current !== null &&
        current.lastAutoLatitude !== null &&
        current.lastAutoLongitude !== null &&
        Boolean(current.lastKnownTimezone && isValidTimezone(current.lastKnownTimezone));

      const permission = await locationService.requestForegroundPermission();
      if (permission !== 'GRANTED') {
        if (hasAutoSnapshot) {
          // AUTO mode may use the committed last-known snapshot
          await userSettingsRepo.upsert({ locationMode: 'AUTO' });
          await loadCurrentSettings();

          const token = useTodayStore.getState().startRefresh();
          const result = await coordinator.fullRefresh(DateTime.now());
          if (result.status === 'READY') {
            useTodayStore.getState().commitRefresh(
              token,
              { viewModel: result.viewModel, runtime: result.runtime },
              true
            );
          }
          setIsLoading(false);
          return true;
        }

        setError('Location permission was denied. You can set your location manually.');
        setIsLoading(false);
        return false;
      }

      const coords = await locationService.getCurrentCoordinates();
      const tz = locationService.getDeviceTimezone();

      if (!coords || !tz || !isValidTimezone(tz)) {
        if (hasAutoSnapshot) {
          // GPS failed, but committed AUTO snapshot exists: use committed snapshot
          await userSettingsRepo.upsert({ locationMode: 'AUTO' });
          await loadCurrentSettings();

          const token = useTodayStore.getState().startRefresh();
          const result = await coordinator.fullRefresh(DateTime.now());
          if (result.status === 'READY') {
            useTodayStore.getState().commitRefresh(
              token,
              { viewModel: result.viewModel, runtime: result.runtime },
              true
            );
          }
          setIsLoading(false);
          return true;
        }

        setError('Unable to acquire current location or timezone. You can set your location manually.');
        setIsLoading(false);
        return false;
      }

      // Fresh candidate acquired & verified
      await userSettingsRepo.saveAutoLocation(coords, tz);
      await loadCurrentSettings();

      // Canonical full refresh
      const token = useTodayStore.getState().startRefresh();
      const result = await coordinator.fullRefresh(DateTime.now());
      if (result.status === 'READY') {
        useTodayStore.getState().commitRefresh(
          token,
          { viewModel: result.viewModel, runtime: result.runtime },
          true
        );
      } else {
        useTodayStore.getState().setSetupRequired(token);
      }

      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err?.message ?? 'Failed to set automatic location');
      setIsLoading(false);
      return false;
    }
  }, [coordinator, locationService, userSettingsRepo, loadCurrentSettings]);

  /**
   * Explicit user action: Select a manual city.
   * Validates CityRecord and IANA timezone, persists MANUAL mode + coordinates/name/timezone,
   * and runs one canonical full refresh.
   */
  const setManualLocation = useCallback(
    async (city: CityRecord): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!isValidTimezone(city.timezone)) {
          setError(`Invalid timezone for city: ${city.timezone}`);
          setIsLoading(false);
          return false;
        }

        // Persist MANUAL location
        await userSettingsRepo.saveManualLocation(
          { latitude: city.latitude, longitude: city.longitude },
          city.name,
          city.timezone
        );
        await loadCurrentSettings();

        // Canonical full refresh
        const token = useTodayStore.getState().startRefresh();
        const result = await coordinator.fullRefresh(DateTime.now());
        if (result.status === 'READY') {
          useTodayStore.getState().commitRefresh(
            token,
            { viewModel: result.viewModel, runtime: result.runtime },
            true
          );
        } else {
          useTodayStore.getState().setSetupRequired(token);
        }

        setIsLoading(false);
        return true;
      } catch (err: any) {
        setError(err?.message ?? 'Failed to set manual location');
        setIsLoading(false);
        return false;
      }
    },
    [userSettingsRepo, coordinator, loadCurrentSettings]
  );

  return {
    locationMode,
    latitude,
    longitude,
    locationName,
    timezone,
    isLoading,
    error,
    requestAutoLocation,
    setManualLocation,
    refreshSettings: loadCurrentSettings,
  };
}
