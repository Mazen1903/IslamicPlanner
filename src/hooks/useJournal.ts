import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  journalService,
  JournalService,
} from '@/services/journal/JournalService';
import {
  journalLockController,
  JournalLockController,
  type LockState,
} from '@/services/journal/JournalLockController';
import {
  JournalAutosaveController,
  createDefaultJournalPayload,
  type SaveState,
} from '@/services/journal/JournalAutosaveController';
import {
  formatGregorianJournalDate,
  formatHijriJournalDate,
  loadUserHijriAdjustmentConfig,
} from '@/services/journal/journalDateUtils';
import type {
  JournalEntryMetadata,
  JournalPayload,
  JournalReflections,
} from '@/domain/journal/types';
import type { HijriAdjustmentConfig } from '@/domain/calendar/types';

export type JournalScreenMode =
  | 'BOOTSTRAPPING'
  | 'SETUP_REQUIRED'
  | 'LOCKED'
  | 'UNLOCKING'
  | 'LOADING_ENTRY'
  | 'READY'
  | 'HISTORY'
  | 'LOAD_ERROR';

export interface UseJournalOptions {
  service?: JournalService;
  lockController?: JournalLockController;
  autosaveController?: JournalAutosaveController;
}

export interface UseJournalReturn {
  mode: JournalScreenMode;
  pinnedPlanningDayKey: string | null;
  activePlanningDayKey: string | null;
  isHistorical: boolean;
  gregorianDisplay: string;
  hijriDisplay: string;
  draftPayload: JournalPayload;
  saveState: SaveState;
  lockEnabled: boolean;
  lockErrorMessage: string | null;
  historyEntries: JournalEntryMetadata[];
  showDeleteDialog: boolean;
  showPrivacySheet: boolean;
  isDeleting: boolean;
  isTogglingLock: boolean;
  hasDayRolledOver: boolean;
  loadError: string | null;
  hijriAdjustment?: HijriAdjustmentConfig;
  // Actions
  onBodyChange: (text: string) => void;
  onReflectionChange: (field: keyof JournalReflections, text: string) => void;
  onHistoryOpen: () => Promise<void>;
  onSelectHistoryEntry: (metadata: JournalEntryMetadata) => Promise<void>;
  onReturnToToday: () => Promise<void>;
  onDeletePress: () => void;
  onDeleteConfirm: () => Promise<void>;
  onDeleteCancel: () => void;
  onUnlockPress: () => Promise<void>;
  onPrivacySheetOpen: () => void;
  onPrivacySheetClose: () => void;
  onToggleLock: () => Promise<void>;
  onRetryLoad: () => Promise<void>;
}

