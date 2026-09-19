import { DateTime } from 'luxon';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import type { PrayerCalculationParams } from '@/domain/prayer/types';
import { resolvePlanningDayForTime } from '../PlanningDayEngine';
import type { PlanningDayConfig } from '../types';

describe('PlanningDayBoundary (PDB-01 to PDB-11)', () => {
  const chicago = {
    coords: { latitude: 41.8781, longitude: -87.6298 },
    tz: 'America/Chicago',
  };

  const params: PrayerCalculationParams = {
    method: 'ISNA',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    timezone: chicago.tz,
  };

  const fajrConfig: PlanningDayConfig = { mode: 'FAJR' };
  const midnightConfig: PlanningDayConfig = { mode: 'MIDNIGHT' };
  const customConfig: PlanningDayConfig = { mode: 'CUSTOM', localTime: '19:00' };

  describe('Fajr Boundary (PDB-01..PDB-03)', () => {
    const centerDate = '2026-09-15';
    const timeline = buildPrayerTimeline(centerDate, chicago.coords, params);
    const fajrPeriod = timeline.periods.find(
      (p) => p.prayer === 'FAJR' && p.sourceDate === centerDate
    )!;
    const boundary = fajrPeriod.start;

    it('PDB-01: Fajr boundary: time at boundary - 1s resolves to prior planningDayKey', () => {
      const time = boundary.minus({ seconds: 1 });
      const pd = resolvePlanningDayForTime(fajrConfig, timeline, time);
      expect(pd.key).toBe('2026-09-14');
    });

    it('PDB-02: Fajr boundary: time at exact boundary resolves to current planningDayKey', () => {
      const time = boundary;
      const pd = resolvePlanningDayForTime(fajrConfig, timeline, time);
      expect(pd.key).toBe('2026-09-15');
    });

    it('PDB-03: Fajr boundary: time at boundary + 1s resolves to current planningDayKey', () => {
      const time = boundary.plus({ seconds: 1 });
      const pd = resolvePlanningDayForTime(fajrConfig, timeline, time);
      expect(pd.key).toBe('2026-09-15');
    });
  });

  describe('Midnight Boundary (PDB-04..PDB-06)', () => {
    const centerDate = '2026-09-15';
    const timeline = buildPrayerTimeline(centerDate, chicago.coords, params);
    // Use the midnight boundary between 2026-09-15 and 2026-09-16 covered by timeline
    const boundary = DateTime.fromISO('2026-09-16T00:00:00', { zone: chicago.tz });

    it('PDB-04: Midnight boundary: time at boundary - 1s resolves to prior planningDayKey', () => {
      const time = boundary.minus({ seconds: 1 });
      const pd = resolvePlanningDayForTime(midnightConfig, timeline, time);
      expect(pd.key).toBe('2026-09-15');
    });

    it('PDB-05: Midnight boundary: time at exact boundary resolves to current planningDayKey', () => {
      const time = boundary;
      const pd = resolvePlanningDayForTime(midnightConfig, timeline, time);
      expect(pd.key).toBe('2026-09-16');
    });

    it('PDB-06: Midnight boundary: time at boundary + 1s resolves to current planningDayKey', () => {
      const time = boundary.plus({ seconds: 1 });
      const pd = resolvePlanningDayForTime(midnightConfig, timeline, time);
      expect(pd.key).toBe('2026-09-16');
    });
  });

  describe('Custom Boundary (PDB-07..PDB-09)', () => {
    const centerDate = '2026-09-15';
    const timeline = buildPrayerTimeline(centerDate, chicago.coords, params);
    // Custom 19:00 boundary on 2026-09-15 transitions from prior day (2026-09-15) to current day (2026-09-16)
    const boundary = DateTime.fromISO('2026-09-15T19:00:00', { zone: chicago.tz });

    it('PDB-07: Custom boundary: time at boundary - 1s resolves to prior planningDayKey', () => {
      const time = boundary.minus({ seconds: 1 });
      const pd = resolvePlanningDayForTime(customConfig, timeline, time);
      expect(pd.key).toBe('2026-09-15');
    });

    it('PDB-08: Custom boundary: time at exact boundary resolves to current planningDayKey', () => {
      const time = boundary;
      const pd = resolvePlanningDayForTime(customConfig, timeline, time);
      expect(pd.key).toBe('2026-09-16');
    });

    it('PDB-09: Custom boundary: time at boundary + 1s resolves to current planningDayKey', () => {
      const time = boundary.plus({ seconds: 1 });
      const pd = resolvePlanningDayForTime(customConfig, timeline, time);
      expect(pd.key).toBe('2026-09-16');
    });
  });

  describe('DST Stability (PDB-10..PDB-11)', () => {
    it('PDB-10: planningDayKey format is stable across DST spring-forward (23-hour day)', () => {
      // March 8, 2026 in America/Chicago: spring forward occurs (23h civil day)
      const springDate = '2026-03-08';
      const timeline = buildPrayerTimeline(springDate, chicago.coords, params);

      // Midday on spring-forward day
      const midday = DateTime.fromISO('2026-03-08T12:00:00', { zone: chicago.tz });
      const pdFajr = resolvePlanningDayForTime(fajrConfig, timeline, midday);
      expect(pdFajr.key).toBe('2026-03-08');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(pdFajr.key)).toBe(true);

      const pdMidnight = resolvePlanningDayForTime(midnightConfig, timeline, midday);
      expect(pdMidnight.key).toBe('2026-03-08');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(pdMidnight.key)).toBe(true);

      // Verify duration of midnight planning day across spring-forward is exactly 23 hours
      const diffHours = pdMidnight.end.diff(pdMidnight.start, 'hours').hours;
      expect(diffHours).toBe(23);
    });

    it('PDB-11: planningDayKey format is stable across DST fall-back (25-hour day)', () => {
      // November 1, 2026 in America/Chicago: fall back occurs (25h civil day)
      const fallDate = '2026-11-01';
      const timeline = buildPrayerTimeline(fallDate, chicago.coords, params);

      // Midday on fall-back day
      const midday = DateTime.fromISO('2026-11-01T12:00:00', { zone: chicago.tz });
      const pdFajr = resolvePlanningDayForTime(fajrConfig, timeline, midday);
      expect(pdFajr.key).toBe('2026-11-01');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(pdFajr.key)).toBe(true);

      const pdMidnight = resolvePlanningDayForTime(midnightConfig, timeline, midday);
      expect(pdMidnight.key).toBe('2026-11-01');
      expect(/^\d{4}-\d{2}-\d{2}$/.test(pdMidnight.key)).toBe(true);

      // Verify duration of midnight planning day across fall-back is exactly 25 hours
      const diffHours = pdMidnight.end.diff(pdMidnight.start, 'hours').hours;
      expect(diffHours).toBe(25);
    });
  });
});
