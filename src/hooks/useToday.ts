import { Alert } from 'react-native';
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
  TaskCardViewModel,
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
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskFormSyncService } from '@/features/task-form/syncService';
import type { Prayer } from '@/constants/prayers';
import type { ScheduleConfig } from '@/domain/task/types';

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

  const performFullRefreshRef = useRef<(syncSelected?: boolean) => Promise<void>>(async () => {});

  /**
   * Full refresh executor.
   * syncSelected: true on initial load and app foreground; false on mid-session rollover.
   * Uses optimistic fast-path with committed location first, checking GPS in background.
   */
  const performFullRefresh = useCallback(async (syncSelected: boolean = false) => {
    const token = useTodayStore.getState().startRefresh();
    try {
      const now = DateTime.now();

      // Step 1: Fast-path: Check if committed location in DB is already READY (no GPS wait)
      const cachedResult = await coordinatorRef.current.fullRefresh(now);
      if (cachedResult.status === 'READY') {
        useTodayStore.getState().commitRefresh(
          token,
          { viewModel: cachedResult.viewModel, runtime: cachedResult.runtime },
          syncSelected
        );

        // Step 2: Background GPS check for material location change (non-blocking)
        locationRefreshRef.current
          .resolve(now)
          .then(locResult => {
            if (locResult.status === 'READY' && locResult.changed) {
              // Location changed materially — re-run to update prayer times
              performFullRefreshRef.current(false);
            }
          })
          .catch(() => {});
        return;
      }

      // Step 3: If committed location was missing (SETUP_REQUIRED), resolve location
      const locResult = await locationRefreshRef.current.resolve(now);
      if (locResult.status === 'SETUP_REQUIRED') {
        useTodayStore.getState().setSetupRequired(token);
        return;
      }

      // Retry canonical full refresh pipeline with newly resolved location
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

  useEffect(() => {
    performFullRefreshRef.current = performFullRefresh;
  }, [performFullRefresh]);

  /**
   * Fast-path initial load: delegates to performFullRefresh with syncSelected=true.
   */
  const performFastInitialLoad = useCallback(async () => {
    await performFullRefresh(true);
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

  // Task undo completion action
  const uncompleteTask = useCallback(async (occurrenceId: string) => {
    await engineRef.current.uncompleteTask(occurrenceId);
    notificationServiceRef.current.reconcile().catch(() => {});

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

    widgetSyncCoordinator.sync().catch(err => {
      console.warn('[useToday] uncompleteTask widget sync failed:', err);
    });
  }, []);

  const toggleSubtask = useCallback(async (occurrenceId: string, subtaskId: string) => {
    try {
      const occ = await taskOccurrenceRepository.findById(occurrenceId);
      if (!occ) return;
      const completedIds = occ.overrideData?.completedSubtaskIds ?? [];
      const isCompleted = completedIds.includes(subtaskId);
      await engineRef.current.toggleSubtaskCompletion(occurrenceId, subtaskId, !isCompleted);

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
    } catch (err) {
      console.warn('[useToday] toggleSubtask failed:', err);
    }
  }, []);

  const rescheduleTask = useCallback(
    async (task: TaskCardViewModel, targetPrayer: Prayer, scheduleConfig: ScheduleConfig) => {
      try {
        const preDef = await taskDefinitionRepository.findById(task.taskDefinitionId);
        if (!preDef) return;

        const isRecurring = Boolean(preDef.recurrenceRule || preDef.hijriRecurrence);

        if (isRecurring) {
          // For recurring tasks, only update this occurrence's placement
          // instead of modifying the entire series definition
          const occ = await taskOccurrenceRepository.findById(task.occurrenceId);
          if (!occ || occ.status !== 'PENDING') return;

          // Build a new placement with the target prayer's window from active planning day
          const inputsRes = await inputProviderRef.current.getInputs();
          if (inputsRes.status === 'READY') {
            const runtime = useTodayStore.getState().runtime;
            if (runtime) {
              const targetPeriod = runtime.planningDay.periods.find(p => p.prayer === targetPrayer);
              if (targetPeriod) {
                let calcStart = targetPeriod.start;
                if (scheduleConfig.scheduleType === 'PRAYER_RELATIVE') {
                  const offset = (scheduleConfig.scheduleData as any)?.offsetMinutes ?? 0;
                  const dir = (scheduleConfig.scheduleData as any)?.direction ?? 'AFTER';
                  calcStart = dir === 'BEFORE'
                    ? targetPeriod.start.minus({ minutes: offset })
                    : targetPeriod.start.plus({ minutes: offset });
                } else if (scheduleConfig.scheduleType === 'EXACT_TIME') {
                  const localTime = (scheduleConfig.scheduleData as any)?.localTime;
                  if (localTime) {
                    const [hh, mm] = localTime.split(':').map(Number);
                    calcStart = targetPeriod.start.set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
                  }
                }

                await taskOccurrenceRepository.updateDerivedPlacement(task.occurrenceId, {
                  windowStart: targetPeriod.start.toISO()!,
                  windowEnd: targetPeriod.end.toISO()!,
                  calculatedStartTime: calcStart.toISO()!,
                  calculatedPrayerSection: targetPrayer,
                  eligiblePrayerSections: [targetPrayer],
                  wallClockResolution: 'NORMAL',
                  planningDayKey: occ.planningDayKey,
                  timezone: occ.timezone,
                });
              }
            }
          }
        } else {
          // Non-recurring: update the entire definition
          const updatedDef = await engineRef.current.updateEntireSeries(preDef.seriesId, {
            scheduleType: scheduleConfig.scheduleType,
            scheduleData: scheduleConfig.scheduleData as any,
          });

          // Synchronize occurrences for today
          const inputsRes = await inputProviderRef.current.getInputs();
          if (inputsRes.status === 'READY') {
            await taskFormSyncService.reconcileAfterEdit(
              preDef,
              updatedDef,
              inputsRes.inputs
            );
          }
        }

        // Re-project Today view model
        const runtime = useTodayStore.getState().runtime;
        if (runtime) {
          const token = useTodayStore.getState().startReproject();
          try {
            const now = DateTime.now();
            const vm = await orchestratorRef.current.queryAndProject(runtime, now);
            useTodayStore.getState().commitReproject(token, vm);
          } catch {}
        }

        // Select the target prayer tab
        useTodayStore.getState().setSelectedPrayer(targetPrayer);

        // Background sync for notifications and widgets
        notificationServiceRef.current.reconcile().catch(() => {});
        widgetSyncCoordinator.sync().catch(err => {
          console.warn('[useToday] rescheduleTask widget sync failed:', err);
        });
      } catch (err) {
        console.warn('[useToday] rescheduleTask failed:', err);
      }
    },
    []
  );

  const deleteTask = useCallback(async (
    taskOrId: TaskCardViewModel | string,
    scope: 'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES' = 'THIS_OCCURRENCE'
  ): Promise<boolean> => {
    let occurrenceId: string | undefined;
    let defId: string | undefined;

    if (typeof taskOrId === 'string') {
      occurrenceId = taskOrId;
      const occ = await taskOccurrenceRepository.findById(taskOrId);
      if (occ) {
        defId = occ.taskDefinitionId;
      } else {
        defId = taskOrId;
        occurrenceId = undefined;
      }
    } else {
      occurrenceId = taskOrId.occurrenceId;
      defId = taskOrId.taskDefinitionId;
    }

    if (!defId) {
      Alert.alert("Couldn't delete task", 'Task definition not found.');
      return false;
    }

    try {
      await taskEngine.deleteTask({
        occurrenceId,
        definitionId: defId,
        scope,
      });
      await performFullRefresh(false);
      return true;
    } catch (err) {
      console.warn('[useToday] deleteTask failed:', err);
      Alert.alert("Couldn't delete task", 'Please try again.');
      await performFullRefresh(false);
      return false;
    }
  }, [performFullRefresh]);

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
    uncompleteTask,
    deleteTask,
    toggleSubtask,
    rescheduleTask,
    refresh: () => performFullRefresh(false),
  };
}
