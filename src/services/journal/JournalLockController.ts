import { Platform } from 'react-native';
import {
  journalLockPreference,
  JournalLockPreference,
} from './JournalLockPreference';
import {
  journalKeyManager,
  JournalKeyManager,
} from './JournalKeyManager';
import {
  localAuthenticationAdapter,
  LocalAuthenticationAdapter,
  SecurityLevel,
  type LocalAuthenticationOptions,
  type LocalAuthenticationError,
} from './LocalAuthenticationAdapter';

export type LockState = 'unlocked' | 'locked' | 'unlocking';

export interface EnableLockResult {
  success: boolean;
  error?: string;
}

export interface DisableLockResult {
  success: boolean;
  error?: string;
}

/**
 * Maps LocalAuthentication error strings to calm, user-friendly messages.
 * Never displays raw error codes or alarms the user.
 */
export function mapBiometricErrorToMessage(
  error?: LocalAuthenticationError | string
): string | null {
  if (!error) return null;

  switch (error) {
    case 'user_cancel':
    case 'app_cancel':
    case 'system_cancel':
    case 'user_fallback':
      return null;
    case 'authentication_failed':
      return 'Authentication failed. Please try again.';
    case 'lockout':
      return 'Too many failed attempts. Please try again later.';
    case 'not_enrolled':
      return 'No biometrics are enrolled on this device. Please set up Face ID or fingerprint in Settings.';
    case 'not_available':
      return 'Biometric authentication is not available on this device.';
    default:
      return 'Authentication was not successful. Please try again.';
  }
}

/**
 * Pure session gate controller for Journal privacy.
 *
 * Invariants:
 * - Biometrics are ONLY a session gate; never derived into or bound to the AES key.
 * - AES-256-GCM encryption remains active regardless of biometric lock status.
 * - Process restart starts locked when lock is enabled; sessionUnlocked is never persisted.
 * - Android biometrics requires strong security level (BIOMETRIC_STRONG).
 * - Disabling lock requires successful biometric authentication if currently enabled.
 * - On app background: clears in-memory key cache and marks session locked.
 */
export class JournalLockController {
  private _state: LockState = 'unlocked';
  private _sessionUnlocked: boolean = false;
  private _lockEnabled: boolean = false;
  private _errorMessage: string | null = null;

  constructor(
    private readonly lockPref: JournalLockPreference = journalLockPreference,
    private readonly keyManager: JournalKeyManager = journalKeyManager,
    private readonly localAuth: LocalAuthenticationAdapter = localAuthenticationAdapter
  ) {}

  get state(): LockState {
    return this._state;
  }

  get isEnabled(): boolean {
    return this._lockEnabled;
  }

  get isSessionUnlocked(): boolean {
    return this._sessionUnlocked;
  }

  get errorMessage(): string | null {
    return this._errorMessage;
  }

  /**
   * Builds biometric authentication options matching platform policy:
   * - disableDeviceFallback: true (no PIN/passcode fallback)
   * - biometricsSecurityLevel: 'strong' on Android
   * - fallbackLabel: '' on iOS to suppress device passcode button
   */
  private getAuthOptions(promptMessage: string): LocalAuthenticationOptions {
    const options: LocalAuthenticationOptions = {
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    };

    if (Platform.OS === 'android') {
      options.biometricsSecurityLevel = 'strong';
    } else if (Platform.OS === 'ios') {
      options.fallbackLabel = '';
    }

    return options;
  }

  /**
   * Initializes controller by reading persisted preference.
   * Call once on app/tab bootstrap.
   */
  async initialize(): Promise<LockState> {
    this._lockEnabled = await this.lockPref.isEnabled();
    if (this._lockEnabled && !this._sessionUnlocked) {
      this._state = 'locked';
    } else {
      this._state = 'unlocked';
    }
    return this._state;
  }

  /**
   * Evaluates lock state when Journal tab gains focus.
   */
  async checkOnFocus(): Promise<LockState> {
    this._lockEnabled = await this.lockPref.isEnabled();
    if (this._lockEnabled && !this._sessionUnlocked) {
      this._state = 'locked';
    } else {
      this._state = 'unlocked';
    }
    return this._state;
  }

