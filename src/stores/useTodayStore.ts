import { create } from 'zustand';
import type { Prayer } from '@/constants/prayers';
import type {
  TodayViewModel,
  TodayRuntimeContext,
  TodayRefreshResult,
  PrayerTransitionState,
  TodayStoreStatus,
} from '@/services/types';

export interface TodayStoreState {
  // Orchestration output
  viewModel: TodayViewModel | null;
  runtime: TodayRuntimeContext | null;

  // Ephemeral UI state (NEVER reset by data refresh)
  selectedPrayer: Prayer | null;
  prayerTransition: PrayerTransitionState | null;
  completedCollapsed: Record<Prayer, boolean>;
  anytimeCollapsed: boolean;

  // Countdown display
  countdownDisplay: string | null;

  // Loading / setup state
  status: TodayStoreStatus;
  error: string | null;

  // Async state-safety fields
  requestGeneration: number;
  refreshInFlight: boolean;

  // Actions
  startRefresh: () => number;
  commitRefresh: (
    token: number,
    result: TodayRefreshResult,
    syncSelected?: boolean
  ) => boolean;
  startReproject: () => number;
  commitReproject: (token: number, viewModel: TodayViewModel) => boolean;
  setSetupRequired: (token?: number) => void;
  setError: (token: number, errorMessage: string) => boolean;

  setSelectedPrayer: (prayer: Prayer) => void;
  syncSelectedToCurrent: () => void;
  setPrayerTransition: (transition: PrayerTransitionState | null) => void;
  dismissPrayerTransition: () => void;
  setCountdownDisplay: (display: string | null) => void;
  toggleCompletedCollapsed: (prayer: Prayer) => void;
  toggleAnytimeCollapsed: () => void;
  reset: () => void;
}

const initialCompletedCollapsed: Record<Prayer, boolean> = {
  FAJR: true,
  DHUHR: true,
  ASR: true,
  MAGHRIB: true,
  ISHA: true,
};

const initialState = {
  viewModel: null,
  runtime: null,
  selectedPrayer: null,
  prayerTransition: null,
  completedCollapsed: { ...initialCompletedCollapsed },
  anytimeCollapsed: false,
  countdownDisplay: null,
  status: 'idle' as TodayStoreStatus,
  error: null,
  requestGeneration: 0,
  refreshInFlight: false,
};

export const useTodayStore = create<TodayStoreState>((set, get) => ({
  ...initialState,

  startRefresh: () => {
    const nextGeneration = get().requestGeneration + 1;
    set(state => ({
      requestGeneration: nextGeneration,
      refreshInFlight: true,
      status: state.status === 'idle' ? 'loading' : state.status,
    }));
    return nextGeneration;
  },

  commitRefresh: (token, result, syncSelected = false) => {
    if (token !== get().requestGeneration) {
      // Stale refresh result suppressed
      return false;
    }

    set(state => {
      const shouldSync = syncSelected || state.selectedPrayer === null;
      return {
        viewModel: result.viewModel,
        runtime: result.runtime,
        status: 'ready',
        error: null,
        refreshInFlight: false,
        selectedPrayer: shouldSync
          ? result.viewModel.currentPrayer
          : state.selectedPrayer,
      };
    });
    return true;
  },

  startReproject: () => {
    const nextGeneration = get().requestGeneration + 1;
    set({
      requestGeneration: nextGeneration,
    });
    return nextGeneration;
  },

  commitReproject: (token, viewModel) => {
    if (token !== get().requestGeneration) {
      // Stale reprojection result suppressed
      return false;
    }

    set({
      viewModel,
    });
    return true;
  },

  setSetupRequired: token => {
    if (token !== undefined && token !== get().requestGeneration) {
      return;
    }

    set(state => ({
      requestGeneration: state.requestGeneration + 1,
      status: 'setup_required',
      viewModel: null,
      runtime: null,
      refreshInFlight: false,
      error: null,
    }));
  },

  setError: (token, errorMessage) => {
    if (token !== get().requestGeneration) {
      return false;
    }

    set({
      status: 'error',
      error: errorMessage,
      refreshInFlight: false,
    });
    return true;
  },

  setSelectedPrayer: prayer => {
    set({ selectedPrayer: prayer });
  },

  syncSelectedToCurrent: () => {
    const current = get().viewModel?.currentPrayer;
    if (current) {
      set({ selectedPrayer: current });
    }
  },

  setPrayerTransition: transition => {
    set({ prayerTransition: transition });
  },

  dismissPrayerTransition: () => {
    set({ prayerTransition: null });
  },

  setCountdownDisplay: display => {
    set({ countdownDisplay: display });
  },

  toggleCompletedCollapsed: prayer => {
    set(state => ({
      completedCollapsed: {
        ...state.completedCollapsed,
        [prayer]: !state.completedCollapsed[prayer],
      },
    }));
  },

  toggleAnytimeCollapsed: () => {
    set(state => ({
      anytimeCollapsed: !state.anytimeCollapsed,
    }));
  },

  reset: () => {
    set({
      ...initialState,
      completedCollapsed: { ...initialCompletedCollapsed },
    });
  },
}));
