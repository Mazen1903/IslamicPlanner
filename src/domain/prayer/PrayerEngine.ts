import { DateTime } from 'luxon';
import { recommendCalculationMethod } from './calculationMethods';
import { calculationConfigFingerprint } from './cacheFingerprint';
import { calculate } from './PrayerCalculator';
import {
  buildPrayerTimeline,
  getCurrentPrayer,
  getNextPrayer,
  PrayerTimelineError,
} from './PrayerTimeline';
import type {
  Coordinates,
  PrayerCalculationParams,
  PrayerEngineAPI,
  PrayerTimesResult,
} from './types';

export { calculate };

/**
 * Calculates prayer times for an inclusive date range [startDate, endDate].
 */
export function calculateRange(
  startDate: string,
  endDate: string,
  coordinates: Coordinates,
  params: PrayerCalculationParams
): Map<string, PrayerTimesResult> {
  const results = new Map<string, PrayerTimesResult>();
  let current = DateTime.fromISO(startDate, { zone: 'utc' });
  const end = DateTime.fromISO(endDate, { zone: 'utc' });

  if (!current.isValid || !end.isValid) {
    throw new Error(`Invalid date range: ${startDate} to ${endDate}`);
  }

  while (current <= end) {
    const dateStr = current.toISODate()!;
    results.set(dateStr, calculate(dateStr, coordinates, params));
    current = current.plus({ days: 1 });
  }

  return results;
}

export {
  buildPrayerTimeline,
  getCurrentPrayer,
  getNextPrayer,
  recommendCalculationMethod,
  calculationConfigFingerprint,
  PrayerTimelineError,
};

/**
 * PrayerEngine domain service implementing PrayerEngineAPI.
 */
export const PrayerEngine: PrayerEngineAPI = {
  calculate,
  calculateRange,
  buildPrayerTimeline,
  getCurrentPrayer,
  getNextPrayer,
  recommendCalculationMethod,
  calculationConfigFingerprint,
};
