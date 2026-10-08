import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const PAYWALL_BYPASS_KEY = 'paywall_test_bypass_v1';

export interface PaywallTestState {
  bypassPaywall: boolean;
  isLoaded: boolean;
  setBypassPaywall: (bypassed: boolean) => Promise<void>;
  loadBypassPreference: () => Promise<void>;
  resetForTesting: () => void;
}

const getDefaultBypass = (): boolean => {
  return process.env.NODE_ENV === 'test' ? false : true;
};

export const usePaywallTestStore = create<PaywallTestState>((set, get) => ({
  bypassPaywall: getDefaultBypass(),
  isLoaded: false,

  setBypassPaywall: async (bypassed: boolean) => {
    set({ bypassPaywall: bypassed });
    try {
      await SecureStore.setItemAsync(PAYWALL_BYPASS_KEY, String(bypassed));
    } catch (err) {
      console.warn('[usePaywallTestStore] Failed to persist bypass preference:', err);
    }
  },

  loadBypassPreference: async () => {
    try {
      const val = await SecureStore.getItemAsync(PAYWALL_BYPASS_KEY);
      if (val !== null) {
        set({ bypassPaywall: val === 'true', isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  resetForTesting: () => {
    set({
      bypassPaywall: getDefaultBypass(),
      isLoaded: false,
    });
  },
}));
