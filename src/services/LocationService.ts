import * as Location from 'expo-location';
import type { Coordinates } from '@/domain/prayer/types';
import { isValidTimezone } from '@/domain/temporal/timezoneUtils';

export type LocationPermissionStatus = 'GRANTED' | 'DENIED' | 'UNDETERMINED';

export interface ILocationService {
  /**
   * Checks current permission without prompting the user.
   */
  getForegroundPermission(): Promise<LocationPermissionStatus>;

  /**
   * Prompts the user for foreground location permission.
   * MUST ONLY be called in response to explicit user actions.
   */
  requestForegroundPermission(): Promise<LocationPermissionStatus>;

  /**
   * Retrieves current GPS coordinates.
   */
  getCurrentCoordinates(): Promise<Coordinates | null>;

  /**
   * Resolves the device's current system IANA timezone.
   */
  getDeviceTimezone(): string | null;
}

function mapExpoPermission(status: Location.PermissionStatus): LocationPermissionStatus {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'GRANTED';
    case Location.PermissionStatus.DENIED:
      return 'DENIED';
    case Location.PermissionStatus.UNDETERMINED:
    default:
      return 'UNDETERMINED';
  }
}

export class LocationService implements ILocationService {
  async getForegroundPermission(): Promise<LocationPermissionStatus> {
    try {
      const result = await Location.getForegroundPermissionsAsync();
      return mapExpoPermission(result.status);
    } catch {
      return 'DENIED';
    }
  }

  async requestForegroundPermission(): Promise<LocationPermissionStatus> {
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      return mapExpoPermission(result.status);
    } catch {
      return 'DENIED';
    }
  }

  async getCurrentCoordinates(): Promise<Coordinates | null> {
    try {
      // 1. Try last known position first (fastest, typically < 5ms)
      if (typeof Location.getLastKnownPositionAsync === 'function') {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 300000,
        }).catch(() => null);
        if (lastKnown?.coords) {
          return {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
        }
      }

      // 2. Request fresh position with a 4-second timeout to prevent UI freezes
      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const position = await Promise.race([
          positionPromise,
          new Promise<null>((resolve) => {
            timer = setTimeout(() => resolve(null), 4000);
          }),
        ]);
        if (position && 'coords' in position) {
          return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
        return null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    } catch {
      return null;
    }
  }

  getDeviceTimezone(): string | null {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (isValidTimezone(tz)) {
        return tz;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const locationService = new LocationService();
