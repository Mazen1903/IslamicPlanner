import type { CityRecord } from './types';

let cachedDataset: CityRecord[] | null = null;

/**
 * Lazily loads the bundled offline city dataset.
 *
 * CRITICAL ARCHITECTURAL REQUIREMENT:
 * Must NOT be loaded during app startup, Today view initialization,
 * or SetupRequiredState rendering. It enters memory only when the user
 * engages the manual location search experience.
 */
export async function loadCityDataset(): Promise<CityRecord[]> {
  if (!cachedDataset) {
    // Dynamic require ensures the 22MB asset is not parsed until needed
    const raw = require('@/assets/cities.json');
    cachedDataset = raw as CityRecord[];
  }
  return cachedDataset;
}

/**
 * Synchronous accessor that returns the dataset if already loaded into memory.
 */
export function getLoadedCityDataset(): CityRecord[] | null {
  return cachedDataset;
}

/**
 * Resets the in-memory cache (primarily for tests).
 */
export function clearCityDatasetCache(): void {
  cachedDataset = null;
}
