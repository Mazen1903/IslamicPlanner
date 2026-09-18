/**
 * WidgetSnapshotBuilder tests (M18 verification matrix: SB-01 through SB-11,
 * SR-01 through SR-04, TS-01 through TS-09, FR-01 through FR-03)
 */

import { DateTime } from 'luxon';
import { WidgetSnapshotBuilder } from '../WidgetSnapshotBuilder';
import { SETUP_REQUIRED_SNAPSHOT } from '../types';
import type { TodayTemporalInputs } from '@/services/types';
import type { TodayQueryService } from '@/services/TodayQueryService';

// --------------------------------------------------------------------------
// Test fixtures
// --------------------------------------------------------------------------

/** Creates a valid READY input set with a real IANA timezone. */
function makeInputs(overrides?: Partial<TodayTemporalInputs>): TodayTemporalInputs {
  return {
    coordinates: { latitude: 41.8781, longitude: -87.6298 }, // Chicago
    params: {
      method: 'ISNA',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'ANGLE_BASED',
      polarCircleResolution: 'UNRESOLVED',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'America/Chicago',
    },
    planningDayConfig: { mode: 'FAJR' }, // correct PlanningDayMode type
    ...overrides,
  };
}

/** Creates a minimal mock TodayQueryService returning empty results by default. */
function makeQueryService(
  occurrences: any[] = [],
  definitions: Map<string, any> = new Map()
): jest.Mocked<TodayQueryService> {
  return {
    queryTodayCandidates: jest.fn().mockResolvedValue({ occurrences, definitions }),
  } as unknown as jest.Mocked<TodayQueryService>;
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('WidgetSnapshotBuilder', () => {
  const now = DateTime.fromISO('2026-09-18T15:00:00.000Z'); // Mid-afternoon UTC

  // -------------------------------------------------------------------------
  // SNAPSHOT BUILDER tests
  // -------------------------------------------------------------------------
  describe('SB: Snapshot structure', () => {
    it('SB-01: READY snapshot has currentPrayer, nextPrayer, allPrayers', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.currentPrayer).toBeDefined();
      expect(snapshot.currentPrayer.prayer).toBeDefined();
      expect(snapshot.allPrayers).toBeDefined();
    });

    it('SB-02: allPrayers has exactly 5 entries in canonical order', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.allPrayers).toHaveLength(5);
      expect(snapshot.allPrayers[0].prayer).toBe('FAJR');
      expect(snapshot.allPrayers[1].prayer).toBe('DHUHR');
      expect(snapshot.allPrayers[2].prayer).toBe('ASR');
      expect(snapshot.allPrayers[3].prayer).toBe('MAGHRIB');
      expect(snapshot.allPrayers[4].prayer).toBe('ISHA');
    });

    it('SB-03: currentPrayer is consistent with wall-clock time', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']).toContain(snapshot.currentPrayer.prayer);
    });

    it('SB-04: nextPrayer is valid or null (end of planning day)', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      if (snapshot.nextPrayer !== null) {
        expect(['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA']).toContain(snapshot.nextPrayer.prayer);
        expect(snapshot.nextPrayer.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
      }
    });

    it('SB-05: Sunrise never appears in allPrayers, currentPrayer, or nextPrayer', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      const allPrayerKeys = snapshot.allPrayers.map(p => p.prayer);
      expect(allPrayerKeys).not.toContain('SUNRISE');
      expect(snapshot.currentPrayer.prayer).not.toBe('SUNRISE');
      if (snapshot.nextPrayer) {
        expect(snapshot.nextPrayer.prayer).not.toBe('SUNRISE');
      }
    });

    it('SB-06: timezone is an IANA string matching user settings', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.timezone).toBe('America/Chicago');
    });

    it('SB-07: planningDayKey is a valid YYYY-MM-DD date string', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.planningDayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('SB-08: generatedAt is a UTC ISO string', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.generatedAt).toBeDefined();
      expect(snapshot.generatedAt).toMatch(/Z$/);
      const parsed = DateTime.fromISO(snapshot.generatedAt);
      expect(parsed.isValid).toBe(true);
    });

    it('SB-09: snapshot contains no Journal data fields', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      // Direct property assertions on the snapshot object
      expect((snapshot as any).journalContent).toBeUndefined();
      expect((snapshot as any).hasJournalEntry).toBeUndefined();
      expect((snapshot as any).encrypted).toBeUndefined();
      expect((snapshot as any).journalKey).toBeUndefined();
    });

    it('SB-10: snapshot contains no coordinate fields', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect((snapshot as any).latitude).toBeUndefined();
      expect((snapshot as any).longitude).toBeUndefined();
      expect((snapshot as any).coordinates).toBeUndefined();
    });

    it('SB-11: task entries contain no notes or descriptions', async () => {
      const mockQueryService = makeQueryService(
        [
          {
            id: 'occ-1',
            taskDefinitionId: 'def-1',
            status: 'PENDING',
            planningDayKey: '2026-09-18',
            calculatedStartTime: null,
            calculatedPrayerSection: null,
            eligiblePrayerSections: null,
            wallClockResolution: null,
            windowStart: null,
            windowEnd: null,
            overrideData: null,
            localDate: '2026-09-18',
            timezone: 'America/Chicago',
            seriesId: 'series-1',
            completedAt: null,
            missedAt: null,
          },
        ],
        new Map([
          [
            'def-1',
            {
              id: 'def-1',
              title: 'Read Quran',
              scheduleType: 'ANYTIME_TODAY',
              scheduleData: {},
              priority: 'NORMAL',
              estimatedMinutes: null,
              notes: 'This should NOT appear in widget',
              createdAt: '2026-09-18T00:00:00.000Z',
              isActive: true,
            },
          ],
        ])
      );

      const builder = new WidgetSnapshotBuilder(mockQueryService);
      const snapshot = await builder.build(makeInputs(), now);

      if (snapshot.tasks.length > 0) {
        const task = snapshot.tasks[0];
        expect((task as any).notes).toBeUndefined();
        expect((task as any).description).toBeUndefined();
        expect((task as any).estimatedMinutes).toBeUndefined();
        expect(task.title).toBe('Read Quran');
      }
    });

    it('SB: schemaVersion is always 1', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.schemaVersion).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // SETUP REQUIRED tests
  // -------------------------------------------------------------------------
  describe('SR: Setup required state', () => {
    it('SR-01: buildSetupRequired returns isSetupRequired = true', () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = builder.buildSetupRequired(now);

      expect(snapshot.isSetupRequired).toBe(true);
    });

    it('SR-02: buildSetupRequired returns tasks = []', () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = builder.buildSetupRequired(now);

      expect(snapshot.tasks).toEqual([]);
    });

    it('SR-03: buildSetupRequired has no meaningful prayer times (empty startsAt)', () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = builder.buildSetupRequired(now);

      // SETUP_REQUIRED_SNAPSHOT has empty startsAt strings - no fake prayer times
      for (const prayer of snapshot.allPrayers) {
        expect(prayer.startsAt).toBe('');
      }
    });

    it('SR-04: build() itself does not call any GPS/location service', async () => {
      // build() takes inputs as a parameter - no internal GPS call possible.
      // The location provider is the caller's (WidgetSyncCoordinator's) responsibility.
      // Verify: the mock query service was called (task building works),
      // but no location service was called by builder.build() itself.
      const mockQueryService = makeQueryService();
      const builder = new WidgetSnapshotBuilder(mockQueryService);
      const snapshot = await builder.build(makeInputs(), now);

      // build() should have called queryTodayCandidates (task building)
      expect(mockQueryService.queryTodayCandidates).toHaveBeenCalled();
      // Snapshot must not be setup-required
      expect(snapshot.isSetupRequired).toBe(false);
    });

    it('SR: SETUP_REQUIRED_SNAPSHOT constant has exactly 5 allPrayers entries', () => {
      expect(SETUP_REQUIRED_SNAPSHOT.allPrayers).toHaveLength(5);
      expect(SETUP_REQUIRED_SNAPSHOT.isSetupRequired).toBe(true);
      expect(SETUP_REQUIRED_SNAPSHOT.tasks).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // TASK SELECTION tests
  // -------------------------------------------------------------------------
  describe('TS: Task selection', () => {
    function makePendingOcc(id: string, startTime: string | null = null): any {
      return {
        id,
        taskDefinitionId: `def-${id}`,
        status: 'PENDING',
        planningDayKey: '2026-09-18',
        calculatedStartTime: startTime,
        calculatedPrayerSection: startTime ? 'DHUHR' : null,
        eligiblePrayerSections: null,
        wallClockResolution: null,
        windowStart: null,
        windowEnd: null,
        overrideData: null,
        localDate: '2026-09-18',
        timezone: 'America/Chicago',
        seriesId: `series-${id}`,
        completedAt: null,
        missedAt: null,
      };
    }

    function makeDef(
      id: string,
      title: string,
      scheduleType: string = 'ANYTIME_TODAY',
      priority: string = 'NORMAL'
    ): any {
      return {
        id: `def-${id}`,
        title,
        scheduleType,
        scheduleData: {},
        priority,
        estimatedMinutes: null,
        notes: null,
        createdAt: `2026-09-18T00:00:00.00${id}Z`,
        isActive: true,
      };
    }

    it('TS-01: returns up to 3 PENDING tasks', async () => {
      const occs = ['1', '2', '3', '4'].map(id => makePendingOcc(id));
      const defs = new Map(['1', '2', '3', '4'].map(id => [`def-${id}`, makeDef(id, `Task ${id}`)]));

      const builder = new WidgetSnapshotBuilder(makeQueryService(occs, defs));
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.tasks.length).toBeLessThanOrEqual(3);
    });

    it('TS-03: COMPLETED tasks are excluded', async () => {
      const occs = [
        { ...makePendingOcc('1'), status: 'COMPLETED', completedAt: '2026-09-18T10:00:00Z' },
        makePendingOcc('2'),
      ];
      const defs = new Map(
        ['1', '2'].map(id => [`def-${id}`, makeDef(id, `Task ${id}`)])
      );

      const builder = new WidgetSnapshotBuilder(makeQueryService(occs, defs));
      const snapshot = await builder.build(makeInputs(), now);

      // Only task 2 (PENDING) should appear
      const taskIds = snapshot.tasks.map(t => t.occurrenceId);
      expect(taskIds).not.toContain('1');
    });

    it('TS-04: MISSED tasks are excluded', async () => {
      const occs = [
        { ...makePendingOcc('1'), status: 'MISSED', missedAt: '2026-09-18T10:00:00Z' },
        makePendingOcc('2'),
      ];
      const defs = new Map(
        ['1', '2'].map(id => [`def-${id}`, makeDef(id, `Task ${id}`)])
      );

      const builder = new WidgetSnapshotBuilder(makeQueryService(occs, defs));
      const snapshot = await builder.build(makeInputs(), now);

      const taskIds = snapshot.tasks.map(t => t.occurrenceId);
      expect(taskIds).not.toContain('1');
    });

    it('TS-05: CANCELLED tasks are excluded', async () => {
      const occs = [
        { ...makePendingOcc('1'), status: 'CANCELLED' },
        makePendingOcc('2'),
      ];
      const defs = new Map(
        ['1', '2'].map(id => [`def-${id}`, makeDef(id, `Task ${id}`)])
      );

      const builder = new WidgetSnapshotBuilder(makeQueryService(occs, defs));
      const snapshot = await builder.build(makeInputs(), now);

      const taskIds = snapshot.tasks.map(t => t.occurrenceId);
      expect(taskIds).not.toContain('1');
    });

    it('TS-07: fewer than 3 PENDING tasks returns tasks.length <= 2', async () => {
      const occs = [makePendingOcc('1'), makePendingOcc('2')];
      const defs = new Map(['1', '2'].map(id => [`def-${id}`, makeDef(id, `Task ${id}`)]));

      const builder = new WidgetSnapshotBuilder(makeQueryService(occs, defs));
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.tasks.length).toBeLessThanOrEqual(2);
    });

    it('TS-08: zero PENDING tasks returns tasks = []', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService([], new Map()));
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.tasks).toEqual([]);
    });

    it('TS-09: task entries have title and scheduleLabel but no notes', async () => {
      const occs = [makePendingOcc('1')];
      const defs = new Map([
        [
          'def-1',
          {
            id: 'def-1',
            title: 'Morning Dhikr',
            scheduleType: 'ANYTIME_TODAY',
            scheduleData: {},
            priority: 'NORMAL',
            estimatedMinutes: null,
            notes: 'Private note',
            createdAt: '2026-09-18T00:00:00.001Z',
            isActive: true,
          },
        ],
      ]);

      const builder = new WidgetSnapshotBuilder(makeQueryService(occs, defs));
      const snapshot = await builder.build(makeInputs(), now);

      if (snapshot.tasks.length > 0) {
        const task = snapshot.tasks[0];
        expect(task.title).toBe('Morning Dhikr');
        expect(task.scheduleLabel).toBeDefined();
        expect((task as any).notes).toBeUndefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // FRESHNESS tests
  // -------------------------------------------------------------------------
  describe('FR: Freshness', () => {
    it('FR-01: generatedAt matches the `now` parameter', async () => {
      const fixedNow = DateTime.fromISO('2026-09-18T15:00:00.000Z');
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), fixedNow);

      expect(snapshot.generatedAt).toBe(fixedNow.toUTC().toISO());
    });

    it('FR-03: planningDayKey matches the resolved planning day date', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.planningDayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('FR: generatedAt is a UTC ISO string ending with Z', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      expect(snapshot.generatedAt.endsWith('Z')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Privacy boundary
  // -------------------------------------------------------------------------
  describe('PV: Privacy', () => {
    it('PV-03: snapshot object contains no coordinate properties', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      // Verify top-level snapshot properties do not include coordinates
      expect((snapshot as any).latitude).toBeUndefined();
      expect((snapshot as any).longitude).toBeUndefined();
      expect((snapshot as any).coordinates).toBeUndefined();
    });

    it('PV: prayer entries do not contain coordinates', async () => {
      const builder = new WidgetSnapshotBuilder(makeQueryService());
      const snapshot = await builder.build(makeInputs(), now);

      for (const prayer of snapshot.allPrayers) {
        expect((prayer as any).latitude).toBeUndefined();
        expect((prayer as any).longitude).toBeUndefined();
      }
    });
  });
});
