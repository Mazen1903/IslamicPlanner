import { LocationService } from '../LocationService';
import * as Location from 'expo-location';

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  Accuracy: {
    Balanced: 3,
  },
}));

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocationService();
  });

  describe('getForegroundPermission', () => {
    it('returns GRANTED when status is granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
      });

      const status = await service.getForegroundPermission();
      expect(status).toBe('GRANTED');
    });

    it('returns DENIED when status is denied', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
        granted: false,
      });

      const status = await service.getForegroundPermission();
      expect(status).toBe('DENIED');
    });

    it('returns UNDETERMINED when status is undetermined', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.UNDETERMINED,
        granted: false,
      });

      const status = await service.getForegroundPermission();
      expect(status).toBe('UNDETERMINED');
    });

    it('returns DENIED if platform call throws', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Hardware unavailable')
      );

      const status = await service.getForegroundPermission();
      expect(status).toBe('DENIED');
    });
  });

  describe('requestForegroundPermission', () => {
    it('prompts user and returns GRANTED when approved', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
        granted: true,
      });

      const status = await service.requestForegroundPermission();
      expect(status).toBe('GRANTED');
    });

    it('returns DENIED when user denies permission prompt', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
        granted: false,
      });

      const status = await service.requestForegroundPermission();
      expect(status).toBe('DENIED');
    });
  });

  describe('getCurrentCoordinates', () => {
    it('returns coordinates when position is successfully acquired', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 41.8781,
          longitude: -87.6298,
        },
      });

      const coords = await service.getCurrentCoordinates();
      expect(coords).toEqual({
        latitude: 41.8781,
        longitude: -87.6298,
      });
    });

    it('returns null when position acquisition fails', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error('GPS timeout')
      );

      const coords = await service.getCurrentCoordinates();
      expect(coords).toBeNull();
    });
  });

  describe('getDeviceTimezone', () => {
    it('returns resolved IANA timezone when valid', () => {
      const tz = service.getDeviceTimezone();
      expect(typeof tz).toBe('string');
      expect(tz?.length).toBeGreaterThan(0);
    });
  });
});
