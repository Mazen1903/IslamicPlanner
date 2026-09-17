import type { CityRecord } from './types';
import { getLoadedCityDataset } from './cityLoader';

/**
 * Pure offline city search.
 *
 * Requirements:
 * - Empty or < 2 characters returns empty array (no unbounded search)
 * - Case-insensitive
 * - Deterministic
 * - Ranking: Exact match > Prefix match > Substring match
 * - Bounded result count (default 20)
 * - Country identifier & adminCode available on results for disambiguation
 */
export function searchCities(
  query: string,
  limit: number = 20,
  dataset?: CityRecord[]
): CityRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) {
    return [];
  }

  const cities = dataset ?? getLoadedCityDataset() ?? [];
  if (cities.length === 0) {
    return [];
  }

  const exactMatches: CityRecord[] = [];
  const prefixMatches: CityRecord[] = [];
  const substringMatches: CityRecord[] = [];

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const nameLower = city.name.toLowerCase();

    if (nameLower === q) {
      exactMatches.push(city);
      if (exactMatches.length >= limit) {
        return exactMatches.slice(0, limit);
      }
    } else if (nameLower.startsWith(q)) {
      prefixMatches.push(city);
    } else if (nameLower.includes(q)) {
      // Collect substring matches up to limit to avoid unnecessary memory
      if (exactMatches.length + prefixMatches.length + substringMatches.length < limit * 2) {
        substringMatches.push(city);
      }
    }
  }

  const combined = [...exactMatches, ...prefixMatches, ...substringMatches];
  return combined.slice(0, limit);
}
