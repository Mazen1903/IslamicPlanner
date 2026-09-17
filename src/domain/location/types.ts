import type { PrayerCalculationParams } from '@/domain/prayer/types';
import type { PlanningDayConfig } from '@/domain/planning-day/types';

export type { Coordinates, PrayerCalculationParams } from '@/domain/prayer/types';
export type { PlanningDayConfig } from '@/domain/planning-day/types';

export type LocationMode = 'AUTO' | 'MANUAL';

export interface EffectiveLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  cityName?: string | null;
  source: LocationMode;
}

export interface TemporalEnvironment {
  location: EffectiveLocation;
  calculationParams: PrayerCalculationParams;
  planningDayConfig: PlanningDayConfig;
}

export interface CityRecord {
  id: string;
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  adminCode?: string;
}
