import {
  loadCityDataset,
  getLoadedCityDataset,
  clearCityDatasetCache,
} from '../cityLoader';
import { searchCities } from '../citySearch';

describe('cityLoader', () => {
  beforeEach(() => {
    clearCityDatasetCache();
  });

  afterEach(() => {
    clearCityDatasetCache();
  });

  it('dataset is null before load', () => {
    expect(getLoadedCityDataset()).toBeNull();
  });

  it('first load parses asset and returns city records', async () => {
    expect(getLoadedCityDataset()).toBeNull();
    const cities = await loadCityDataset();

    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBe(171035);
    expect(getLoadedCityDataset()).toBe(cities);

    // Verify sample records
    const makkah = cities.find(c => c.id === '104515');
    expect(makkah).toBeDefined();
    expect(makkah?.name).toBe('Makkah');
    expect(makkah?.timezone).toBe('Asia/Riyadh');
  });

  it('second load uses cache (returns same reference)', async () => {
    const firstLoad = await loadCityDataset();
    const secondLoad = await loadCityDataset();

    expect(secondLoad).toBe(firstLoad);
    expect(getLoadedCityDataset()).toBe(firstLoad);
  });

  it('clear cache behaves according to existing contract', async () => {
    await loadCityDataset();
    expect(getLoadedCityDataset()).not.toBeNull();

    clearCityDatasetCache();
    expect(getLoadedCityDataset()).toBeNull();

    // Reloads cleanly after clear
    const reloaded = await loadCityDataset();
    expect(reloaded).not.toBeNull();
    expect(reloaded.length).toBe(171035);
  });

  it('search produces correct results from loaded dataset', async () => {
    const cities = await loadCityDataset();
    const results = searchCities('Madinah', 10, cities);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Madinah');
    expect(results[0].countryCode).toBe('SA');
    expect(results[0].timezone).toBe('Asia/Riyadh');
  });

  it('all 171,035 records are available in generated asset and timezones are valid', async () => {
    const cities = await loadCityDataset();
    expect(cities.length).toBe(171035);

    // Verify representative records requested by prompt
    // 3038832: Andorra la Vella / Vila
    const record3038832 = cities.find(c => c.id === '3038832');
    expect(record3038832).toBeDefined();

    // Check sample of timezones for validity
    const sampleTimezones = new Set(cities.slice(0, 1000).map(c => c.timezone));
    for (const tz of sampleTimezones) {
      expect(() => new Intl.DateTimeFormat(undefined, { timeZone: tz })).not.toThrow();
    }
  });
});
