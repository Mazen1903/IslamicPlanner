import type {
  TemporalEnvironment,
  Coordinates,
  LocationMode,
} from './types';
import type { PrayerCalculationParams } from '@/domain/prayer/types';
import type { PlanningDayConfig } from '@/domain/planning-day/types';
import { isSignificantMovement } from './haversine';

export interface CandidateEnvironment {
  coordinates: Coordinates;
  timezone: string;
  calculationParams?: PrayerCalculationParams;
  planningDayConfig?: PlanningDayConfig;
  mode?: LocationMode;
}

function areAdjustmentsEqual(
  a: PrayerCalculationParams['adjustments'],
  b: PrayerCalculationParams['adjustments']
): boolean {
  return (
    a.fajr === b.fajr &&
    a.sunrise === b.sunrise &&
    a.dhuhr === b.dhuhr &&
    a.asr === b.asr &&
    a.maghrib === b.maghrib &&
    a.isha === b.isha
  );
}

function areCalculationParamsEqual(
  a: PrayerCalculationParams,
  b: PrayerCalculationParams
): boolean {
  return (
    a.method === b.method &&
    a.asrMethod === b.asrMethod &&
    a.highLatitudeRule === b.highLatitudeRule &&
    a.polarCircleResolution === b.polarCircleResolution &&
    a.timezone === b.timezone &&
    areAdjustmentsEqual(a.adjustments, b.adjustments)
  );
}

function arePlanningDayConfigsEqual(a: PlanningDayConfig, b: PlanningDayConfig): boolean {
  if (a.mode !== b.mode) return false;
  if (a.mode === 'CUSTOM' && b.mode === 'CUSTOM') {
    return a.localTime === b.localTime;
  }
  return true;
}

/**
 * Pure comparator to evaluate whether a candidate environment represents a material change
 * requiring persistence and recalculation.
 *
 * Material if ANY:
 * - Current environment is null (unconfigured)
 * - Location mode changed (AUTO <-> MANUAL)
 * - Timezone identity changed
 * - Haversine distance >= 10 km
 * - Relevant prayer calculation params changed
 * - Planning-day configuration changed
 */
export function isMaterialChange(
  current: TemporalEnvironment | null,
  candidate: CandidateEnvironment
): boolean {
  if (!current) {
    return true;
  }

  // 1. Mode changed
  if (candidate.mode && candidate.mode !== current.location.source) {
    return true;
  }

  // 2. Timezone changed
  if (candidate.timezone !== current.location.timezone) {
    return true;
  }

  // 3. Movement >= 10 km
  if (
    isSignificantMovement(
      current.location.latitude,
      current.location.longitude,
      candidate.coordinates.latitude,
      candidate.coordinates.longitude
    )
  ) {
    return true;
  }

  // 4. Prayer calculation params changed
  if (
    candidate.calculationParams &&
    !areCalculationParamsEqual(current.calculationParams, candidate.calculationParams)
  ) {
    return true;
  }

  // 5. Planning day configuration changed
  if (
    candidate.planningDayConfig &&
    !arePlanningDayConfigsEqual(current.planningDayConfig, candidate.planningDayConfig)
  ) {
    return true;
  }

  return false;
}
