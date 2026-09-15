import { DateTime } from 'luxon';
import {
  getEffectiveTimezone as temporalGetEffectiveTimezone,
  resolveWallClock as temporalResolveWallClock,
  TemporalResolutionError,
} from '@/domain/temporal';
import type { Prayer } from '@/constants/prayers';
import type {
  PlanningDay,
  PlanningDayBoundaries,
  PlanningDayConfig,
  PlanningDayEngineAPI,
  PrayerPeriodInstance,
  PrayerTimeline,
  WallClockResolution,
} from './types';

/**
 * Domain error thrown when planning-day operations encounter an invalid state,
 * invalid time format, or insufficient timeline coverage.
 */
export class PlanningDayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanningDayError';
  }
}

/**
 * Adds an integer number of calendar days to an ISO date string ('YYYY-MM-DD').
 * Uses UTC date math to guarantee DST-immune calendar-day shifts.
 */
function addDays(isoDate: string, days: number): string {
  const dt = DateTime.fromISO(isoDate, { zone: 'utc' });
  if (!dt.isValid) {
    throw new PlanningDayError(`Invalid ISO date string: ${isoDate}`);
  }
  return dt.plus({ days }).toISODate()!;
}

/**
 * Extracts the effective IANA timezone from the PrayerTimeline context.
 */
function getEffectiveTimezone(timeline: PrayerTimeline): string {
  try {
    return temporalGetEffectiveTimezone(timeline);
  } catch (err) {
    if (err instanceof TemporalResolutionError) {
      throw new PlanningDayError(err.message);
    }
    throw err;
  }
}

/**
 * Resolves a local wall-clock time string (HH:mm) on a given calendar date in an IANA timezone
 * following the deterministic DST policy defined in SCHEDULING_ENGINE.md §2.4.
 *
 * Catches lower-level TemporalResolutionError and maps to PlanningDayError for M3 compatibility.
 */
export function resolveWallClock(
  dateStr: string,
  timeStr: string,
  timezone: string
): WallClockResolution {
  try {
    return temporalResolveWallClock(dateStr, timeStr, timezone);
  } catch (err) {
    if (err instanceof TemporalResolutionError) {
      throw new PlanningDayError(err.message);
    }
    throw err;
  }
}

/**
 * Clips prayer period instances to the interval [dayStart, dayEnd).
 *
 * Invariants:
 * - Does NOT mutate the input array or its period objects.
 * - Elements are new PrayerPeriodInstance records.
 * - start and end represent the clipped interval.
 * - fullPeriodStart, fullPeriodEnd, sourceDate, and prayer are strictly preserved.
 * - Zero-duration intersections are skipped.
 * - Chronological order is preserved.
 */
export function clipPeriodsToInterval(
  periods: PrayerPeriodInstance[],
  dayStart: DateTime,
  dayEnd: DateTime
): PrayerPeriodInstance[] {
  const clipped: PrayerPeriodInstance[] = [];
  const startMs = dayStart.toMillis();
  const endMs = dayEnd.toMillis();

  for (const period of periods) {
    const periodStartMs = period.start.toMillis();
    const periodEndMs = period.end.toMillis();

    // Skip periods completely outside the planning day
    if (periodEndMs <= startMs || periodStartMs >= endMs) {
      continue;
    }

    // Clip start and end
    const clippedStart = periodStartMs < startMs ? dayStart : period.start;
    const clippedEnd = periodEndMs > endMs ? dayEnd : period.end;

    // Skip zero-duration intersections
    if (clippedStart.toMillis() >= clippedEnd.toMillis()) {
      continue;
    }

    clipped.push({
      prayer: period.prayer,
      start: clippedStart,
      end: clippedEnd,
      fullPeriodStart: period.fullPeriodStart,
      fullPeriodEnd: period.fullPeriodEnd,
      sourceDate: period.sourceDate,
    });
  }

  return clipped;
}

/**
 * Verifies that the PrayerTimeline covers the entire [dayStart, dayEnd) interval.
 * Throws PlanningDayError if coverage is insufficient.
 */
