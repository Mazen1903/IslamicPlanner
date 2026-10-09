import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  action?: ToastAction;
  durationMs?: number;
  onCommit?: () => void;
}

export interface ToastStoreState {
  currentToast: ToastItem | null;
  showToast: (params: {
    message: string;
    action?: ToastAction;
    durationMs?: number;
    onCommit?: () => void;
  }) => void;
  hideToast: () => void;
  performAction: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastStoreState>((set, get) => ({
  currentToast: null,

  showToast: ({ message, action, durationMs = 4000, onCommit }) => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    // If an existing toast had a commit callback, commit it before replacing
    const prev = get().currentToast;
    if (prev?.onCommit) {
      try {
        prev.onCommit();
      } catch (err) {
        console.warn('[ToastStore] onCommit callback error:', err);
      }
    }

    const id = `toast-${Date.now()}`;
    const newToast: ToastItem = {
      id,
      message,
      action,
      durationMs,
      onCommit,
    };

    set({ currentToast: newToast });

    toastTimer = setTimeout(() => {
      const active = get().currentToast;
      if (active?.id === id) {
        if (active.onCommit) {
          try {
            active.onCommit();
          } catch (err) {
            console.warn('[ToastStore] onCommit timer callback error:', err);
          }
        }
        set({ currentToast: null });
      }
      toastTimer = null;
    }, durationMs);
  },

  hideToast: () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    const active = get().currentToast;
    if (active?.onCommit) {
      try {
        active.onCommit();
      } catch (err) {
        console.warn('[ToastStore] onCommit hideToast error:', err);
      }
    }
    set({ currentToast: null });
  },

  performAction: () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    const active = get().currentToast;
    if (active?.action) {
      try {
        active.action.onPress();
      } catch (err) {
        console.warn('[ToastStore] Toast action error:', err);
      }
    }
    set({ currentToast: null });
  },
}));
