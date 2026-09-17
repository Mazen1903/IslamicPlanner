import { DateTime } from 'luxon';
import type {
  TodayTemporalInputProvider,
  TodayTemporalInputs,
  TodayViewModel,
  TodayRuntimeContext,
} from './types';
import {
  LocationAwareTodayTemporalInputProvider,
} from './TodayTemporalInputProvider';
import { TodayOrchestrator } from './TodayOrchestrator';
import {
  RecurringHorizonSync,
  recurringHorizonSync as defaultRecurringHorizonSync,
} from '@/features/task-form/recurringHorizonSync';
import { computeSyncHorizon } from '@/features/task-form/syncService';
import type { HorizonSyncResult } from '@/features/task-form/types';
import {
  OccurrenceLifecycleService,
  occurrenceLifecycleService as defaultLifecycleService,
} from './OccurrenceLifecycleService';

export type PlannerRefreshCoordinatorResult =
  | {
      status: 'READY';
      viewModel: TodayViewModel;
      runtime: TodayRuntimeContext;
      horizonSync: HorizonSyncResult;
    }
  | {
      status: 'SETUP_REQUIRED';
    };

/**
 * PlannerRefreshCoordinator coordinates durable recurring horizon synchronization,
 * Today screen view model generation, and lifecycle sweeps for expired tasks.
 *
 * Runs on:
 * - initial Today load
 * - app foreground
 * - planning-day rollover
 * - after Add/Edit save
 *
 * Refresh Order (M11 §10):
 * 1. get fresh temporal inputs
 * 2. RecurringHorizonSync
 * 3. TodayOrchestrator.refreshToday
 * 4. OccurrenceLifecycleService.sweepExpired using SAME fresh inputs
 * 5. if sweep mutated rows:
 *      TodayOrchestrator.queryAndProject
 *    else:
 *      reuse refreshToday viewModel
 * 6. return final READY result
 *
 * Invariant: Must NOT import Zustand.
 */
export class PlannerRefreshCoordinator {
  constructor(
    private readonly inputProvider: TodayTemporalInputProvider = new LocationAwareTodayTemporalInputProvider(),
    private readonly todayOrchestrator: TodayOrchestrator = new TodayOrchestrator(),
    private readonly recurringHorizonSync: RecurringHorizonSync = defaultRecurringHorizonSync,
    private readonly lifecycleService: OccurrenceLifecycleService = defaultLifecycleService
  ) {}

  async fullRefresh(now: DateTime = DateTime.now()): Promise<PlannerRefreshCoordinatorResult> {
    // 1. Fetch current temporal inputs
    const inputResult = await this.inputProvider.getInputs();
    if (inputResult.status === 'SETUP_REQUIRED') {
      return { status: 'SETUP_REQUIRED' };
    }

    const inputs: TodayTemporalInputs = inputResult.inputs;

    // 2. Derive today civil date in configured timezone
    const todayCivil = now.setZone(inputs.params.timezone).toISODate()!;

    // 3. Compute canonical ±7 day horizon
    const horizon = computeSyncHorizon(todayCivil);

    // 4. Synchronize recurring horizon (with plan-before-delete & Source B recovery)
    const horizonSync = await this.recurringHorizonSync.sync(horizon, inputs);

    // 5. Refresh Today screen via TodayOrchestrator
    const todayResult = await this.todayOrchestrator.refreshToday(now, inputs);

    // 6. Sweep expired occurrences using SAME fresh inputs
    const sweepResult = await this.lifecycleService.sweepExpired(now, inputs);

    let finalViewModel = todayResult.viewModel;
    if (sweepResult.mutatedCount > 0) {
      finalViewModel = await this.todayOrchestrator.queryAndProject(todayResult.runtime, now);
    }

    return {
      status: 'READY',
      viewModel: finalViewModel,
      runtime: todayResult.runtime,
      horizonSync,
    };
  }
}

export const plannerRefreshCoordinator = new PlannerRefreshCoordinator();
