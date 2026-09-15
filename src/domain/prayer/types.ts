import type { DateTime } from 'luxon';
import type { Prayer } from '@/constants/prayers';

export type { Prayer } from '@/constants/prayers';
export { PRAYERS, PRAYER_ORDER, PRAYER_NAMES } from '@/constants/prayers';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type CalculationMethodKey =
  | 'MWL'
  | 'ISNA'
  | 'EGYPT'
  | 'MAKKAH'
  | 'KARACHI'
  | 'TEHRAN'
  | 'SINGAPORE'
  | 'TURKEY'
  | 'DUBAI'
  | 'QATAR'
  | 'KUWAIT'
  | 'MOONSIGHTING';

export type AsrMethodKey = 'SHAFI' | 'HANAFI';

export type HighLatitudeRuleKey =
  | 'MIDDLE_OF_NIGHT'
  | 'ONE_SEVENTH'
  | 'ANGLE_BASED'
  | 'AUTO';

export type PolarCircleResolutionKey =
  | 'AQRAB_YAUM'
  | 'AQRAB_BALAD'
  | 'UNRESOLVED';

export interface PrayerAdjustments {
  fajr: number; // minutes
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerCalculationParams {
  method: CalculationMethodKey;
  asrMethod: AsrMethodKey;
  highLatitudeRule: HighLatitudeRuleKey;
  polarCircleResolution: PolarCircleResolutionKey;
  adjustments: PrayerAdjustments;
  timezone: string; // IANA timezone string
}

export interface PrayerTimesResult {
  date: string; // ISO date 'YYYY-MM-DD'
  timezone: string; // IANA timezone
  fajr: DateTime;
  sunrise: DateTime;
  dhuhr: DateTime;
  asr: DateTime;
  maghrib: DateTime;
  isha: DateTime;
}

export interface PrayerPeriodInstance {
  prayer: Prayer;
  start: DateTime;
  end: DateTime;
  fullPeriodStart: DateTime;
  fullPeriodEnd: DateTime;
  sourceDate: string; // 'YYYY-MM-DD'
}

export interface PrayerTimeline {
  periods: PrayerPeriodInstance[];
  findPeriod(time: DateTime): PrayerPeriodInstance;
}

export interface PrayerEngineAPI {
  /**
   * Calculate prayer times for a specific date and location.
   * Returns absolute DateTimes in the location's timezone.
   */
  calculate(
    date: string,
    coordinates: Coordinates,
    params: PrayerCalculationParams
  ): PrayerTimesResult;

  /**
   * Calculate prayer times for a date range (batch).
   */
  calculateRange(
    startDate: string,
    endDate: string,
    coordinates: Coordinates,
    params: PrayerCalculationParams
  ): Map<string, PrayerTimesResult>;

  /**
   * Build a PrayerTimeline spanning 3 consecutive days centered on centerDate.
   * The timeline contains contiguous PrayerPeriodInstance records covering
   * [prevDate Fajr, nextDate Isha (ends at dayAfterNext Fajr)] — enough to resolve any
   * time within the center date's planning day regardless of planning-day configuration.
   */
  buildPrayerTimeline(
    centerDate: string,
    coordinates: Coordinates,
    params: PrayerCalculationParams
  ): PrayerTimeline;

  /**
   * Determine which prayer period a given time falls in,
   * using the full timeline rather than a single day's prayer times.
   */
  getCurrentPrayer(
    now: DateTime,
    timeline: PrayerTimeline
  ): Prayer;

  /**
   * Get the next prayer after a given time.
   */
  getNextPrayer(
    now: DateTime,
    timeline: PrayerTimeline
  ): { prayer: Prayer; time: DateTime };

  /**
   * Recommend a calculation method based on coordinates.
   */
  recommendCalculationMethod(coordinates: Coordinates): CalculationMethodKey;

  /**
   * Compute a deterministic fingerprint of all calculation inputs.
   * Used as the cache key for prayer time results.
   */
  calculationConfigFingerprint(
    date: string,
    coordinates: Coordinates,
    params: PrayerCalculationParams
  ): string;
}
