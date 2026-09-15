import type { DateTime } from 'luxon';
import type { Prayer } from '@/constants/prayers';
import { PRAYER_ORDER } from '@/constants/prayers';
import type { PrayerPeriodInstance, PrayerTimeline } from '@/domain/prayer/types';

export type { Prayer } from '@/constants/prayers';
export { PRAYER_ORDER } from '@/constants/prayers';
export type { PrayerPeriodInstance, PrayerTimeline } from '@/domain/prayer/types';

/**
 * Permanent UI planner tab order, referencing the single canonical prayer order.
 */
export const PLANNER_TAB_ORDER = PRAYER_ORDER;

/**
 * Supported planning-day boundary modes.
 */
export type PlanningDayMode = 'FAJR' | 'MIDNIGHT' | 'CUSTOM';

/**
 * Canonical discriminated union for planning-day configuration.
 * - 'FAJR': Default free mode. Day begins at Fajr and ends at next Fajr.
 * - 'MIDNIGHT': Day begins at 00:00 and ends at next 00:00.
 * - 'CUSTOM': Premium mode. Day begins at local wall-clock localTime (HH:mm) and ends at next day's localTime.
 */
export type PlanningDayConfig =
  | { mode: 'FAJR' }
  | { mode: 'MIDNIGHT' }
  | { mode: 'CUSTOM'; localTime: string };

/**
 * The resolved boundary interval and key for a planning day.
 */
export interface PlanningDayBoundaries {
  /** Planning day key: 'YYYY-MM-DD'. */
  key: string;
  /** Absolute start instant (inclusive). */
  start: DateTime;
  /** Absolute end instant (exclusive). */
  end: DateTime;
}

/**
 * A planning day is a bounded interval containing clipped prayer period instances.
 */
export interface PlanningDay {
  /**
   * Planning day identifier: 'YYYY-MM-DD'.
   * - FAJR: Civil date of the Fajr that begins the planning day.
   * - MIDNIGHT: Civil date of the day (00:00 -> next 00:00).
   * - CUSTOM HH:mm: Civil date D of the waking day ((D-1)@HH:mm -> D@HH:mm).
   */
  key: string;

  /** Absolute start of this planning day (inclusive). */
  start: DateTime;

  /** Absolute end of this planning day (exclusive). */
  end: DateTime;

  /**
   * Prayer period instances clipped to this planning day's interval [start, end).
   * Ordered chronologically.
   * A single prayer label may appear more than once if a custom boundary cuts through
   * a prayer period, producing fragments from two different astronomical days.
   */
  periods: PrayerPeriodInstance[];
}

/**
 * Result of resolving a wall-clock time in an IANA timezone with DST awareness.
 */
export interface WallClockResolution {
  /** The resolved absolute DateTime. */
  resolvedTime: DateTime;
  /** How the resolution was performed. */
  resolution: 'NORMAL' | 'SPRING_FORWARD_SHIFTED' | 'FALL_BACK_FIRST';
}

/**
 * API exposed by the PlanningDayEngine domain module.
 */
export interface PlanningDayEngineAPI {
  /**
   * Resolves the boundaries [start, end) and planningDayKey for a reference time or key.
   */
  resolvePlanningDayBoundaries(
    config: PlanningDayConfig,
    timeline: PrayerTimeline,
    reference: DateTime | string
  ): PlanningDayBoundaries;

  /**
   * Builds a PlanningDay with clipped periods for a given reference (DateTime or key string).
   */
  buildPlanningDay(
    config: PlanningDayConfig,
    timeline: PrayerTimeline,
    reference: DateTime | string
  ): PlanningDay;

  /**
   * Determines which PlanningDay interval contains the given absolute time.
   * Enforces start <= time < end invariant.
   */
  resolvePlanningDayForTime(
    config: PlanningDayConfig,
    timeline: PrayerTimeline,
    time: DateTime
  ): PlanningDay;

  /**
   * Builds the PlanningDay for a specific planningDayKey ('YYYY-MM-DD').
   */
  buildPlanningDayForKey(
    config: PlanningDayConfig,
    timeline: PrayerTimeline,
    key: string
  ): PlanningDay;

  /**
   * Pure helper to filter clipped periods in a PlanningDay by prayer label.
   */
  getPeriodsForPrayer(
    planningDay: PlanningDay,
    prayer: Prayer
  ): PrayerPeriodInstance[];
}
