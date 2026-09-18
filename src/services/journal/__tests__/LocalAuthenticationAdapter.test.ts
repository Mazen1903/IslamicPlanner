import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { ExpoLocalAuthenticationAdapter } from '../LocalAuthenticationAdapter';

describe('ExpoLocalAuthenticationAdapter', () => {
  let adapter: ExpoLocalAuthenticationAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ExpoLocalAuthenticationAdapter();
  });

  it('delegates hasHardwareAsync to expo-local-authentication', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(true);
    expect(await adapter.hasHardwareAsync()).toBe(true);
    expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalledTimes(1);
  });

  it('delegates isEnrolledAsync to expo-local-authentication', async () => {
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValueOnce(true);
    expect(await adapter.isEnrolledAsync()).toBe(true);
    expect(LocalAuthentication.isEnrolledAsync).toHaveBeenCalledTimes(1);
  });

  it('delegates getEnrolledLevelAsync to expo-local-authentication', async () => {
    (LocalAuthentication.getEnrolledLevelAsync as jest.Mock).mockResolvedValueOnce(3);
    expect(await adapter.getEnrolledLevelAsync()).toBe(3);
    expect(LocalAuthentication.getEnrolledLevelAsync).toHaveBeenCalledTimes(1);
  });

  it('delegates supportedAuthenticationTypesAsync to expo-local-authentication', async () => {
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValueOnce([1, 2]);
    expect(await adapter.supportedAuthenticationTypesAsync()).toEqual([1, 2]);
    expect(LocalAuthentication.supportedAuthenticationTypesAsync).toHaveBeenCalledTimes(1);
  });

  it('delegates authenticateAsync with options to expo-local-authentication', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({ success: true });
    const opts = { promptMessage: 'Test prompt', disableDeviceFallback: true };
    const res = await adapter.authenticateAsync(opts);

    expect(res).toEqual({ success: true });
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(opts);
  });

  it('cancelAuthenticate calls underlying API on android', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'android';

    await adapter.cancelAuthenticate();
    expect(LocalAuthentication.cancelAuthenticate).toHaveBeenCalledTimes(1);

    Platform.OS = originalOS;
  });

  it('cancelAuthenticate is a safe no-op on iOS', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';

    await adapter.cancelAuthenticate();
    expect(LocalAuthentication.cancelAuthenticate).not.toHaveBeenCalled();

    Platform.OS = originalOS;
  });
});