export function useJournal(options: UseJournalOptions = {}): UseJournalReturn {
  const service = options.service ?? journalService;
  const lockController = options.lockController ?? journalLockController;

  const [mode, setMode] = useState<JournalScreenMode>('BOOTSTRAPPING');
  const [pinnedPlanningDayKey, setPinnedPlanningDayKey] = useState<string | null>(null);
  const [activePlanningDayKey, setActivePlanningDayKey] = useState<string | null>(null);
  const [isHistorical, setIsHistorical] = useState<boolean>(false);
  const [draftPayload, setDraftPayload] = useState<JournalPayload>(createDefaultJournalPayload());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lockEnabled, setLockEnabled] = useState<boolean>(false);
  const [lockErrorMessage, setLockErrorMessage] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<JournalEntryMetadata[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isTogglingLock, setIsTogglingLock] = useState<boolean>(false);
  const [hasDayRolledOver, setHasDayRolledOver] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hijriAdjustment, setHijriAdjustment] = useState<HijriAdjustmentConfig | undefined>(undefined);

  // Autosave Controller instance
  const controller = useMemo(
    () =>
      options.autosaveController ??
      new JournalAutosaveController(service, 2000, state => setSaveState(state)),
    [options.autosaveController, service]
  );

  // Track active key in ref for AppState background flush
  const activeKeyRef = useRef(activePlanningDayKey);
  useEffect(() => {
    activeKeyRef.current = activePlanningDayKey;
  }, [activePlanningDayKey]);

  // Load entry for a day
  const loadDayEntry = useCallback(
    async (dayKey: string, asHistorical: boolean) => {
      setMode('LOADING_ENTRY');
      setLoadError(null);

      try {
        const entry = await service.loadEntry(dayKey);
        controller.beginSession(dayKey, entry);
        const initialPayload = entry
          ? { body: entry.payload.body, reflections: { ...entry.payload.reflections } }
          : createDefaultJournalPayload();

        setDraftPayload(initialPayload);
        setActivePlanningDayKey(dayKey);
        setIsHistorical(asHistorical);
        setMode('READY');
      } catch (err: any) {
        setLoadError(err?.message ?? 'Failed to load journal entry');
        setMode('LOAD_ERROR');
      }
    },
    [service, controller]
  );

  // Bootstrap session on focus or initialization
  const bootstrapSession = useCallback(async () => {
    // 1. Load Hijri adjustments
    const adj = await loadUserHijriAdjustmentConfig();
    setHijriAdjustment(adj);

    // 2. Check lock status
    const lockState: LockState = await lockController.checkOnFocus();
    setLockEnabled(lockController.isEnabled);
    setLockErrorMessage(lockController.errorMessage);

    if (lockState === 'locked') {
      setMode('LOCKED');
      return;
    }

    // 3. Resolve pinned planning day key
    const currentKey = await service.getCurrentPlanningDayKey();
    if (!currentKey) {
      setMode('SETUP_REQUIRED');
      return;
    }

    setPinnedPlanningDayKey(currentKey);

    // If day changed during background/idle
    if (activeKeyRef.current && activeKeyRef.current !== currentKey) {
      setHasDayRolledOver(true);
    }

    // Load entry for pinned planning day if not already in a session
    if (!activeKeyRef.current || !isHistorical) {
      await loadDayEntry(currentKey, false);
    }
  }, [lockController, service, loadDayEntry, isHistorical]);

  // Tab focus lifecycle
  useFocusEffect(
    useCallback(() => {
      bootstrapSession();

      return () => {
        // Tab blur: flush any unsaved draft
        controller.flush();
      };
    }, [bootstrapSession, controller])
  );

  // AppState background/active listener
  useEffect(() => {
    let lastState = AppState.currentState;

    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        // App moving to background or inactive
        if (
          (lastState === 'active') &&
          (nextState === 'background' || nextState === 'inactive')
        ) {
          // 1. Flush draft first
          await controller.flush();

          // 2. Lock session and clear memory cache
          lockController.onBackground();

          // 3. If lock enabled, clear decrypted draft state in UI
          if (lockController.isEnabled) {
            setDraftPayload(createDefaultJournalPayload());
            setMode('LOCKED');
          }
        } else if (
          (lastState === 'background' || lastState === 'inactive') &&
          nextState === 'active'
        ) {
          // Returning to foreground
          const lState = await lockController.checkOnFocus();
          setLockEnabled(lockController.isEnabled);

          if (lState === 'locked') {
            setMode('LOCKED');
          } else {
            // Check day boundary rollover
            const newKey = await service.getCurrentPlanningDayKey();
            if (newKey && pinnedPlanningDayKey && newKey !== pinnedPlanningDayKey) {
              setHasDayRolledOver(true);
            }
          }
        }

        lastState = nextState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [controller, lockController, service, pinnedPlanningDayKey]);

  // Body text change
  const onBodyChange = useCallback(
    (text: string) => {
      setDraftPayload(prev => {
        const updated = { ...prev, body: text };
        controller.enqueueEdit(updated);
        return updated;
      });
    },
    [controller]
  );

  // Reflection field change
  const onReflectionChange = useCallback(
    (field: keyof JournalReflections, text: string) => {
      setDraftPayload(prev => {
        const updated = {
          ...prev,
          reflections: {
            ...prev.reflections,
            [field]: text,
          },
        };
        controller.enqueueEdit(updated);
        return updated;
      });
    },
    [controller]
  );

  // History Actions
  const onHistoryOpen = useCallback(async () => {
    await controller.flush();
    try {
      const list = await service.listHistory();
      setHistoryEntries(list);
      setMode('HISTORY');
    } catch {
      setHistoryEntries([]);
      setMode('HISTORY');
    }
  }, [controller, service]);

  const onSelectHistoryEntry = useCallback(
    async (metadata: JournalEntryMetadata) => {
      await controller.flush();
      await loadDayEntry(
        metadata.planningDayKey,
        metadata.planningDayKey !== pinnedPlanningDayKey
      );
    },
    [controller, loadDayEntry, pinnedPlanningDayKey]
  );

  const onReturnToToday = useCallback(async () => {
    await controller.flush();
    if (pinnedPlanningDayKey) {
      await loadDayEntry(pinnedPlanningDayKey, false);
    } else {
      await bootstrapSession();
    }
  }, [controller, pinnedPlanningDayKey, loadDayEntry, bootstrapSession]);

  // Delete Actions
  const onDeletePress = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const onDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await controller.deleteCurrentEntry();
      setShowDeleteDialog(false);

      if (isHistorical) {
        // Return to history or today
        if (pinnedPlanningDayKey) {
          await loadDayEntry(pinnedPlanningDayKey, false);
        }
      } else {
        // Blank editor for today
        setDraftPayload(createDefaultJournalPayload());
      }
    } finally {
      setIsDeleting(false);
    }
  }, [controller, isHistorical, pinnedPlanningDayKey, loadDayEntry]);

  const onDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  // Biometric Unlock
  const onUnlockPress = useCallback(async () => {
    setMode('UNLOCKING');
    const newState = await lockController.unlock();
    setLockErrorMessage(lockController.errorMessage);

    if (newState === 'unlocked') {
      if (pinnedPlanningDayKey) {
        await loadDayEntry(pinnedPlanningDayKey, false);
      } else {
        await bootstrapSession();
      }
    } else {
      setMode('LOCKED');
    }
  }, [lockController, pinnedPlanningDayKey, loadDayEntry, bootstrapSession]);

  // Privacy Sheet Actions
  const onPrivacySheetOpen = useCallback(() => {
    setShowPrivacySheet(true);
  }, []);

  const onPrivacySheetClose = useCallback(() => {
    setShowPrivacySheet(false);
  }, []);

  const onToggleLock = useCallback(async () => {
    setIsTogglingLock(true);
    try {
      if (lockEnabled) {
        const res = await lockController.disableLock();
        if (res.success) {
          setLockEnabled(false);
          setLockErrorMessage(null);
        } else {
          setLockErrorMessage(res.error ?? 'Failed to disable lock');
        }
      } else {
        const res = await lockController.enableLock();
        if (res.success) {
          setLockEnabled(true);
          setLockErrorMessage(null);
        } else {
          setLockErrorMessage(res.error ?? 'Failed to enable lock');
        }
      }
    } finally {
      setIsTogglingLock(false);
    }
  }, [lockEnabled, lockController]);

  const onRetryLoad = useCallback(async () => {
    if (activePlanningDayKey) {
      await loadDayEntry(activePlanningDayKey, isHistorical);
    } else {
      await bootstrapSession();
    }
  }, [activePlanningDayKey, isHistorical, loadDayEntry, bootstrapSession]);

  // Display date formatting
  const displayKey = activePlanningDayKey ?? pinnedPlanningDayKey ?? '';
  const gregorianDisplay = displayKey ? formatGregorianJournalDate(displayKey) : '';
  const hijriDisplay = displayKey ? formatHijriJournalDate(displayKey, hijriAdjustment) : '';

  return {
    mode,
    pinnedPlanningDayKey,
    activePlanningDayKey,
    isHistorical,
    gregorianDisplay,
    hijriDisplay,
    draftPayload,
    saveState,
    lockEnabled,
    lockErrorMessage,
    historyEntries,
    showDeleteDialog,
    showPrivacySheet,
    isDeleting,
    isTogglingLock,
    hasDayRolledOver,
    loadError,
    hijriAdjustment,
    onBodyChange,
    onReflectionChange,
    onHistoryOpen,
    onSelectHistoryEntry,
    onReturnToToday,
    onDeletePress,
    onDeleteConfirm,
    onDeleteCancel,
    onUnlockPress,
    onPrivacySheetOpen,
    onPrivacySheetClose,
    onToggleLock,
    onRetryLoad,
  };
}
