import { DateTime } from 'luxon';
import type {
  TodayTemporalInputProvider,
  TodayTemporalInputs,
  TodayViewModel,
  TodayRuntimeContext,
} from './types';
import { M7BootstrapInputProvider } from './TodayTemporalInputProvider';
import { TodayOrchestrator } from './TodayOrchestrator';
import {
  RecurringHorizonSync,
  recurringHorizonSync as defaultRecurringHorizonSync,
} from '@/features/task-form/recurringHorizonSync';
import { computeSyncHorizon } from '@/features/task-form/syncService';
import type { HorizonSyncResult } from '@/features/task-form/types';

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
 * PlannerRefreshCoordinator coordinates durable recurring horizon synchronization
 * and Today screen view model generation.
 *
 * Runs on:
 * - initial Today load
 * - app foreground
 * - planning-day rollover
 * - after Add/Edit save
 *
 * Does NOT run for:
 * - ordinary prayer-only transitions (re-projection)
 * - task completion re-projection
 *
 * Invariant: Must NOT import Zustand.
 */
export class PlannerRefreshCoordinator {
  constructor(
    private readonly inputProvider: TodayTemporalInputProvider = new M7BootstrapInputProvider(),
    private readonly todayOrchestrator: TodayOrchestrator = new TodayOrchestrator(),
    private readonly recurringHorizonSync: RecurringHorizonSync = defaultRecurringHorizonSync
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

    return {
      status: 'READY',
      viewModel: todayResult.viewModel,
      runtime: todayResult.runtime,
      horizonSync,
    };
  }
}

export const plannerRefreshCoordinator = new PlannerRefreshCoordinator();
