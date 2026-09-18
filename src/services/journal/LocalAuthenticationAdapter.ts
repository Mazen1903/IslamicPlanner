import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export {
  AuthenticationType,
  SecurityLevel,
  type LocalAuthenticationOptions,
  type LocalAuthenticationResult,
  type LocalAuthenticationError,
} from 'expo-local-authentication';

export interface LocalAuthenticationAdapter {
  hasHardwareAsync(): Promise<boolean>;
  isEnrolledAsync(): Promise<boolean>;
  getEnrolledLevelAsync(): Promise<LocalAuthentication.SecurityLevel>;
  supportedAuthenticationTypesAsync(): Promise<LocalAuthentication.AuthenticationType[]>;
  authenticateAsync(
    options?: LocalAuthentication.LocalAuthenticationOptions
  ): Promise<LocalAuthentication.LocalAuthenticationResult>;
  cancelAuthenticate(): Promise<void>;
}

export class ExpoLocalAuthenticationAdapter implements LocalAuthenticationAdapter {
  async hasHardwareAsync(): Promise<boolean> {
    return LocalAuthentication.hasHardwareAsync();
  }

  async isEnrolledAsync(): Promise<boolean> {
    return LocalAuthentication.isEnrolledAsync();
  }

  async getEnrolledLevelAsync(): Promise<LocalAuthentication.SecurityLevel> {
    return LocalAuthentication.getEnrolledLevelAsync();
  }

  async supportedAuthenticationTypesAsync(): Promise<LocalAuthentication.AuthenticationType[]> {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  }

  async authenticateAsync(
    options?: LocalAuthentication.LocalAuthenticationOptions
  ): Promise<LocalAuthentication.LocalAuthenticationResult> {
    return LocalAuthentication.authenticateAsync(options);
  }

  async cancelAuthenticate(): Promise<void> {
    if (Platform.OS === 'android' && typeof LocalAuthentication.cancelAuthenticate === 'function') {
      await LocalAuthentication.cancelAuthenticate();
    }
  }
}

export const localAuthenticationAdapter = new ExpoLocalAuthenticationAdapter();
