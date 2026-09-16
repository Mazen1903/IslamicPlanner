import { useEffect, useRef, useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import { useTodayStore } from '@/stores/useTodayStore';
import {
  todayOrchestrator,
  TodayOrchestrator,
} from '@/services/TodayOrchestrator';
import {
  M7BootstrapInputProvider,
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
  OccurrenceLifecycleService,
} from '@/services/OccurrenceLifecycleService';

export interface UseTodayOptions {
  inputProvider?: TodayTemporalInputProvider;
  orchestrator?: TodayOrchestrator;
  coordinator?: PlannerRefreshCoordinator;
  lifecycleService?: OccurrenceLifecycleService;
  engine?: TaskEngine;
  enableTimer?: boolean;
}

export function useToday(options: UseTodayOptions = {}) {
  const defaultProvider = useMemo(() => new M7BootstrapInputProvider(), []);
  const inputProvider = options.inputProvider ?? defaultProvider;
  const orchestrator = options.orchestrator ?? todayOrchestrator;
  const engine = options.engine ?? taskEngine;
  const defaultLifecycle = useMemo(() => new OccurrenceLifecycleService(), []);
  const lifecycleService = options.lifecycleService ?? defaultLifecycle;
  const defaultCoordinator = useMemo(
    () => new PlannerRefreshCoordinator(inputProvider, orchestrator, undefined, lifecycleService),
    [inputProvider, orchestrator, lifecycleService]
  );
  const coordinator = options.coordinator ?? defaultCoordinator;

  const store = useTodayStore();
  const inputProviderRef = useRef(inputProvider);
  const orchestratorRef = useRef(orchestrator);
  const coordinatorRef = useRef(coordinator);
  const lifecycleServiceRef = useRef(lifecycleService);
  const engineRef = useRef(engine);

  useEffect(() => {
    inputProviderRef.current = inputProvider;
    orchestratorRef.current = orchestrator;
    coordinatorRef.current = coordinator;
    lifecycleServiceRef.current = lifecycleService;
    engineRef.current = engine;
  }, [inputProvider, orchestrator, coordinator, lifecycleService, engine]);

  /**
   * Full refresh executor.
   * syncSelected: true on initial load and app foreground; false on mid-session rollover.
   */
  const performFullRefresh = useCallback(async (syncSelected: boolean = false) => {
    const token = useTodayStore.getState().startRefresh();
    try {
      const now = DateTime.now();
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
        }
        const vm = await orchestratorRef.current.queryAndProject(runtime, now);
        useTodayStore.getState().commitReproject(token, vm);
      } catch {
        // Leave previous viewModel intact if reprojection failed
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    performFullRefresh(true);
  }, [performFullRefresh]);

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
