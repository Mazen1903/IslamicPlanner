import {
  Coordinates as AdhanCoordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes as AdhanPrayerTimes,
} from 'adhan';
import { DateTime } from 'luxon';
import {
  recommendCalculationMethod,
  resolveCalculationMethod,
  resolveHighLatRule,
  resolvePolarCircle,
} from './calculationMethods';
import { calculationConfigFingerprint } from './cacheFingerprint';
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

/**
 * Calculates prayer times for a specific date, location, and parameters.
 * Returns absolute DateTimes in the specified timezone.
 *
 * Implements PRAYER_ENGINE.md §4 and §8.
 */
export function calculate(
  date: string,
  coordinates: Coordinates,
  params: PrayerCalculationParams
): PrayerTimesResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD.`);
  }

  const zone = params.timezone;
  const testZoneDt = DateTime.now().setZone(zone);
  if (!testZoneDt.isValid) {
    throw new Error(`Invalid IANA timezone: "${zone}".`);
  }

  const adhanCoords = new AdhanCoordinates(coordinates.latitude, coordinates.longitude);
  const calcParams = resolveCalculationMethod(params.method);

  calcParams.madhab = params.asrMethod === 'HANAFI' ? Madhab.Hanafi : Madhab.Shafi;

  // High latitude rule
  if (params.highLatitudeRule === 'AUTO') {
    calcParams.highLatitudeRule = HighLatitudeRule.recommended(adhanCoords);
  } else {
    calcParams.highLatitudeRule = resolveHighLatRule(params.highLatitudeRule, coordinates);
  }

  // Polar circle resolution
  calcParams.polarCircleResolution = resolvePolarCircle(params.polarCircleResolution);

  // Manual minute adjustments
  calcParams.adjustments.fajr = params.adjustments.fajr;
  calcParams.adjustments.sunrise = params.adjustments.sunrise;
  calcParams.adjustments.dhuhr = params.adjustments.dhuhr;
  calcParams.adjustments.asr = params.adjustments.asr;
  calcParams.adjustments.maghrib = params.adjustments.maghrib;
  calcParams.adjustments.isha = params.adjustments.isha;

  const [year, month, day] = date.split('-').map(Number);
  // Setting noon (12:00) ensures date components are stable regardless of host timezone DST shifts
  const jsDate = new Date(year, month - 1, day, 12, 0, 0);

  let adhanTimes = new AdhanPrayerTimes(adhanCoords, jsDate, calcParams);

  // High-latitude / polar fallback handling (PRAYER_ENGINE.md §8):
  // 1. If Fajr or Isha is NaN/invalid, fall back to MiddleOfTheNight
  if (isNaN(adhanTimes.fajr?.getTime?.() ?? NaN) || isNaN(adhanTimes.isha?.getTime?.() ?? NaN)) {
    calcParams.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight;
    adhanTimes = new AdhanPrayerTimes(adhanCoords, jsDate, calcParams);
  }

  // 2. If still NaN/invalid and polar resolution is Unresolved, fall back to AqrabYaum
  if (
    (isNaN(adhanTimes.fajr?.getTime?.() ?? NaN) || isNaN(adhanTimes.isha?.getTime?.() ?? NaN)) &&
    calcParams.polarCircleResolution === PolarCircleResolution.Unresolved
  ) {
    calcParams.polarCircleResolution = PolarCircleResolution.AqrabYaum;
    adhanTimes = new AdhanPrayerTimes(adhanCoords, jsDate, calcParams);
  }

  const fajr = DateTime.fromJSDate(adhanTimes.fajr, { zone });
  const sunrise = DateTime.fromJSDate(adhanTimes.sunrise, { zone });
  const dhuhr = DateTime.fromJSDate(adhanTimes.dhuhr, { zone });
  const asr = DateTime.fromJSDate(adhanTimes.asr, { zone });
  const maghrib = DateTime.fromJSDate(adhanTimes.maghrib, { zone });
  const isha = DateTime.fromJSDate(adhanTimes.isha, { zone });

  if (
    !fajr.isValid ||
    !sunrise.isValid ||
    !dhuhr.isValid ||
    !asr.isValid ||
    !maghrib.isValid ||
    !isha.isValid
  ) {
    throw new Error(`Failed to calculate valid prayer times for date ${date} in timezone ${zone}`);
  }

  return {
    date,
    timezone: zone,
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
  };
}

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
