import { searchCities } from '../citySearch';
import type { CityRecord } from '../types';

const mockCities: CityRecord[] = [
  {
    id: '1',
    name: 'Chicago',
    countryCode: 'US',
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: 'America/Chicago',
    adminCode: 'IL',
  },
  {
    id: '2',
    name: 'Chicago Heights',
    countryCode: 'US',
    latitude: 41.5061,
    longitude: -87.6359,
    timezone: 'America/Chicago',
    adminCode: 'IL',
  },
  {
    id: '3',
    name: 'East Chicago',
    countryCode: 'US',
    latitude: 41.6409,
    longitude: -87.4548,
    timezone: 'America/Chicago',
    adminCode: 'IN',
  },
  {
    id: '4',
    name: 'Springfield',
    countryCode: 'US',
    latitude: 39.7817,
    longitude: -89.6501,
    timezone: 'America/Chicago',
    adminCode: 'IL',
  },
  {
    id: '5',
    name: 'Springfield',
    countryCode: 'US',
    latitude: 42.1015,
    longitude: -72.5898,
    timezone: 'America/New_York',
    adminCode: 'MA',
  },
  {
    id: '6',
    name: 'Medina',
    countryCode: 'SA',
    latitude: 24.4672,
    longitude: 39.6111,
    timezone: 'Asia/Riyadh',
  },
];

describe('citySearch', () => {
  it('returns empty array when query is empty or less than 2 characters', () => {
    expect(searchCities('', 20, mockCities)).toEqual([]);
    expect(searchCities(' ', 20, mockCities)).toEqual([]);
    expect(searchCities('C', 20, mockCities)).toEqual([]);
    expect(searchCities(' c ', 20, mockCities)).toEqual([]);
  });

  it('performs case-insensitive search and ranks exact > prefix > substring', () => {
    const results = searchCities('chicago', 10, mockCities);
    expect(results).toHaveLength(3);

    // 1. Exact match "Chicago"
    expect(results[0].name).toBe('Chicago');
    expect(results[0].id).toBe('1');

    // 2. Prefix match "Chicago Heights"
    expect(results[1].name).toBe('Chicago Heights');
    expect(results[1].id).toBe('2');

    // 3. Substring match "East Chicago"
    expect(results[2].name).toBe('East Chicago');
    expect(results[2].id).toBe('3');
  });

  it('respects limit parameter', () => {
    const results = searchCities('chicago', 2, mockCities);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Chicago');
    expect(results[1].name).toBe('Chicago Heights');
  });

  it('provides adminCode for duplicate city names to enable disambiguation', () => {
    const results = searchCities('springfield', 10, mockCities);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Springfield');
    expect(results[1].name).toBe('Springfield');

    // Disambiguation via adminCode & timezone
    expect(results.some(r => r.adminCode === 'IL' && r.timezone === 'America/Chicago')).toBe(true);
    expect(results.some(r => r.adminCode === 'MA' && r.timezone === 'America/New_York')).toBe(true);
  });
});
