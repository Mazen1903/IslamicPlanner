import type { DateTime } from 'luxon';
import type { Prayer } from '@/constants/prayers';
import type { PlanningDayConfig } from '@/domain/planning-day/types';
import type { PrayerTimeline } from '@/domain/prayer/types';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';
import type { WallClockResolutionKind } from '@/domain/temporal/types';

/**
 * Domain error codes for the Scheduling Engine.
 */
export type SchedulingErrorCode =
  | 'INSUFFICIENT_TIMELINE'
  | 'MISSING_PRAYER_ANCHOR'
  | 'INVALID_PRAYER_WINDOW'
  | 'UNSUPPORTED_SCHEDULE_TYPE'
  | 'TERMINAL_OCCURRENCE'
  | 'OCCURRENCE_DEFINITION_MISMATCH'
  | 'INVALID_SEED_DATE'
  | 'INVALID_SCHEDULE_DATA'
  | 'INVALID_TEMPORAL_CONTEXT';

/**
 * Error thrown when scheduling resolution or recalculation cannot complete.
 */
export class SchedulingResolutionError extends Error {
  readonly code: SchedulingErrorCode;

  constructor(
    code: SchedulingErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'SchedulingResolutionError';
    this.code = code;
  }
}

/**
 * Environmental context required for deterministic scheduling placement.
 */
export interface SchedulingContext {
  /** The 3-day contiguous prayer timeline covering the scheduling window. */
  timeline: PrayerTimeline;
  /** Active user planning-day configuration. */
  planningDayConfig: PlanningDayConfig;
}

/**
 * Canonical result of resolving a TaskDefinition or TaskOccurrence placement.
 * Retains exact Luxon DateTimes for downstream consumers.
 */
export interface ResolvedPlacement {
  /** The civil seed date of the occurrence ('YYYY-MM-DD'). Invariant: equals input seed date. */
  localDate: string;

  /** Planning-day key ('YYYY-MM-DD') resolved through PlanningDayEngine. */
  planningDayKey: string;

  /** Absolute start time for point-in-time placements; null for ANYTIME_TODAY and PRAYER_WINDOW. */
  calculatedStartTime: DateTime | null;

  /** Assigned single prayer section; null for ANYTIME_TODAY and PRAYER_WINDOW. */
  calculatedPrayerSection: Prayer | null;

  /** Eligible prayer sections for tab filtering in PRAYER_WINDOW; null for others. */
  eligiblePrayerSections: Prayer[] | null;

  /** Transition metadata for EXACT_TIME; null for other schedule types. */
  wallClockResolution: WallClockResolutionKind | null;

  /**
   * Absolute start time of the prayer window [start, end); null for non-window types.
   * NOTE for M6: Preserved for expiration, missed-state evaluation, and notification scheduling.
   */
  windowStart: DateTime | null;

  /**
   * Absolute end time of the prayer window [start, end); null for non-window types.
   * NOTE for M6: Preserved for expiration, missed-state evaluation, and notification scheduling.
   */
  windowEnd: DateTime | null;
}

/**
 * Public contract for the SchedulingEngine.
 */
export interface SchedulingEngineAPI {
  /**
   * Pure domain resolver that computes temporal placement for a TaskDefinition on a seed date.
   */
  resolvePlacement(
    taskDefinition: TaskDefinition,
    occurrenceSeedDate: string,
    context: SchedulingContext
  ): ResolvedPlacement;

  /**
   * Re-evaluates placement for an existing occurrence against its TaskDefinition.
   * Enforces occurrence identity and non-terminal status guards.
   */
  recalculateOccurrencePlacement(
    occurrence: TaskOccurrence,
    taskDefinition: TaskDefinition,
    context: SchedulingContext
  ): ResolvedPlacement;
}
