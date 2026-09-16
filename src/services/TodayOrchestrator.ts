import { DateTime } from 'luxon';
import type { Prayer } from '@/constants/prayers';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import { resolvePlanningDayForTime } from '@/domain/planning-day/PlanningDayEngine';
import {
  materializationEngine as defaultMaterializationEngine,
  MaterializationEngine,
} from '@/domain/materialization/MaterializationEngine';
import type { SchedulingContext } from '@/domain/scheduling/types';
import {
  todayQueryService as defaultTodayQueryService,
  TodayQueryService,
} from './TodayQueryService';
import {
  deriveTimelineSeedRange,
  projectTodayViewModel,
} from './TodayViewModelProjection';
import type {
  TodayTemporalInputs,
  TodayRefreshResult,
  TodayRuntimeContext,
  TodayViewModel,
} from './types';

/**
 * Cheap boundary comparison using cached runtime state.
 * No PlanningDayEngine call. No DB query. No materialization.
 */
export function detectTransitions(
  now: DateTime,
  runtime: TodayRuntimeContext,
  storedCurrentPrayer: Prayer
): { prayerChanged: boolean; planningDayChanged: boolean; newPrayer: Prayer | null } {
  const nowMs = now.toMillis();
  const planningDayChanged =
    nowMs >= runtime.planningDay.end.toMillis() ||
    nowMs < runtime.planningDay.start.toMillis();

  let prayerChanged = false;
  let newPrayer: Prayer | null = null;

  if (!planningDayChanged) {
    const currentPeriod = runtime.timeline.findPeriod(now);
    if (currentPeriod.prayer !== storedCurrentPrayer) {
      prayerChanged = true;
      newPrayer = currentPeriod.prayer;
    }
  }

  return { prayerChanged, planningDayChanged, newPrayer };
}

/**
 * TodayOrchestrator is the single domain owner for the Today screen.
 * Owns timeline construction, planning day resolution, materialization orchestration,
 * querying, and view-model projection.
 */
export class TodayOrchestrator {
  constructor(
    private readonly materializationEngine: MaterializationEngine = defaultMaterializationEngine,
    private readonly queryService: TodayQueryService = defaultTodayQueryService
  ) {}

  /**
   * Full refresh pipeline:
   * inputs -> timeline -> planningDay -> seed derivation ->
   * materialize -> query candidates -> project viewModel -> return { viewModel, runtime }
   */
  async refreshToday(
    now: DateTime,
    inputs: TodayTemporalInputs
  ): Promise<TodayRefreshResult> {
    // 1. Center date in target timezone
    const centerDate = now.setZone(inputs.params.timezone).toISODate()!;

    // 2. Build 3-day contiguous timeline (15 periods)
    const timeline = buildPrayerTimeline(centerDate, inputs.coordinates, inputs.params);

    // 3. Resolve active PlanningDay interval containing wall-clock `now`
    const planningDay = resolvePlanningDayForTime(
      inputs.planningDayConfig,
      timeline,
      now
    );

    // 4. Derive materialization seed range from timeline sourceDate coverage
    const seedRange = deriveTimelineSeedRange(timeline);

    // 5. Materialize and rematerialize tasks for the seed range
    const schedulingContext: SchedulingContext = {
      timeline,
      planningDayConfig: inputs.planningDayConfig,
    };

    await this.materializationEngine.materializeNonRecurring(
      seedRange.seedStart,
      seedRange.seedEnd,
      schedulingContext
    );

    await this.materializationEngine.rematerializePending(
      seedRange.seedStart,
      seedRange.seedEnd,
      schedulingContext
    );

    // 6. Query occurrences and batch-load definitions
    const nowUtc = now.toUTC().toISO()!;
    const queryResult = await this.queryService.queryTodayCandidates(
      planningDay.key,
      nowUtc
    );

    // 7. Project TodayViewModel
    const viewModel = projectTodayViewModel(
      queryResult.occurrences,
      queryResult.definitions,
      planningDay,
      timeline,
      now,
      inputs.params.timezone
    );

    // 8. Construct explicit TodayRuntimeContext
    const runtime: TodayRuntimeContext = {
      timeline,
      planningDay,
      planningDayConfig: inputs.planningDayConfig,
      refreshedAt: now.toISO()!,
    };

    return {
      viewModel,
      runtime,
    };
  }

  /**
   * Re-query + re-project pipeline without materialization.
   * Used after task mutations and prayer-only transitions.
   */
  async queryAndProject(
    runtime: TodayRuntimeContext,
    now: DateTime
  ): Promise<TodayViewModel> {
    const timezone = runtime.planningDay.periods[0]?.start.zoneName ?? 'UTC';
    const nowUtc = now.toUTC().toISO()!;

    const queryResult = await this.queryService.queryTodayCandidates(
      runtime.planningDay.key,
      nowUtc
    );

    return projectTodayViewModel(
      queryResult.occurrences,
      queryResult.definitions,
      runtime.planningDay,
      runtime.timeline,
      now,
      timezone
    );
  }
}

export const todayOrchestrator = new TodayOrchestrator();