function assertTimelineCoverage(
  timeline: PrayerTimeline,
  dayStart: DateTime,
  dayEnd: DateTime
): void {
  if (!timeline.periods || timeline.periods.length === 0) {
    throw new PlanningDayError('PrayerTimeline contains no periods');
  }

  const timelineStart = timeline.periods[0].start;
  const timelineEnd = timeline.periods[timeline.periods.length - 1].end;

  if (timelineStart.toMillis() > dayStart.toMillis()) {
    throw new PlanningDayError(
      `PrayerTimeline starts at ${timelineStart.toISO()} and does not cover planning day start ${dayStart.toISO()}`
    );
  }

  if (timelineEnd.toMillis() < dayEnd.toMillis()) {
    throw new PlanningDayError(
      `PrayerTimeline ends at ${timelineEnd.toISO()} and does not cover planning day end ${dayEnd.toISO()}`
    );
  }
}

/**
 * Resolves the planning-day boundary interval [start, end) and stable planningDayKey
 * for a reference time (DateTime) or key string ('YYYY-MM-DD').
 */
export function resolvePlanningDayBoundaries(
  config: PlanningDayConfig,
  timeline: PrayerTimeline,
  reference: DateTime | string
): PlanningDayBoundaries {
  const effectiveTimezone = getEffectiveTimezone(timeline);

  if (typeof reference === 'string') {
    // --- Reference is planningDayKey ('YYYY-MM-DD') ---
    const key = reference;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(key)) {
      throw new PlanningDayError(`Invalid planning day key format "${key}". Expected "YYYY-MM-DD".`);
    }

    switch (config.mode) {
      case 'FAJR': {
        // key D starts at D Fajr and ends at D+1 Fajr
        const fajrPeriod = timeline.periods.find(
          (p) => p.prayer === 'FAJR' && p.sourceDate === key
        );
        if (!fajrPeriod) {
          throw new PlanningDayError(
            `PrayerTimeline does not contain Fajr period for key "${key}"`
          );
        }

        const ishaPeriod = timeline.periods.find(
          (p) => p.prayer === 'ISHA' && p.sourceDate === key
        );
        if (!ishaPeriod) {
          throw new PlanningDayError(
            `PrayerTimeline does not contain Isha period for key "${key}" to determine next Fajr`
          );
        }

        return {
          key,
          start: fajrPeriod.start,
          end: ishaPeriod.end,
        };
      }

      case 'MIDNIGHT': {
        // key D starts at D 00:00 and ends at D+1 00:00
        const start = resolveWallClock(key, '00:00', effectiveTimezone).resolvedTime;
        const nextDate = addDays(key, 1);
        const end = resolveWallClock(nextDate, '00:00', effectiveTimezone).resolvedTime;
        return { key, start, end };
      }

      case 'CUSTOM': {
        // key D = (D-1) @ localTime -> D @ localTime
        const prevDate = addDays(key, -1);
        const start = resolveWallClock(prevDate, config.localTime, effectiveTimezone).resolvedTime;
        const end = resolveWallClock(key, config.localTime, effectiveTimezone).resolvedTime;
        return { key, start, end };
      }

      default: {
        const exhaustiveCheck: never = config;
        throw new PlanningDayError(`Unsupported planning day config: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  }

  // --- Reference is an absolute instant (DateTime) ---
  if (!reference.isValid) {
    throw new PlanningDayError(
      `Cannot resolve planning day for invalid DateTime: ${reference.invalidReason ?? 'unknown'}`
    );
  }

  // Normalize reference time to effective planning timezone
  const time = reference.setZone(effectiveTimezone);

  switch (config.mode) {
    case 'FAJR': {
      // Build chronological Fajr boundary markers from timeline
      const fajrBoundaries: { time: DateTime; key: string }[] = [];
      for (const p of timeline.periods) {
        if (p.prayer === 'FAJR') {
          fajrBoundaries.push({ time: p.start, key: p.sourceDate });
        }
      }

      // The last Isha period's end represents the Fajr of the following day
      const lastPeriod = timeline.periods[timeline.periods.length - 1];
      if (lastPeriod && lastPeriod.prayer === 'ISHA') {
        fajrBoundaries.push({
          time: lastPeriod.end,
          key: addDays(lastPeriod.sourceDate, 1),
        });
      }

      const targetMs = time.toMillis();
      for (let i = 0; i < fajrBoundaries.length - 1; i++) {
        const startMs = fajrBoundaries[i].time.toMillis();
        const endMs = fajrBoundaries[i + 1].time.toMillis();
        if (targetMs >= startMs && targetMs < endMs) {
          return {
            key: fajrBoundaries[i].key,
            start: fajrBoundaries[i].time,
            end: fajrBoundaries[i + 1].time,
          };
        }
      }

      throw new PlanningDayError(
        `Time ${time.toISO()} falls outside the Fajr boundaries covered by PrayerTimeline`
      );
    }

    case 'MIDNIGHT': {
      const dateStr = time.toISODate()!;
      const boundaryToday = resolveWallClock(dateStr, '00:00', effectiveTimezone).resolvedTime;

      if (time.toMillis() < boundaryToday.toMillis()) {
        const prevDate = addDays(dateStr, -1);
        const start = resolveWallClock(prevDate, '00:00', effectiveTimezone).resolvedTime;
        return { key: prevDate, start, end: boundaryToday };
      }

      const nextDate = addDays(dateStr, 1);
      const end = resolveWallClock(nextDate, '00:00', effectiveTimezone).resolvedTime;
      return { key: dateStr, start: boundaryToday, end };
    }

    case 'CUSTOM': {
      const dateStr = time.toISODate()!;
      const boundaryToday = resolveWallClock(dateStr, config.localTime, effectiveTimezone).resolvedTime;

      if (time.toMillis() < boundaryToday.toMillis()) {
        // Before today's boundary: belongs to the planning day ending today @ localTime
        // Key is dateStr
        const prevDate = addDays(dateStr, -1);
        const start = resolveWallClock(prevDate, config.localTime, effectiveTimezone).resolvedTime;
        return {
          key: dateStr,
          start,
          end: boundaryToday,
        };
      }

      // At or after today's boundary: belongs to the planning day ending tomorrow @ localTime
      // Key is nextDate
      const nextDate = addDays(dateStr, 1);
      const end = resolveWallClock(nextDate, config.localTime, effectiveTimezone).resolvedTime;
      return {
        key: nextDate,
        start: boundaryToday,
        end,
      };
    }

    default: {
      const exhaustiveCheck: never = config;
      throw new PlanningDayError(`Unsupported planning day config: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

/**
 * Builds the PlanningDay for a specific planningDayKey ('YYYY-MM-DD').
 * Clips timeline periods to the day's boundaries and verifies full timeline coverage.
 */
export function buildPlanningDayForKey(
  config: PlanningDayConfig,
  timeline: PrayerTimeline,
  key: string
): PlanningDay {
  const boundaries = resolvePlanningDayBoundaries(config, timeline, key);
  assertTimelineCoverage(timeline, boundaries.start, boundaries.end);
  const periods = clipPeriodsToInterval(timeline.periods, boundaries.start, boundaries.end);

  return {
    key: boundaries.key,
    start: boundaries.start,
    end: boundaries.end,
    periods,
  };
}

/**
 * Determines which PlanningDay interval contains the given absolute time.
 * Invariant: planningDay.start <= time < planningDay.end.
 * Clips timeline periods to the day's boundaries and verifies full timeline coverage.
 */
export function resolvePlanningDayForTime(
  config: PlanningDayConfig,
  timeline: PrayerTimeline,
  time: DateTime
): PlanningDay {
  const boundaries = resolvePlanningDayBoundaries(config, timeline, time);
  assertTimelineCoverage(timeline, boundaries.start, boundaries.end);
  const periods = clipPeriodsToInterval(timeline.periods, boundaries.start, boundaries.end);

  return {
    key: boundaries.key,
    start: boundaries.start,
    end: boundaries.end,
    periods,
  };
}

/**
 * Unified construction API: delegates string -> buildPlanningDayForKey and DateTime -> resolvePlanningDayForTime.
 */
export function buildPlanningDay(
  config: PlanningDayConfig,
  timeline: PrayerTimeline,
  reference: DateTime | string
): PlanningDay {
  if (typeof reference === 'string') {
    return buildPlanningDayForKey(config, timeline, reference);
  }
  return resolvePlanningDayForTime(config, timeline, reference);
}

/**
 * Pure domain helper to retrieve all clipped PrayerPeriodInstance records for a given prayer label.
 * For example, if a custom boundary cuts Maghrib, this returns both Maghrib fragments in chronological order.
 */
export function getPeriodsForPrayer(
  planningDay: PlanningDay,
  prayer: Prayer
): PrayerPeriodInstance[] {
  return planningDay.periods.filter((p) => p.prayer === prayer);
}

/**
 * The PlanningDayEngine facade implementing PlanningDayEngineAPI.
 */
export const PlanningDayEngine: PlanningDayEngineAPI = {
  resolvePlanningDayBoundaries,
  buildPlanningDay,
  resolvePlanningDayForTime,
  buildPlanningDayForKey,
  getPeriodsForPrayer,
};
