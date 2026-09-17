/**
 * Canonical Haversine distance calculator.
 * Used to determine significant physical movement for prayer timetable recalculation.
 */

export const SIGNIFICANT_MOVEMENT_KM = 10;
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two points on the Earth's surface in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Clamp 'a' to [0, 1] to avoid domain errors in sqrt/asin
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return EARTH_RADIUS_KM * c;
}

/**
 * Returns true if the distance between two coordinate pairs is greater than or equal to the threshold.
 */
export function isSignificantMovement(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  thresholdKm: number = SIGNIFICANT_MOVEMENT_KM
): boolean {
  return calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) >= thresholdKm;
}
