import {
  calculateHaversineDistanceKm,
  isSignificantMovement,
  SIGNIFICANT_MOVEMENT_KM,
} from '../haversine';

describe('Haversine Distance Calculator', () => {
  it('calculates zero distance for identical coordinates', () => {
    const lat = 41.8781;
    const lon = -87.6298;
    const dist = calculateHaversineDistanceKm(lat, lon, lat, lon);
    expect(dist).toBe(0);
    expect(isSignificantMovement(lat, lon, lat, lon)).toBe(false);
  });

  it('correctly classifies movements below 10 km threshold as insignificant', () => {
    // 0.05 degrees latitude is ~5.5 km
    const lat1 = 41.8781;
    const lon1 = -87.6298;
    const lat2 = 41.9281;
    const lon2 = -87.6298;

    const dist = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(SIGNIFICANT_MOVEMENT_KM);
    expect(isSignificantMovement(lat1, lon1, lat2, lon2)).toBe(false);
  });

  it('correctly classifies movements exactly at or above 10 km threshold as significant', () => {
    // 10.0 km distance test
    // 1 degree latitude is ~111.19 km, so 10 km is ~0.0899 degrees
    const lat1 = 0;
    const lon1 = 0;
    const lat2 = (10 / 6371) * (180 / Math.PI); // exact 10.0 km on equator
    const lon2 = 0;

    const dist = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
    expect(dist).toBeCloseTo(10.0, 4);
    expect(isSignificantMovement(lat1, lon1, lat2, lon2)).toBe(true);

    // 15 km is above threshold
    const lat3 = (15 / 6371) * (180 / Math.PI);
    expect(isSignificantMovement(lat1, lon1, lat3, lon2)).toBe(true);
  });

  it('calculates representative real-world coordinates with high accuracy', () => {
    // Makkah (21.4225, 39.8262) to Madinah (24.4672, 39.6111): ~340-350 km
    const makkah = { lat: 21.4225, lon: 39.8262 };
    const madinah = { lat: 24.4672, lon: 39.6111 };
    const makkahToMadinah = calculateHaversineDistanceKm(
      makkah.lat,
      makkah.lon,
      madinah.lat,
      madinah.lon
    );
    expect(makkahToMadinah).toBeGreaterThan(335);
    expect(makkahToMadinah).toBeLessThan(355);
    expect(isSignificantMovement(makkah.lat, makkah.lon, madinah.lat, madinah.lon)).toBe(true);

    // London (51.5074, -0.1278) to Paris (48.8566, 2.3522): ~343 km
    const londonToParis = calculateHaversineDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(londonToParis).toBeGreaterThan(330);
    expect(londonToParis).toBeLessThan(355);

    // Downtown Chicago to Lincoln Park (~5 km): insignificant
    const chicagoToLincolnPark = calculateHaversineDistanceKm(41.8781, -87.6298, 41.9214, -87.6513);
    expect(chicagoToLincolnPark).toBeLessThan(10);
    expect(isSignificantMovement(41.8781, -87.6298, 41.9214, -87.6513)).toBe(false);
  });
});
