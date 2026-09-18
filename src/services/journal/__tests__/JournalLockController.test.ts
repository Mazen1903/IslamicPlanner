import { Platform } from 'react-native';
import {
  JournalLockController,
  mapBiometricErrorToMessage,
} from '../JournalLockController';
import { JournalLockPreference } from '../JournalLockPreference';
import { JournalKeyManager } from '../JournalKeyManager';
import {
  LocalAuthenticationAdapter,
  SecurityLevel,
} from '../LocalAuthenticationAdapter';

describe('JournalLockController', () => {
  let mockLockPref: jest.Mocked<JournalLockPreference>;
  let mockKeyManager: jest.Mocked<JournalKeyManager>;
  let mockLocalAuth: jest.Mocked<LocalAuthenticationAdapter>;
  let controller: JournalLockController;

  beforeEach(() => {
    mockLockPref = {
      isEnabled: jest.fn().mockResolvedValue(false),
      setEnabled: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<JournalLockPreference>;

    mockKeyManager = {
      getOrCreateKey: jest.fn(),
      clearMemoryCache: jest.fn(),
    } as unknown as jest.Mocked<JournalKeyManager>;

    mockLocalAuth = {
      hasHardwareAsync: jest.fn().mockResolvedValue(true),
      isEnrolledAsync: jest.fn().mockResolvedValue(true),
      getEnrolledLevelAsync: jest.fn().mockResolvedValue(SecurityLevel.BIOMETRIC_STRONG),
      supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]),
      authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
      cancelAuthenticate: jest.fn().mockResolvedValue(undefined),
    };

    controller = new JournalLockController(
      mockLockPref,
      mockKeyManager,
      mockLocalAuth
    );
  });

  describe('mapBiometricErrorToMessage', () => {
    it('returns null on user_cancel, app_cancel, system_cancel', () => {
      expect(mapBiometricErrorToMessage('user_cancel')).toBeNull();
      expect(mapBiometricErrorToMessage('app_cancel')).toBeNull();
      expect(mapBiometricErrorToMessage('system_cancel')).toBeNull();
      expect(mapBiometricErrorToMessage('user_fallback')).toBeNull();
      expect(mapBiometricErrorToMessage(undefined)).toBeNull();
    });

    it('returns friendly message on failure, lockout, and enrollment errors', () => {
      expect(mapBiometricErrorToMessage('authentication_failed')).toBe(
        'Authentication failed. Please try again.'
      );
      expect(mapBiometricErrorToMessage('lockout')).toBe(
        'Too many failed attempts. Please try again later.'
      );
      expect(mapBiometricErrorToMessage('not_enrolled')).toBe(
        'No biometrics are enrolled on this device. Please set up Face ID or fingerprint in Settings.'
      );
      expect(mapBiometricErrorToMessage('not_available')).toBe(
        'Biometric authentication is not available on this device.'
      );
    });
  });

  describe('Initialization and Focus Checking', () => {
    it('LC-01: lockEnabled = false -> state = "unlocked" immediately', async () => {
      mockLockPref.isEnabled.mockResolvedValueOnce(false);
      const state = await controller.initialize();
      expect(state).toBe('unlocked');
      expect(controller.state).toBe('unlocked');
    });

    it('LC-02: lockEnabled = true -> state = "locked" on fresh start', async () => {
      mockLockPref.isEnabled.mockResolvedValueOnce(true);
      const state = await controller.initialize();
      expect(state).toBe('locked');
      expect(controller.state).toBe('locked');
    });

    it('LC-17: process restart starts locked (sessionUnlocked is in-memory only)', async () => {
      mockLockPref.isEnabled.mockResolvedValue(true);
      const freshController = new JournalLockController(
        mockLockPref,
        mockKeyManager,
        mockLocalAuth
      );
      expect(await freshController.checkOnFocus()).toBe('locked');
    });
  });

  describe('Enable Lock Flow', () => {
    it('LC-03: checks hardware availability and aborts if missing', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValueOnce(false);

      const result = await controller.enableLock();

      expect(result.success).toBe(false);
      expect(result.error).toContain('hardware is not available');
      expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
      expect(mockLockPref.setEnabled).not.toHaveBeenCalled();
    });

    it('LC-04 & LC-08: checks enrollment and aborts if not enrolled', async () => {
      mockLocalAuth.isEnrolledAsync.mockResolvedValueOnce(false);

      const result = await controller.enableLock();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No biometrics are enrolled');
      expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
      expect(mockLockPref.setEnabled).not.toHaveBeenCalled();
    });

    it('LC-05: rejects weak biometrics on Android', async () => {
      const originalOS = Platform.OS;
      Platform.OS = 'android';

      mockLocalAuth.getEnrolledLevelAsync.mockResolvedValueOnce(
        SecurityLevel.BIOMETRIC_WEAK
      );

      const result = await controller.enableLock();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Strong biometric authentication');
      expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
      expect(mockLockPref.setEnabled).not.toHaveBeenCalled();

      Platform.OS = originalOS;
    });

    it('LC-06: successful authentication enables lock and unlocks active session', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({ success: true });

      const result = await controller.enableLock();

      expect(result.success).toBe(true);
      expect(mockLockPref.setEnabled).toHaveBeenCalledWith(true);
      expect(controller.isEnabled).toBe(true);
      expect(controller.state).toBe('unlocked');
      expect(controller.isSessionUnlocked).toBe(true);
    });

    it('LC-07: cancelled authentication does not enable lock', async () => {
      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({
        success: false,
        error: 'user_cancel',
      });

      const result = await controller.enableLock();

      expect(result.success).toBe(false);
      expect(mockLockPref.setEnabled).not.toHaveBeenCalled();
      expect(controller.isEnabled).toBe(false);
    });
  });

  describe('Unlock Flow', () => {
    it('LC-09 & LC-10: unlock prompts user with disableDeviceFallback and unlocks session on success', async () => {
      mockLockPref.isEnabled.mockResolvedValue(true);
      await controller.initialize();
      expect(controller.state).toBe('locked');

      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({ success: true });

      const newState = await controller.unlock();

      expect(newState).toBe('unlocked');
      expect(controller.state).toBe('unlocked');
      expect(controller.isSessionUnlocked).toBe(true);
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          disableDeviceFallback: true,
          promptMessage: 'Unlock Journal',
        })
      );
    });

    it('LC-11: cancelled unlock keeps session locked and sets no error message', async () => {
      mockLockPref.isEnabled.mockResolvedValue(true);
      await controller.initialize();

      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({
        success: false,
        error: 'user_cancel',
      });

      const newState = await controller.unlock();

      expect(newState).toBe('locked');
      expect(controller.state).toBe('locked');
      expect(controller.isSessionUnlocked).toBe(false);
      expect(controller.errorMessage).toBeNull();
    });

    it('LC-12 & LC-18: failed unlock with lockout error sets user-friendly error and stays locked', async () => {
      mockLockPref.isEnabled.mockResolvedValue(true);
      await controller.initialize();

      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({
        success: false,
        error: 'lockout',
      });

      const newState = await controller.unlock();

      expect(newState).toBe('locked');
      expect(controller.errorMessage).toBe(
        'Too many failed attempts. Please try again later.'
      );
    });
  });

  describe('Disable Lock Flow', () => {
    it('LC-15: requires successful biometric auth before disabling lock', async () => {
      mockLockPref.isEnabled.mockResolvedValue(true);
      await controller.initialize();

      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({ success: true });

      const result = await controller.disableLock();

      expect(result.success).toBe(true);
      expect(mockLockPref.setEnabled).toHaveBeenCalledWith(false);
      expect(controller.isEnabled).toBe(false);
      expect(controller.state).toBe('unlocked');
    });

    it('LC-16: cancelled biometric auth prevents disabling lock', async () => {
      mockLockPref.isEnabled.mockResolvedValue(true);
      await controller.initialize();

      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({
        success: false,
        error: 'user_cancel',
      });

      const result = await controller.disableLock();

      expect(result.success).toBe(false);
      expect(mockLockPref.setEnabled).not.toHaveBeenCalled();
      expect(controller.isEnabled).toBe(true);
    });
  });

  describe('Background Relock & Memory Cache Clearing', () => {
    it('LC-13 & LC-14: onBackground relocks session and clears in-memory AES key cache', async () => {
      mockLockPref.isEnabled.mockResolvedValue(true);
      await controller.initialize();

      // Simulate unlocked session
      mockLocalAuth.authenticateAsync.mockResolvedValueOnce({ success: true });
      await controller.unlock();
      expect(controller.state).toBe('unlocked');

      // Trigger background
      controller.onBackground();

      expect(controller.state).toBe('locked');
      expect(controller.isSessionUnlocked).toBe(false);
      expect(mockKeyManager.clearMemoryCache).toHaveBeenCalledTimes(1);
    });

    it('onBackground clears key cache even when lock is disabled', async () => {
      mockLockPref.isEnabled.mockResolvedValue(false);
      await controller.initialize();

      controller.onBackground();

      expect(mockKeyManager.clearMemoryCache).toHaveBeenCalledTimes(1);
      expect(controller.state).toBe('unlocked');
    });
  });
});