  /**
   * Prompts user for biometric authentication to unlock active session.
   */
  async unlock(): Promise<LockState> {
    if (!this._lockEnabled) {
      this._state = 'unlocked';
      this._errorMessage = null;
      return 'unlocked';
    }

    this._state = 'unlocking';
    this._errorMessage = null;

    try {
      const options = this.getAuthOptions('Unlock Journal');
      const result = await this.localAuth.authenticateAsync(options);

      if (result.success) {
        this._sessionUnlocked = true;
        this._state = 'unlocked';
        this._errorMessage = null;
        return 'unlocked';
      }

      this._sessionUnlocked = false;
      this._state = 'locked';
      this._errorMessage = mapBiometricErrorToMessage(
        'error' in result ? result.error : undefined
      );
      return 'locked';
    } catch {
      this._sessionUnlocked = false;
      this._state = 'locked';
      this._errorMessage = 'Authentication failed. Please try again.';
      return 'locked';
    }
  }

  /**
   * Locks current session and wipes AES key from memory.
   */
  lock(): void {
    this._sessionUnlocked = false;
    if (this._lockEnabled) {
      this._state = 'locked';
    }
    this.keyManager.clearMemoryCache();
  }

  /**
   * Enables Journal Lock:
   * 1. Verifies hardware exists
   * 2. Verifies biometrics are enrolled
   * 3. Verifies enrolled security level is strong (no weak biometrics on Android)
   * 4. Prompts for biometric authentication
   * 5. Only on success, persists preference and unlocks session
   */
  async enableLock(): Promise<EnableLockResult> {
    try {
      const hasHardware = await this.localAuth.hasHardwareAsync();
      if (!hasHardware) {
        return {
          success: false,
          error: 'Biometric hardware is not available on this device.',
        };
      }

      const isEnrolled = await this.localAuth.isEnrolledAsync();
      if (!isEnrolled) {
        return {
          success: false,
          error:
            'No biometrics are enrolled on this device. Please set up Face ID or fingerprint in Settings.',
        };
      }

      const level = await this.localAuth.getEnrolledLevelAsync();
      if (
        Platform.OS === 'android' &&
        level !== SecurityLevel.BIOMETRIC_STRONG
      ) {
        return {
          success: false,
          error:
            'Strong biometric authentication (Class 3) is required to lock Journal.',
        };
      }

      const options = this.getAuthOptions('Unlock Journal');
      const result = await this.localAuth.authenticateAsync(options);

      if (!result.success) {
        return {
          success: false,
          error:
            mapBiometricErrorToMessage(
              'error' in result ? result.error : undefined
            ) ?? 'Authentication was cancelled.',
        };
      }

      await this.lockPref.setEnabled(true);
      this._lockEnabled = true;
      this._sessionUnlocked = true;
      this._state = 'unlocked';
      this._errorMessage = null;

      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Failed to enable Journal lock. Please try again.',
      };
    }
  }

  /**
   * Disables Journal Lock:
   * Requires successful biometric authentication before turning lock off.
   */
  async disableLock(): Promise<DisableLockResult> {
    try {
      if (this._lockEnabled) {
        const options = this.getAuthOptions('Unlock Journal');
        const result = await this.localAuth.authenticateAsync(options);

        if (!result.success) {
          return {
            success: false,
            error:
              mapBiometricErrorToMessage(
                'error' in result ? result.error : undefined
              ) ?? 'Authentication was cancelled.',
          };
        }
      }

      await this.lockPref.setEnabled(false);
      this._lockEnabled = false;
      this._sessionUnlocked = true;
      this._state = 'unlocked';
      this._errorMessage = null;

      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Failed to disable Journal lock. Please try again.',
      };
    }
  }

  /**
   * Called when app enters background or inactive state.
   * Locks session and wipes memory key cache.
   */
  onBackground(): void {
    if (this._lockEnabled) {
      this._sessionUnlocked = false;
      this._state = 'locked';
    }
    this.keyManager.clearMemoryCache();
  }
}

export const journalLockController = new JournalLockController();
