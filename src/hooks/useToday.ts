import { useEffect, useRef, useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import { useTodayStore } from '@/stores/useTodayStore';
import {
  todayOrchestrator,
  TodayOrchestrator,
} from '@/services/TodayOrchestrator';
import {
  LocationAwareTodayTemporalInputProvider,
} from '@/services/TodayTemporalInputProvider';
import type {
  TodayTemporalInputProvider,
  TodayRuntimeContext,
} from '@/services/types';
import { taskEngine, TaskEngine } from '@/domain/task/TaskEngine';
import { useAppForeground } from './useAppForeground';
import { usePrayerTimer } from './usePrayerTimer';
import { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import {
  LocationRefreshCoordinator,
  locationRefreshCoordinator as defaultLocationRefreshCoordinator,
} from '@/services/LocationRefreshCoordinator';
import {
  OccurrenceLifecycleService,
} from '@/services/OccurrenceLifecycleService';
import {
  NotificationReconciliationService,
  notificationReconciliationService as defaultNotificationService,
} from '@/services/notification/NotificationReconciliationService';
import { widgetSyncCoordinator } from '@/services/widget/WidgetSyncCoordinator';

export interface UseTodayOptions {
  inputProvider?: TodayTemporalInputProvider;
  orchestrator?: TodayOrchestrator;
  coordinator?: PlannerRefreshCoordinator;
  locationRefreshCoordinator?: LocationRefreshCoordinator;
  lifecycleService?: OccurrenceLifecycleService;
  notificationService?: NotificationReconciliationService;
  engine?: TaskEngine;
  enableTimer?: boolean;
}

export function useToday(options: UseTodayOptions = {}) {
  const defaultProvider = useMemo(() => new LocationAwareTodayTemporalInputProvider(), []);
  const inputProvider = options.inputProvider ?? defaultProvider;
  const orchestrator = options.orchestrator ?? todayOrchestrator;
  const engine = options.engine ?? taskEngine;
  const defaultLifecycle = useMemo(() => new OccurrenceLifecycleService(), []);
  const lifecycleService = options.lifecycleService ?? defaultLifecycle;
  const notificationService = options.notificationService ?? defaultNotificationService;
  const defaultCoordinator = useMemo(
    () => new PlannerRefreshCoordinator(inputProvider, orchestrator, undefined, lifecycleService, notificationService),
    [inputProvider, orchestrator, lifecycleService, notificationService]
  );
  const coordinator = options.coordinator ?? defaultCoordinator;
  const locationRefresh = options.locationRefreshCoordinator ?? defaultLocationRefreshCoordinator;

  const store = useTodayStore();
  const inputProviderRef = useRef(inputProvider);
  const orchestratorRef = useRef(orchestrator);
  const coordinatorRef = useRef(coordinator);
  const locationRefreshRef = useRef(locationRefresh);
  const lifecycleServiceRef = useRef(lifecycleService);
  const notificationServiceRef = useRef(notificationService);
  const engineRef = useRef(engine);

  useEffect(() => {
    inputProviderRef.current = inputProvider;
    orchestratorRef.current = orchestrator;
    coordinatorRef.current = coordinator;
    locationRefreshRef.current = locationRefresh;
    lifecycleServiceRef.current = lifecycleService;
    notificationServiceRef.current = notificationService;
    engineRef.current = engine;
  }, [inputProvider, orchestrator, coordinator, locationRefresh, lifecycleService, notificationService, engine]);

  /**
   * Full refresh executor.
   * syncSelected: true on initial load and app foreground; false on mid-session rollover.
   */
  const performFullRefresh = useCallback(async (syncSelected: boolean = false) => {
    const token = useTodayStore.getState().startRefresh();
    try {
      const now = DateTime.now();

      // 1. Resolve / update effective location environment (AUTO GPS or MANUAL snapshot)
      const locResult = await locationRefreshRef.current.resolve(now);
      if (locResult.status === 'SETUP_REQUIRED') {
        useTodayStore.getState().setSetupRequired(token);
        return;
      }

      // 2. Canonical full refresh pipeline (RecurringHorizonSync -> refreshToday -> sweepExpired)
      const result = await coordinatorRef.current.fullRefresh(now);
      if (result.status === 'SETUP_REQUIRED') {
        useTodayStore.getState().setSetupRequired(token);
        return;
      }

      useTodayStore.getState().commitRefresh(
        token,
        { viewModel: result.viewModel, runtime: result.runtime },
        syncSelected
      );
    } catch (err: any) {
      useTodayStore.getState().setError(token, err?.message ?? 'Failed to refresh Today screen');
    }
  }, []);

  /**
   * Fast-path initial load: skips GPS, uses last committed location snapshot.
   * Renders the Today screen immediately, then fires a background full refresh
   * (with GPS) to catch any location change. Only used on mount.
   */
  const performFastInitialLoad = useCallback(async () => {
    const token = useTodayStore.getState().startRefresh();
    try {
      const now = DateTime.now();

      // Step A: Run the full pipeline using the *last committed* snapshot (no GPS wait).
      // PlannerRefreshCoordinator.fullRefresh reads from DB — already fast.
      const result = await coordinatorRef.current.fullRefresh(now);
      if (result.status === 'SETUP_REQUIRED') {
        useTodayStore.getState().setSetupRequired(token);
        // Still attempt GPS in background so next foreground event works
        locationRefreshRef.current.resolve(now).catch(() => {});
        return;
      }

      // Commit immediately — user sees the Today screen
      useTodayStore.getState().commitRefresh(
        token,
        { viewModel: result.viewModel, runtime: result.runtime },
        true
      );

      // Step B: GPS update in the background. If location changed materially,
      // fire another full refresh (user already has content — no spinner).
      locationRefreshRef.current.resolve(now).then(locResult => {
        if (locResult.status === 'READY' && locResult.changed) {
          // Location changed — re-render with updated prayer times
          performFullRefresh(false);
        }
      }).catch(() => {/* GPS failure is non-fatal */});

    } catch (err: any) {
      useTodayStore.getState().setError(token, err?.message ?? 'Failed to load Today screen');
    }
  }, [performFullRefresh]);


  /**
   * Re-projection executor for prayer-only transitions (M11 §11):
   * 1. obtain/use current temporal inputs
   * 2. lifecycle sweep
   * 3. queryAndProject
   * (No horizon generation)
   */
  const performPrayerTransition = useCallback(
    async (runtime: TodayRuntimeContext, now: DateTime) => {
      const token = useTodayStore.getState().startReproject();
      try {
        const inputResult = await inputProviderRef.current.getInputs();
        if (inputResult.status === 'READY') {
          await lifecycleServiceRef.current.sweepExpired(now, inputResult.inputs);
          // M13: Reconcile reminders after prayer transition sweep
          notificationServiceRef.current.reconcile().catch(err => {
            console.warn('[useToday] Prayer transition notification reconcile failed:', err);
          });
        }
        const vm = await orchestratorRef.current.queryAndProject(runtime, now);
        useTodayStore.getState().commitReproject(token, vm);
        // M18: Sync widgets after prayer transition
        widgetSyncCoordinator.sync().catch(() => {});
      } catch {
        // Leave previous viewModel intact if reprojection failed
      }
    },
    []
  );

  // Initial load — fast path: render immediately with cached location, GPS in background
  useEffect(() => {
    performFastInitialLoad();
  }, [performFastInitialLoad]);

  // App foreground: full refresh and sync selectedPrayer = currentPrayer
  useAppForeground(
    useCallback(() => {
      performFullRefresh(true);
    }, [performFullRefresh])
  );

  // Single 1-second timer: cheap boundary comparison and countdown
  usePrayerTimer({
    onFullRefresh: useCallback(() => {
      performFullRefresh(false);
    }, [performFullRefresh]),
    onPrayerTransition: performPrayerTransition,
    enabled: options.enableTimer !== false,
  });

  // Task completion action
  const completeTask = useCallback(async (occurrenceId: string) => {
    await engineRef.current.completeTask(occurrenceId);
    // M13/M23: Targeted cancellation of completed task reminder (best-effort),
    // followed by best-effort full notification reconciliation to guarantee
    // drain-loop fresh pass if a concurrent stale reconciliation scheduled the occurrence.
    notificationServiceRef.current
      .cancelOccurrenceReminder(occurrenceId)
      .catch(() => {})
      .finally(() => {
        notificationServiceRef.current.reconcile().catch(() => {});
      });

    const runtime = useTodayStore.getState().runtime;
    if (runtime) {
      const token = useTodayStore.getState().startReproject();
      try {
        const now = DateTime.now();
        const vm = await orchestratorRef.current.queryAndProject(runtime, now);
        useTodayStore.getState().commitReproject(token, vm);
      } catch {
        // Leave previous state
      }
    }

    // M18: Best-effort widget synchronization after task completion
    widgetSyncCoordinator.sync().catch(err => {
      console.warn('[useToday] completeTask widget sync failed:', err);
    });
  }, []);

  const viewTransitionPrayer = useCallback(() => {
    useTodayStore.getState().syncSelectedToCurrent();
    useTodayStore.getState().dismissPrayerTransition();
  }, []);

  return {
    viewModel: store.viewModel,
    runtime: store.runtime,
    status: store.status,
    error: store.error,
    selectedPrayer: store.selectedPrayer,
    setSelectedPrayer: store.setSelectedPrayer,
    currentPrayer: store.viewModel?.currentPrayer ?? null,
    prayerTransition: store.prayerTransition,
    dismissPrayerTransition: store.dismissPrayerTransition,
    viewTransitionPrayer,
    completedCollapsed: store.completedCollapsed,
    toggleCompletedCollapsed: store.toggleCompletedCollapsed,
    anytimeCollapsed: store.anytimeCollapsed,
    toggleAnytimeCollapsed: store.toggleAnytimeCollapsed,
    countdownDisplay: store.countdownDisplay,
    completeTask,
    refresh: () => performFullRefresh(false),
  };
}
