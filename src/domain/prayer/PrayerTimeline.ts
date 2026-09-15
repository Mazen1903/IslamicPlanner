import { DateTime } from 'luxon';
import type {
  Coordinates,
  Prayer,
  PrayerCalculationParams,
  PrayerPeriodInstance,
  PrayerTimeline,
  PrayerTimesResult,
} from './types';
import { calculate } from './PrayerEngine';

/**
 * Domain error thrown when a time query cannot be resolved within a PrayerTimeline.
 */
export class PrayerTimelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrayerTimelineError';
  }
}

/**
 * Adds an integer number of calendar days to an ISO date string ('YYYY-MM-DD').
 * Uses UTC date math to guarantee DST-immune calendar-day shifts.
 */
function addDays(isoDate: string, days: number): string {
  const dt = DateTime.fromISO(isoDate, { zone: 'utc' });
  if (!dt.isValid) {
    throw new Error(`Invalid ISO date string: ${isoDate}`);
  }
  return dt.plus({ days }).toISODate()!;
}

/**
 * Appends 5 unclipped PrayerPeriodInstance records for a given date to the out array.
 * Note: Sunrise is an astronomical moment used internally, NOT a planner prayer period.
 *
 * The 5 contiguous periods are:
 * - FAJR:    times.fajr    -> times.dhuhr
 * - DHUHR:   times.dhuhr   -> times.asr
 * - ASR:     times.asr     -> times.maghrib
 * - MAGHRIB: times.maghrib -> times.isha
 * - ISHA:    times.isha    -> nextDayFajr
 */
export function appendDayPeriods(
  out: PrayerPeriodInstance[],
  times: PrayerTimesResult,
  sourceDate: string,
  nextDayFajr: DateTime
): void {
  const raw: { prayer: Prayer; start: DateTime; end: DateTime }[] = [
    { prayer: 'FAJR', start: times.fajr, end: times.dhuhr },
    { prayer: 'DHUHR', start: times.dhuhr, end: times.asr },
    { prayer: 'ASR', start: times.asr, end: times.maghrib },
    { prayer: 'MAGHRIB', start: times.maghrib, end: times.isha },
    { prayer: 'ISHA', start: times.isha, end: nextDayFajr },
  ];

  for (const r of raw) {
    out.push({
      prayer: r.prayer,
      start: r.start,
      end: r.end,
      fullPeriodStart: r.start,
      fullPeriodEnd: r.end,
      sourceDate,
    });
  }
}

/**
 * Finds which prayer period in the timeline contains the specified time.
 * Invariant: Uses inclusive-start / exclusive-end semantics (start <= time < end).
 * Throws PrayerTimelineError if time is outside the timeline boundaries.
 */
export function findPeriodInTimeline(
  periods: PrayerPeriodInstance[],
  time: DateTime
): PrayerPeriodInstance {
  if (!time.isValid) {
    throw new PrayerTimelineError('Cannot find period for invalid DateTime');
  }

  const targetMs = time.toMillis();

  for (const period of periods) {
    const startMs = period.start.toMillis();
    const endMs = period.end.toMillis();
    if (targetMs >= startMs && targetMs < endMs) {
      return period;
    }
  }

  throw new PrayerTimelineError(
    `Time ${time.toISO()} does not fall within any prayer period in the timeline`
  );
}

/**
 * Builds an exact, contiguous PrayerTimeline spanning 3 consecutive calendar days
 * (D-1, D, D+1) centered on centerDate.
 *
 * Crucial invariant: NO prayer boundary is approximated.
 * Calculates 4 consecutive dates (D-1, D, D+1, D+2) so that D+1 Isha has an
 * exact calculated D+2 Fajr end.
 *
 * Produces exactly 15 contiguous PrayerPeriodInstance records.
 */
export function buildPrayerTimeline(
  centerDate: string,
  coordinates: Coordinates,
  params: PrayerCalculationParams
): PrayerTimeline {
  const prevDate = addDays(centerDate, -1);
  const nextDate = addDays(centerDate, 1);
  const dayAfterNext = addDays(centerDate, 2);

  // Calculate prayer times for 4 dates to ensure exact boundaries throughout
  const prevTimes = calculate(prevDate, coordinates, params);
  const currTimes = calculate(centerDate, coordinates, params);
  const nextTimes = calculate(nextDate, coordinates, params);
  const dayAfterNextTimes = calculate(dayAfterNext, coordinates, params);

  const periods: PrayerPeriodInstance[] = [];

  // D-1: Previous day (5 periods, Isha end = D Fajr)
  appendDayPeriods(periods, prevTimes, prevDate, currTimes.fajr);

  // D: Center day (5 periods, Isha end = D+1 Fajr)
  appendDayPeriods(periods, currTimes, centerDate, nextTimes.fajr);

  // D+1: Next day (5 periods, Isha end = D+2 Fajr — EXACT astronomical calculation)
  appendDayPeriods(periods, nextTimes, nextDate, dayAfterNextTimes.fajr);

  return {
    periods,
    findPeriod: (time: DateTime) => findPeriodInTimeline(periods, time),
  };
}

/**
 * Determine which prayer period a given time falls in using the full timeline.
 */
export function getCurrentPrayer(now: DateTime, timeline: PrayerTimeline): Prayer {
  return timeline.findPeriod(now).prayer;
}

/**
 * Get the next prayer after a given time.
 * Invariant: Returns the period immediately following the current one in the timeline.
 * Throws PrayerTimelineError if the timeline does not extend far enough.
 */
export function getNextPrayer(
  now: DateTime,
  timeline: PrayerTimeline
): { prayer: Prayer; time: DateTime } {
  const currentPeriod = timeline.findPeriod(now);
  const currentIdx = timeline.periods.indexOf(currentPeriod);

  const nextIdx = currentIdx + 1;
  if (nextIdx < timeline.periods.length) {
    const next = timeline.periods[nextIdx];
    return { prayer: next.prayer, time: next.start };
  }

  throw new PrayerTimelineError('Timeline does not extend far enough to determine next prayer');
}
