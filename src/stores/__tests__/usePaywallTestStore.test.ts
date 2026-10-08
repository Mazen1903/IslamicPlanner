import { act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { usePaywallTestStore, PAYWALL_BYPASS_KEY } from '../usePaywallTestStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('usePaywallTestStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePaywallTestStore.getState().resetForTesting();
  });

  it('defaults bypassPaywall to false in test environment', () => {
    expect(usePaywallTestStore.getState().bypassPaywall).toBe(false);
  });

  it('updates bypassPaywall and persists to SecureStore on setBypassPaywall', async () => {
    await act(async () => {
      await usePaywallTestStore.getState().setBypassPaywall(true);
    });

    expect(usePaywallTestStore.getState().bypassPaywall).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(PAYWALL_BYPASS_KEY, 'true');

    await act(async () => {
      await usePaywallTestStore.getState().setBypassPaywall(false);
    });

    expect(usePaywallTestStore.getState().bypassPaywall).toBe(false);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(PAYWALL_BYPASS_KEY, 'false');
  });

  it('loads persisted bypass preference from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('true');

    await act(async () => {
      await usePaywallTestStore.getState().loadBypassPreference();
    });

    expect(usePaywallTestStore.getState().bypassPaywall).toBe(true);
    expect(usePaywallTestStore.getState().isLoaded).toBe(true);
  });

  it('handles null return from SecureStore gracefully', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

    await act(async () => {
      await usePaywallTestStore.getState().loadBypassPreference();
    });

    expect(usePaywallTestStore.getState().bypassPaywall).toBe(false);
    expect(usePaywallTestStore.getState().isLoaded).toBe(true);
  });

  it('handles SecureStore errors gracefully without throwing', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage failure'));

    await act(async () => {
      await usePaywallTestStore.getState().loadBypassPreference();
    });

    expect(usePaywallTestStore.getState().isLoaded).toBe(true);
  });
});
