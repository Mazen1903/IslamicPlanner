import { create } from 'zustand';
import {
  userSettingsRepository,
  UserSettingsRepository,
} from '@/data/repositories/UserSettingsRepository';

export type OnboardingStatus = 'LOADING' | 'PENDING' | 'COMPLETE' | 'ERROR';

export interface OnboardingStoreState {
  /**
   * Current resolved onboarding status.
   * - LOADING: DB read in flight (initial state on app launch).
   * - PENDING: onboardingCompleted is false or row is absent.
   * - COMPLETE: onboardingCompleted is true.
   * - ERROR: DB infrastructure failure during initialization.
   */
  status: OnboardingStatus;

  /**
   * Reads user_settings.onboardingCompleted from DB and resolves status.
   * Called once from app/_layout.tsx on mount.
   * No row -> PENDING. Row false -> PENDING. Row true -> COMPLETE.
   * DB throw -> ERROR.
   */
  initialize: (repo?: UserSettingsRepository) => Promise<void>;

  /**
   * Re-runs initialization. Called from the ERROR recovery surface.
   * Resets status to LOADING then repeats initialize() logic.
   */
  retry: (repo?: UserSettingsRepository) => Promise<void>;

  /**
   * Synchronously marks status as COMPLETE in-memory.
   * Called by the onboarding screen after OnboardingCoordinator.complete() succeeds.
   * MUST be called BEFORE router.replace() to prevent a gate redirect-back race.
   */
  markComplete: () => void;

  /**
   * Resets store state to initial LOADING (useful for testing).
   */
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStoreState>((set, get) => ({
  status: 'LOADING',

  initialize: async (repo: UserSettingsRepository = userSettingsRepository) => {
    // If already complete in-memory, no-op
    if (get().status === 'COMPLETE') {
      return;
    }

    try {
      const settings = await repo.get();
      if (!settings || !settings.onboardingCompleted) {
        set({ status: 'PENDING' });
      } else {
        set({ status: 'COMPLETE' });
      }
    } catch (err) {
      console.warn('[useOnboardingStore] Failed to initialize onboarding status:', err);
      set({ status: 'ERROR' });
    }
  },

  retry: async (repo: UserSettingsRepository = userSettingsRepository) => {
    set({ status: 'LOADING' });
    try {
      const settings = await repo.get();
      if (!settings || !settings.onboardingCompleted) {
        set({ status: 'PENDING' });
      } else {
        set({ status: 'COMPLETE' });
      }
    } catch (err) {
      console.warn('[useOnboardingStore] Retry failed to load onboarding status:', err);
      set({ status: 'ERROR' });
    }
  },

  markComplete: () => {
    set({ status: 'COMPLETE' });
  },

  reset: () => {
    set({ status: 'LOADING' });
  },
}));
