import type { Coordinates, PrayerCalculationParams } from './types';

/**
 * Normalizes coordinate component to 2 decimal places (~1.1 km precision)
 * and guards against '-0.00'.
 */
function formatCoordinate(value: number): string {
  const fixed = value.toFixed(2);
  return fixed === '-0.00' ? '0.00' : fixed;
}

/**
 * Computes a deterministic fingerprint of all prayer calculation inputs.
 * Used as the cache key for prayer time results (PRAYER_ENGINE.md §9).
 *
 * Invariant:
 * - Same effective inputs -> same fingerprint
 * - Any effective input change -> different fingerprint
 */
export function calculationConfigFingerprint(
  date: string,
  coordinates: Coordinates,
  params: PrayerCalculationParams
): string {
  const components = [
    date,
    formatCoordinate(coordinates.latitude),
    formatCoordinate(coordinates.longitude),
    params.timezone,
    params.method,
    params.asrMethod,
    params.highLatitudeRule,
    params.polarCircleResolution,
    params.adjustments.fajr.toString(),
    params.adjustments.sunrise.toString(),
    params.adjustments.dhuhr.toString(),
    params.adjustments.asr.toString(),
    params.adjustments.maghrib.toString(),
    params.adjustments.isha.toString(),
  ];

  return components.join('|');
}
