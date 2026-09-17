import { Asset } from 'expo-asset';
import type { CityRecord } from './types';

let cachedDataset: CityRecord[] | null = null;
let loadPromise: Promise<CityRecord[]> | null = null;

/**
 * Reads text content from a resolved asset URI across:
 * - Production React Native (Android / iOS) via native fetch which supports file://, http(s)://, and asset://
 * - Web runtime via browser fetch
 * - Node / Jest test runner with fallback to filesystem for local test runs
 */
async function readAssetUri(uri: string): Promise<string> {
  // In Jest / Node test environments, expo-asset returns a mock uri and node fetch fails on local schemes.
  // Read directly from the project asset file in test environments.
  if (
    typeof process !== 'undefined' &&
    (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test')
  ) {
    try {
      const fsMod = 'fs';
      const pathMod = 'path';
      const urlMod = 'url';
      const fs = typeof module !== 'undefined' && module.require ? module.require(fsMod) : null;
      const path = typeof module !== 'undefined' && module.require ? module.require(pathMod) : null;
      const url = typeof module !== 'undefined' && module.require ? module.require(urlMod) : null;

      if (fs && path) {
        let filePath = uri;
        if (filePath.startsWith('file://') && url) {
          filePath = url.fileURLToPath(filePath);
        }
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath, 'utf8');
        }
        // Fallback path in project structure for Jest
        const fallbackPath = path.resolve(__dirname, '../../assets/cities.dat');
        if (fs.existsSync(fallbackPath)) {
          return fs.readFileSync(fallbackPath, 'utf8');
        }
      }
    } catch {
      // Fall through to fetch
    }
  }

  const response = await fetch(uri);
  if (!response.ok && response.status !== 0) {
    throw new Error(`Failed to read city dataset asset from ${uri}: HTTP ${response.status}`);
  }
  return await response.text();
}

/**
 * Lazily loads the bundled offline city dataset from the cities.dat asset.
 *
 * CRITICAL ARCHITECTURAL REQUIREMENT:
 * Must NOT be loaded during app startup, Today view initialization,
 * or SetupRequiredState rendering. It enters memory only when the user
 * engages the manual location search experience.
 */
export async function loadCityDataset(): Promise<CityRecord[]> {
  if (cachedDataset) {
    return cachedDataset;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      // Dynamic require ensures the asset reference is not touched until needed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const assetModule = require('@/assets/cities.dat');
      const asset = Asset.fromModule(assetModule);
      await asset.downloadAsync();

      const targetUri = asset.localUri ?? asset.uri;
      if (!targetUri) {
        throw new Error('City dataset asset URI could not be resolved');
      }

      const rawText = await readAssetUri(targetUri);
      const records = JSON.parse(rawText) as CityRecord[];

      cachedDataset = records;
      return cachedDataset;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
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
  loadPromise = null;
}
