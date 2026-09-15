import { DatabaseSync } from 'node:sqlite';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { MaterializationEngine, materializationEngine } from './MaterializationEngine';
import { MaterializationError } from './types';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import type { PrayerCalculationParams } from '@/domain/prayer/types';
import type { PlanningDayConfig } from '@/domain/planning-day/types';
import { TaskValidationError } from '@/domain/task/errors';
import { SchedulingResolutionError, type SchedulingContext } from '@/domain/scheduling/types';

describe('MaterializationEngine (M6 Persistence Pipeline)', () => {
  let nodeDb: DatabaseSync;

  const LOCATIONS = {
    chicago: { latitude: 41.8781, longitude: -87.6298, tz: 'America/Chicago' },
    mecca: { latitude: 21.4225, longitude: 39.8262, tz: 'Asia/Riyadh' },
    newYork: { latitude: 40.7128, longitude: -74.006, tz: 'America/New_York' },
  };

  const defaultAdjustments = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  };

  const chicagoParams: PrayerCalculationParams = {
    method: 'ISNA',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: defaultAdjustments,
    timezone: LOCATIONS.chicago.tz,
  };

  const meccaParams: PrayerCalculationParams = {
    method: 'MAKKAH',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    adjustments: defaultAdjustments,
    timezone: LOCATIONS.mecca.tz,
  };

  const fajrConfig: PlanningDayConfig = { mode: 'FAJR' };

  function createTestContext(
    date: string = '2026-09-15',
    loc = LOCATIONS.chicago,
    params = chicagoParams,
    config = fajrConfig
  ): SchedulingContext {
    const timeline = buildPrayerTimeline(date, loc, params);
    return {
      timeline,
      planningDayConfig: config,
    };
  }

  beforeEach(() => {
    const testDb = createTestDatabase();
    nodeDb = testDb.nodeDb;
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  // =========================================================================
  // 1. IDENTITY (IDM)
  // =========================================================================
  describe('Identity (IDM)', () => {
    it('IDM-01: Repeated same logical key (seriesId + seed) produces exactly one row (CREATED then UPDATED)', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-idm-1',
        title: 'Daily Dhikr',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '18:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId: 'series-idm-1',
        seriesVersion: 1,
        effectiveFromDate: '2026-09-15',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');

      // First materialization: CREATED
      const res1 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );
      expect(res1.action).toBe('CREATED');
      expect(res1.occurrenceId).toBeDefined();

      // Second materialization with same key: UPDATED
      const res2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );
      expect(res2.action).toBe('UPDATED');
      expect(res2.occurrenceId).toBe(res1.occurrenceId);

      // Verify only 1 row exists in database
      const rows = nodeDb
        .prepare('SELECT id FROM task_occurrences WHERE series_id = ? AND local_date = ?')
        .all(def.seriesId, '2026-09-15');
      expect(rows).toHaveLength(1);
    });

    it('IDM-02: Lookup uses seriesId + seed, not definitionId + seed (correct row found after split)', async () => {
      const seriesId = 'series-split-lookup';
      // v1: 2026-09-01 to 2026-09-14
      await taskDefinitionRepository.create({
        id: 'def-split-v1',
        title: 'Morning Walk v1',
        startDate: '2026-09-01',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '07:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId,
        seriesVersion: 1,
        effectiveFromDate: '2026-09-01',
        effectiveToDate: '2026-09-14',
        isActive: true,
      });

      // v2: 2026-09-15 onward
      await taskDefinitionRepository.create({
        id: 'def-split-v2',
        title: 'Morning Walk v2',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '08:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId,
        seriesVersion: 2,
        effectiveFromDate: '2026-09-15',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');

      // Materialize on v2 seed date
      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-15' },
        context
      );
      expect(res.action).toBe('CREATED');

      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.taskDefinitionId).toBe('def-split-v2');
      expect(occ?.seriesId).toBe(seriesId);
    });

    it('IDM-03: Occurrence id is strictly preserved on pending recalculation', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-idm-pres',
        title: 'Nightly Reflection',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '21:00' },
        seriesId: 'series-idm-pres',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const r1 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );
      const r2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      expect(r2.occurrenceId).toBe(r1.occurrenceId);
      expect(r2.action).toBe('UPDATED');
    });
  });

  // =========================================================================
  // 2. SERIES VERSION (SV)
  // =========================================================================
  describe('Series Version (SV)', () => {
    const seriesId = 'series-sv-test';

    beforeEach(async () => {
      // v1: 2026-09-01 to 2026-09-14
      await taskDefinitionRepository.create({
        id: 'def-sv-v1',
        title: 'Study Session v1',
        startDate: '2026-09-01',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '17:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId,
        seriesVersion: 1,
        effectiveFromDate: '2026-09-01',
        effectiveToDate: '2026-09-14',
        isActive: true,
      });

      // v2: 2026-09-15 onward
      await taskDefinitionRepository.create({
        id: 'def-sv-v2',
        title: 'Study Session v2',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '19:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId,
        seriesVersion: 2,
        effectiveFromDate: '2026-09-15',
        effectiveToDate: null,
        isActive: true,
      });
    });

    it('SV-01: Seed before split date selects predecessor version', async () => {
      const context = createTestContext('2026-09-10');
      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-10' },
        context
      );
      expect(res.action).toBe('CREATED');
      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.taskDefinitionId).toBe('def-sv-v1');
    });

    it('SV-02: Seed on split date selects successor version', async () => {
      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-15' },
        context
      );
      expect(res.action).toBe('CREATED');
      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.taskDefinitionId).toBe('def-sv-v2');
    });

    it('SV-03: Seed after split date selects successor version', async () => {
      const context = createTestContext('2026-09-20');
      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-20' },
        context
      );
      expect(res.action).toBe('CREATED');
      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.taskDefinitionId).toBe('def-sv-v2');
    });

    it('SV-04: Overlapping version ranges throws DEFINITION_VERSION_CONFLICT MaterializationError', async () => {
      // Create v3 with overlapping range
      await taskDefinitionRepository.create({
        id: 'def-sv-v3-corrupt',
        title: 'Corrupt Overlap',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '20:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId,
        seriesVersion: 3,
        effectiveFromDate: '2026-09-15',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      await expect(
        materializationEngine.materializeOne({ seriesId, seedDate: '2026-09-15' }, context)
      ).rejects.toThrow(MaterializationError);

      try {
        await materializationEngine.materializeOne({ seriesId, seedDate: '2026-09-15' }, context);
      } catch (err: any) {
        expect(err.code).toBe('DEFINITION_VERSION_CONFLICT');
      }
    });

    it('SV-05: No governing version for explicit request throws NO_GOVERNING_VERSION (not silent skip)', async () => {
      const context = createTestContext('2026-08-15');
      // Date before v1 startDate (2026-09-01)
      await expect(
        materializationEngine.materializeOne({ seriesId, seedDate: '2026-08-15' }, context)
      ).rejects.toThrow(MaterializationError);

      try {
        await materializationEngine.materializeOne({ seriesId, seedDate: '2026-08-15' }, context);
      } catch (err: any) {
        expect(err.code).toBe('NO_GOVERNING_VERSION');
      }
    });

    it('SV-06: Stale old-version PENDING row after split throws OCCURRENCE_VERSION_CONFLICT', async () => {
      // Simulate stale data: PENDING row on 2026-09-15 still pointing to v1 instead of v2
      await taskOccurrenceRepository.create({
        id: 'occ-stale-pending',
        taskDefinitionId: 'def-sv-v1', // Should be v2!
        seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });

      const context = createTestContext('2026-09-15');
      await expect(
        materializationEngine.materializeOne({ seriesId, seedDate: '2026-09-15' }, context)
      ).rejects.toThrow(MaterializationError);

      try {
        await materializationEngine.materializeOne({ seriesId, seedDate: '2026-09-15' }, context);
      } catch (err: any) {
        expect(err.code).toBe('OCCURRENCE_VERSION_CONFLICT');
      }
    });
  });

  // =========================================================================
  // 3. TOMBSTONES & TERMINAL HISTORY (TS)
  // =========================================================================
  describe('Tombstones & Terminal History (TS)', () => {
    const seriesId = 'series-ts-test';

    beforeEach(async () => {
      await taskDefinitionRepository.create({
        id: 'def-ts-1',
        title: 'Tombstone Series Task',
        startDate: '2026-09-01',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId,
        seriesVersion: 1,
        effectiveFromDate: '2026-09-01',
        isActive: true,
      });
    });

    it('TS-01: CANCELLED row blocks successor materialization -> SKIPPED_CANCELLED', async () => {
      const tombstone = await taskOccurrenceRepository.create({
        id: 'occ-tombstone',
        taskDefinitionId: 'def-ts-1',
        seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.updateStatus(tombstone.id, 'CANCELLED');

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-15' },
        context
      );

      expect(res.action).toBe('SKIPPED_CANCELLED');
      expect(res.occurrenceId).toBe(tombstone.id);

      // Verify no duplicate row was created
      const rows = nodeDb
        .prepare('SELECT id, status FROM task_occurrences WHERE series_id = ? AND local_date = ?')
        .all(seriesId, '2026-09-15') as any[];
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('CANCELLED');
    });

    it('TS-02: COMPLETED history blocks recreation -> SKIPPED_COMPLETED', async () => {
      const history = await taskOccurrenceRepository.create({
        id: 'occ-completed-hist',
        taskDefinitionId: 'def-ts-1',
        seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.updateStatus(history.id, 'COMPLETED');

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-15' },
        context
      );

      expect(res.action).toBe('SKIPPED_COMPLETED');
      expect(res.occurrenceId).toBe(history.id);
    });

    it('TS-03: MISSED history blocks recreation -> SKIPPED_MISSED', async () => {
      const history = await taskOccurrenceRepository.create({
        id: 'occ-missed-hist',
        taskDefinitionId: 'def-ts-1',
        seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.updateStatus(history.id, 'MISSED');

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-15' },
        context
      );

      expect(res.action).toBe('SKIPPED_MISSED');
      expect(res.occurrenceId).toBe(history.id);
    });
  });

  // =========================================================================
  // 4. NON-RECURRING (NR)
  // =========================================================================
  describe('Non-Recurring Tasks (NR)', () => {
    it('NR-01: startDate materializes correctly -> exactly one CREATED occurrence', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-nr-1',
        title: 'One-Off Quran Khatm',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '15:00' },
        seriesId: 'series-nr-1',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      expect(res.action).toBe('CREATED');
      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.localDate).toBe('2026-09-15');
      expect(occ?.taskDefinitionId).toBe(def.id);
    });

    it('NR-02: Different seed date for non-recurring -> NO_GOVERNING_VERSION error', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-nr-2',
        title: 'Dentist Visit',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId: 'series-nr-2',
        isActive: true,
      });

      const context = createTestContext('2026-09-16');
      await expect(
        materializationEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-16' },
          context
        )
      ).rejects.toThrow(MaterializationError);

      try {
        await materializationEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-16' },
          context
        );
      } catch (err: any) {
        expect(err.code).toBe('NO_GOVERNING_VERSION');
      }
    });
  });

  // =========================================================================
  // 5. RECALCULATION (RC)
  // =========================================================================
  describe('Recalculation (RC)', () => {
    it('RC-01: Prayer shift updates prayer section for PENDING occurrence', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-rc-1',
        title: 'Afternoon Reading',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '17:00' },
        seriesId: 'series-rc-1',
        isActive: true,
      });

      // Context 1: In Chicago Sept 15, Asr ~16:20, Maghrib ~19:00 -> 17:00 is ASR
      const context1 = createTestContext('2026-09-15');
      const res1 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context1
      );
      expect(res1.action).toBe('CREATED');
      const occ1 = await taskOccurrenceRepository.findById(res1.occurrenceId);
      expect(occ1?.calculatedPrayerSection).toBe('ASR');

      // Context 2: Shift Maghrib 180 min earlier so 17:00 falls in MAGHRIB
      const shiftedParams: PrayerCalculationParams = {
        ...chicagoParams,
        adjustments: { ...defaultAdjustments, maghrib: -180 },
      };
      const context2 = createTestContext('2026-09-15', LOCATIONS.chicago, shiftedParams);
      const res2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context2
      );
      expect(res2.action).toBe('UPDATED');
      const occ2 = await taskOccurrenceRepository.findById(res2.occurrenceId);
      expect(occ2?.calculatedPrayerSection).toBe('MAGHRIB');
    });

    it('RC-02: Timezone change context updates UTC instant and timezone context', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-rc-tz',
        title: 'Fixed 18:00 Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '18:00' },
        seriesId: 'series-rc-tz',
        isActive: true,
      });

      // Chicago context (UTC-5) -> 18:00 local is 23:00 UTC
      const chicagoCtx = createTestContext('2026-09-15', LOCATIONS.chicago, chicagoParams);
      const res1 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        chicagoCtx
      );
      const occ1 = await taskOccurrenceRepository.findById(res1.occurrenceId);
      expect(occ1?.calculatedStartTime).toBe('2026-09-15T23:00:00.000Z');
      expect(occ1?.timezone).toBe('America/Chicago');

      // Mecca context (UTC+3) -> 18:00 local is 15:00 UTC
      const meccaCtx = createTestContext('2026-09-15', LOCATIONS.mecca, meccaParams);
      const res2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        meccaCtx
      );
      expect(res2.action).toBe('UPDATED');
      const occ2 = await taskOccurrenceRepository.findById(res2.occurrenceId);
      expect(occ2?.calculatedStartTime).toBe('2026-09-15T15:00:00.000Z');
      expect(occ2?.timezone).toBe('Asia/Riyadh');
    });

    it('RC-03: Prayer-relative with new prayer context recalculates start time and prayer section', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-rc-rel',
        title: 'After Asr Dua',
        startDate: '2026-09-15',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'ASR',
          direction: 'AFTER',
          offsetMinutes: 20,
        },
        seriesId: 'series-rc-rel',
        isActive: true,
      });

      // Context 1: Asr normal
      const context1 = createTestContext('2026-09-15');
      const res1 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context1
      );
      const occ1 = await taskOccurrenceRepository.findById(res1.occurrenceId);

      // Context 2: Asr shifted earlier by 30 mins
      const shiftedParams = {
        ...chicagoParams,
        adjustments: { ...defaultAdjustments, asr: -30 },
      };
      const context2 = createTestContext('2026-09-15', LOCATIONS.chicago, shiftedParams);
      const res2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context2
      );

      const occ2 = await taskOccurrenceRepository.findById(res2.occurrenceId);
      expect(occ2?.calculatedStartTime).not.toBe(occ1?.calculatedStartTime);
      expect(res2.action).toBe('UPDATED');
    });

    it('RC-04: Planning-day config change updates planningDayKey', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-rc-plan',
        title: 'Early Morning Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '03:00' }, // Before Fajr
        seriesId: 'series-rc-plan',
        isActive: true,
      });

      // FAJR mode: 03:00 belongs to previous planning day (2026-09-14)
      const fajrCtx = createTestContext('2026-09-15', LOCATIONS.chicago, chicagoParams, { mode: 'FAJR' });
      const res1 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        fajrCtx
      );
      const occ1 = await taskOccurrenceRepository.findById(res1.occurrenceId);
      expect(occ1?.planningDayKey).toBe('2026-09-14');

      // MIDNIGHT mode: 03:00 belongs to current planning day (2026-09-15)
      const midnightCtx = createTestContext('2026-09-15', LOCATIONS.chicago, chicagoParams, { mode: 'MIDNIGHT' });
      const res2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        midnightCtx
      );
      const occ2 = await taskOccurrenceRepository.findById(res2.occurrenceId);
      expect(occ2?.planningDayKey).toBe('2026-09-15');
      expect(res2.action).toBe('UPDATED');
    });

    it('RC-05: overrideData is preserved on recalculation', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-rc-override',
        title: 'Task With Subtasks',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        seriesId: 'series-rc-override',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      // User marks subtask completed
      await taskOccurrenceRepository.updateOverrideData(res.occurrenceId, {
        completedSubtaskIds: ['sub-1'],
      });

      // Recalculate
      const res2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );
      expect(res2.action).toBe('UPDATED');

      const occ = await taskOccurrenceRepository.findById(res2.occurrenceId);
      expect(occ?.overrideData?.completedSubtaskIds).toEqual(['sub-1']);
    });
  });

  // =========================================================================
  // 6. PRAYER WINDOW (PW-M)
  // =========================================================================
  describe('PrayerWindow Persistence (PW-M)', () => {
    it('PW-M1 & PW-M2: windowStart and windowEnd persisted as canonical UTC for PRAYER_WINDOW', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-pw-1',
        title: 'Dhuhr Window Study',
        startDate: '2026-09-15',
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'DHUHR',
          endPrayer: 'ASR',
        },
        seriesId: 'series-pw-1',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      expect(res.action).toBe('CREATED');
      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.windowStart).not.toBeNull();
      expect(occ?.windowEnd).not.toBeNull();
      // ISO instant check
      expect(occ?.windowStart).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(occ?.windowEnd).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      // Ordering
      expect(occ!.windowStart! < occ!.windowEnd!).toBe(true);
    });

    it('PW-M3: windowStart < windowEnd invariant enforced for PRAYER_WINDOW', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-pwm3',
        title: 'Window Task',
        startDate: '2026-09-15',
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'FAJR',
          endPrayer: 'DHUHR',
        },
        seriesId: 'series-pwm3',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );
      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.windowStart).not.toBeNull();
      expect(occ?.windowEnd).not.toBeNull();
      expect(new Date(occ!.windowStart!).getTime()).toBeLessThan(new Date(occ!.windowEnd!).getTime());

      // Also verify repository rejects inverted window
      await expect(
        taskOccurrenceRepository.create({
          id: 'occ-inverted',
          taskDefinitionId: def.id,
          seriesId: 'series-pwm3',
          localDate: '2026-09-16',
          planningDayKey: '2026-09-16',
          status: 'PENDING',
          calculatedStartTime: null,
          windowStart: '2026-09-16T12:00:00.000Z',
          windowEnd: '2026-09-16T08:00:00.000Z',
          timezone: 'America/Chicago',
        })
      ).rejects.toThrow(TaskValidationError);
    });

    it('PW-M4: Non-window placement has null window fields', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-pw-null',
        title: 'Exact Time Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId: 'series-pw-null',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.windowStart).toBeNull();
      expect(occ?.windowEnd).toBeNull();
    });

    it('PW-M5: Terminal window boundaries frozen on recalculation', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-pwm5',
        title: 'Completed Window Task',
        startDate: '2026-09-15',
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'DHUHR',
          endPrayer: 'ASR',
        },
        seriesId: 'series-pwm5',
        isActive: true,
      });

      const context1 = createTestContext('2026-09-15');
      const res1 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context1
      );
      const originalOcc = await taskOccurrenceRepository.findById(res1.occurrenceId);
      const originalWindowStart = originalOcc?.windowStart;

      // Complete the occurrence
      await taskOccurrenceRepository.updateStatus(res1.occurrenceId, 'COMPLETED');

      // Attempt materialization with shifted prayer times
      const shiftedParams = {
        ...chicagoParams,
        adjustments: { ...defaultAdjustments, dhuhr: 60 },
      };
      const context2 = createTestContext('2026-09-15', LOCATIONS.chicago, shiftedParams);
      const res2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context2
      );

      expect(res2.action).toBe('SKIPPED_COMPLETED');
      const occAfter = await taskOccurrenceRepository.findById(res1.occurrenceId);
      expect(occAfter?.windowStart).toBe(originalWindowStart);
    });
  });

  // =========================================================================
  // 7. PLACEMENT TYPES (MT)
  // =========================================================================
  describe('Placement Types (MT)', () => {
    it('MT-01: EXACT_TIME materialization sets calculatedStartTime, prayerSection, planningDayKey', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-mt-exact',
        title: 'Afternoon Meeting',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '14:00' },
        seriesId: 'series-mt-exact',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.planningDayKey).toBe('2026-09-15');
      expect(occ?.calculatedStartTime).toBe('2026-09-15T19:00:00.000Z');
      expect(occ?.calculatedPrayerSection).toBe('DHUHR');
      expect(occ?.wallClockResolution).toBe('NORMAL');
    });

    it('MT-02: PRAYER_RELATIVE materialization sets offset and section', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-mt-rel',
        title: 'Post-Maghrib Dua',
        startDate: '2026-09-15',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'MAGHRIB',
          direction: 'AFTER',
          offsetMinutes: 15,
        },
        seriesId: 'series-mt-rel',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.calculatedPrayerSection).toBe('MAGHRIB');
      expect(occ?.calculatedStartTime).not.toBeNull();
    });

    it('MT-03: PRAYER_WINDOW materialization sets windowStart, windowEnd, and eligiblePrayerSections', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-mt03',
        title: 'Between Asr and Maghrib',
        startDate: '2026-09-15',
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'ASR',
          endPrayer: 'MAGHRIB',
        },
        seriesId: 'series-mt03',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.windowStart).not.toBeNull();
      expect(occ?.windowEnd).not.toBeNull();
      expect(occ?.eligiblePrayerSections).toContain('ASR');
    });

    it('MT-04: ANYTIME_TODAY materialization sets planningDayKey=seedDate, all time fields null, timezone populated', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-mt-anytime',
        title: 'Read Juz 30',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-mt-anytime',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.planningDayKey).toBe('2026-09-15');
      expect(occ?.calculatedStartTime).toBeNull();
      expect(occ?.calculatedPrayerSection).toBeNull();
      expect(occ?.eligiblePrayerSections).toBeNull();
      expect(occ?.wallClockResolution).toBeNull();
      expect(occ?.windowStart).toBeNull();
      expect(occ?.windowEnd).toBeNull();
      expect(occ?.timezone).toBe('America/Chicago');
    });

    it('MT-05: Before-Fajr EXACT_TIME placement assigns planningDayKey to previous day', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-mt-tahajjud',
        title: 'Tahajjud Prayer',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '03:30' }, // Before Fajr (~05:15 in Chicago)
        seriesId: 'series-mt-tahajjud',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      const occ = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(occ?.localDate).toBe('2026-09-15');
      expect(occ?.planningDayKey).toBe('2026-09-14'); // Previous planning day!
      expect(occ?.calculatedPrayerSection).toBe('ISHA');
    });

    it('MT-06: Idempotent re-run updates PENDING placement without creating new row', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-mt06',
        title: 'Daily Meeting',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '11:00' },
        seriesId: 'series-mt06',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const res1 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );
      expect(res1.action).toBe('CREATED');

      const res2 = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );
      expect(res2.action).toBe('UPDATED');
      expect(res2.occurrenceId).toBe(res1.occurrenceId);
    });
  });

  // =========================================================================
  // 8. CONTEXT INDEPENDENCE (CTX)
  // =========================================================================
  describe('Context Independence (CTX)', () => {
    it('CTX-01: CANCELLED tombstone + corrupted/invalid temporal context returns SKIPPED_CANCELLED', async () => {
      const seriesId = 'series-ctx-cancelled';
      await taskDefinitionRepository.create({
        id: 'def-ctx-1',
        title: 'Task with tombstone',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        seriesId,
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-ctx-tombstone',
        taskDefinitionId: 'def-ctx-1',
        seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.updateStatus(occ.id, 'CANCELLED');

      // Invalid/unavailable context (corrupted timeline)
      const corruptedContext = {
        timeline: null as any,
        planningDayConfig: fajrConfig,
      };

      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-15' },
        corruptedContext
      );

      expect(res.action).toBe('SKIPPED_CANCELLED');
      expect(res.occurrenceId).toBe(occ.id);
    });

    it('CTX-02: COMPLETED history + corrupted temporal context returns SKIPPED_COMPLETED', async () => {
      const seriesId = 'series-ctx-completed';
      await taskDefinitionRepository.create({
        id: 'def-ctx-2',
        title: 'Completed Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        seriesId,
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-ctx-comp',
        taskDefinitionId: 'def-ctx-2',
        seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');

      const corruptedContext = {
        timeline: null as any,
        planningDayConfig: fajrConfig,
      };

      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-15' },
        corruptedContext
      );

      expect(res.action).toBe('SKIPPED_COMPLETED');
      expect(res.occurrenceId).toBe(occ.id);
    });

    it('CTX-03: MISSED history + corrupted temporal context returns SKIPPED_MISSED', async () => {
      const seriesId = 'series-ctx-missed';
      await taskDefinitionRepository.create({
        id: 'def-ctx-3',
        title: 'Missed Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        seriesId,
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-ctx-missed',
        taskDefinitionId: 'def-ctx-3',
        seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.updateStatus(occ.id, 'MISSED');

      const corruptedContext = {
        timeline: null as any,
        planningDayConfig: fajrConfig,
      };

      const res = await materializationEngine.materializeOne(
        { seriesId, seedDate: '2026-09-15' },
        corruptedContext
      );

      expect(res.action).toBe('SKIPPED_MISSED');
      expect(res.occurrenceId).toBe(occ.id);
    });
  });

  // =========================================================================
  // 9. FAILURE SAFETY & ROLLBACK (FL)
  // =========================================================================
  describe('Failure Safety & Rollback (FL)', () => {
    it('FL-01: Scheduling resolution failure on new occurrence creates zero rows and rolls back', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-fl-fail',
        title: 'Valid Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        seriesId: 'series-fl-fail',
        isActive: true,
      });

      const mockSchedulingEngine = {
        resolvePlacement: jest.fn().mockImplementation(() => {
          throw new SchedulingResolutionError(
            'INSUFFICIENT_TIMELINE',
            'Simulated scheduling failure'
          );
        }),
        recalculateOccurrencePlacement: jest.fn(),
      };

      const failEngine = new MaterializationEngine(
        taskOccurrenceRepository,
        taskDefinitionRepository,
        mockSchedulingEngine
      );

      const context = createTestContext('2026-09-15');

      await expect(
        failEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-15' },
          context
        )
      ).rejects.toThrow(MaterializationError);

      try {
        await failEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-15' },
          context
        );
      } catch (err: any) {
        expect(err.code).toBe('SCHEDULING_RESOLUTION_FAILED');
        expect(err.cause).toBeInstanceOf(SchedulingResolutionError);
      }

      // Verify zero rows created
      const rows = nodeDb
        .prepare('SELECT id FROM task_occurrences WHERE series_id = ?')
        .all(def.seriesId);
      expect(rows).toHaveLength(0);
    });

    it('FL-02: Recalculation failure on existing PENDING preserves previous valid placement', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-fl-preserve',
        title: 'Preserve Placement Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        seriesId: 'series-fl-preserve',
        isActive: true,
      });

      const validContext = createTestContext('2026-09-15');
      const res = await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        validContext
      );

      const original = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(original?.calculatedStartTime).toBe('2026-09-15T17:00:00.000Z');

      // Now mutate definition to invalid scheduleData in DB directly to force M5 failure
      nodeDb
        .prepare("UPDATE task_definitions SET schedule_data = '{\"localTime\":\"99:99\"}' WHERE id = ?")
        .run(def.id);

      // Attempt materialization -> should fail and roll back
      await expect(
        materializationEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-15' },
          validContext
        )
      ).rejects.toThrow(MaterializationError);

      // Verify original placement was preserved untouched!
      const afterFail = await taskOccurrenceRepository.findById(res.occurrenceId);
      expect(afterFail?.calculatedStartTime).toBe(original?.calculatedStartTime);
      expect(afterFail?.status).toBe('PENDING');
    });

    it('FL-03: Persistence failure rolls back single materialization and leaves zero partial rows', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-fl03',
        title: 'Failing DB Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        seriesId: 'series-fl03',
        isActive: true,
      });

      const mockRepo = Object.create(taskOccurrenceRepository);
      mockRepo.findBySeriesAndDate = jest.fn().mockResolvedValue(null);
      mockRepo.create = jest.fn().mockRejectedValue(new Error('Simulated SQLite disk I/O failure'));

      const failEngine = new MaterializationEngine(
        mockRepo,
        taskDefinitionRepository
      );

      const context = createTestContext('2026-09-15');
      await expect(
        failEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-15' },
          context
        )
      ).rejects.toThrow(MaterializationError);

      try {
        await failEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-15' },
          context
        );
      } catch (err: any) {
        expect(err.code).toBe('PERSISTENCE_FAILED');
      }
    });

    it('FL-04: No raw SQLite error leaks from MaterializationEngine', async () => {
      // Passing invalid request structure
      await expect(
        materializationEngine.materializeOne({ seriesId: '', seedDate: 'invalid' }, {} as any)
      ).rejects.toThrow(MaterializationError);
    });
  });

  // =========================================================================
  // 10. BATCH & NON-RECURRING DISCOVERY (BT)
  // =========================================================================
  describe('Batch & Non-Recurring Discovery (BT)', () => {
    it('BT-01: Duplicate requests in materializeBatch are deduplicated and processed once', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-bt-dedup',
        title: 'Dedup Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId: 'series-bt-dedup',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const summary = await materializationEngine.materializeBatch(
        [
          { seriesId: def.seriesId, seedDate: '2026-09-15' },
          { seriesId: def.seriesId, seedDate: '2026-09-15' }, // Duplicate
          { seriesId: def.seriesId, seedDate: '2026-09-15' }, // Duplicate
        ],
        context
      );

      expect(summary.results).toHaveLength(1);
      expect(summary.created).toBe(1);
      expect(summary.errors).toHaveLength(0);
    });

    it('BT-02: Per-item failure does not abort batch (other items succeed)', async () => {
      const defGood = await taskDefinitionRepository.create({
        id: 'def-bt-good',
        title: 'Good Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId: 'series-bt-good',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const summary = await materializationEngine.materializeBatch(
        [
          { seriesId: defGood.seriesId, seedDate: '2026-09-15' },
          { seriesId: 'non-existent-series', seedDate: '2026-09-15' }, // Fails with NO_GOVERNING_VERSION
        ],
        context
      );

      expect(summary.created).toBe(1);
      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0].seriesId).toBe('non-existent-series');
      expect(summary.errors[0].error.code).toBe('NO_GOVERNING_VERSION');
    });

    it('BT-03 & BT-04: materializeNonRecurring filters active non-recurring in range only', async () => {
      // Non-recurring in range
      await taskDefinitionRepository.create({
        id: 'def-bt-nr1',
        title: 'Doctor Appt',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '11:00' },
        seriesId: 'series-bt-nr1',
        isActive: true,
      });
      await taskDefinitionRepository.create({
        id: 'def-bt-nr2',
        title: 'Dentist Appt',
        startDate: '2026-09-16',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '14:00' },
        seriesId: 'series-bt-nr2',
        isActive: true,
      });
      // Recurring in range (should be ignored)
      await taskDefinitionRepository.create({
        id: 'def-bt-rec',
        title: 'Daily Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '08:00' },
        recurrenceRule: 'FREQ=DAILY',
        seriesId: 'series-bt-rec',
        effectiveFromDate: '2026-09-15',
        isActive: true,
      });
      // Non-recurring out of range (should be ignored)
      await taskDefinitionRepository.create({
        id: 'def-bt-out',
        title: 'Far Task',
        startDate: '2026-09-30',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId: 'series-bt-out',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const summary = await materializationEngine.materializeNonRecurring(
        '2026-09-15',
        '2026-09-17',
        context
      );

      expect(summary.created).toBe(2);
      const createdSeries = summary.results.map(r => r.seriesId);
      expect(createdSeries).toContain('series-bt-nr1');
      expect(createdSeries).toContain('series-bt-nr2');
      expect(createdSeries).not.toContain('series-bt-rec');
      expect(createdSeries).not.toContain('series-bt-out');
    });

    it('BT-06: rematerializePending detects version conflict on stale row and records error', async () => {
      const seriesId = 'series-bt06';
      // v1
      await taskDefinitionRepository.create({
        id: 'def-bt06-v1',
        title: 'Task v1',
        startDate: '2026-09-01',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId,
        seriesVersion: 1,
        effectiveFromDate: '2026-09-01',
        effectiveToDate: '2026-09-14',
        isActive: true,
      });
      // v2
      await taskDefinitionRepository.create({
        id: 'def-bt06-v2',
        title: 'Task v2',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '11:00' },
        seriesId,
        seriesVersion: 2,
        effectiveFromDate: '2026-09-15',
        effectiveToDate: null,
        isActive: true,
      });

      // Create stale occurrence referencing v1 on v2's date
      await taskOccurrenceRepository.create({
        id: 'occ-bt06-stale',
        taskDefinitionId: 'def-bt06-v1',
        seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });

      const context = createTestContext('2026-09-15');
      const summary = await materializationEngine.rematerializePending(
        '2026-09-15',
        '2026-09-15',
        context
      );

      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0].error.code).toBe('OCCURRENCE_VERSION_CONFLICT');
    });
  });

  // =========================================================================
  // 11. ROUTING & REMATERIALIZATION (RM)
  // =========================================================================
  describe('Routing & Rematerialization (RM)', () => {
    it('RM-01: rematerializePending routes through canonical materializeOne algorithm', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-rm-1',
        title: 'Pending Remat Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '15:00' },
        seriesId: 'series-rm-1',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      // Create initial PENDING row
      await materializationEngine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      // Now run rematerializePending
      const summary = await materializationEngine.rematerializePending(
        '2026-09-15',
        '2026-09-15',
        context
      );

      expect(summary.updated).toBe(1);
      expect(summary.results[0].action).toBe('UPDATED');
    });

    it('BT-05: rematerializePending ignores terminal occurrences', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-rm-term',
        title: 'Terminal Remat Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '15:00' },
        seriesId: 'series-rm-term',
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-term-remat',
        taskDefinitionId: def.id,
        seriesId: def.seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');

      const context = createTestContext('2026-09-15');
      const summary = await materializationEngine.rematerializePending(
        '2026-09-15',
        '2026-09-15',
        context
      );

      // No pending rows found
      expect(summary.results).toHaveLength(0);
      expect(summary.updated).toBe(0);
    });
  });

  // =========================================================================
  // 12. CONCURRENCY & ATOMIC GUARD (TX)
  // =========================================================================
  describe('Concurrency & Atomic Guard (TX)', () => {
    it('TX-01: Concurrent same logical key requests leave exactly one occurrence', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-tx-conc',
        title: 'Concurrent Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '14:00' },
        seriesId: 'series-tx-conc',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');

      // Launch two concurrent materializeOne calls
      const [res1, res2] = await Promise.all([
        materializationEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-15' },
          context
        ),
        materializationEngine.materializeOne(
          { seriesId: def.seriesId, seedDate: '2026-09-15' },
          context
        ),
      ]);

      // One was CREATED, other was UPDATED (serialized)
      const actions = [res1.action, res2.action].sort();
      expect(actions).toEqual(['CREATED', 'UPDATED']);
      expect(res1.occurrenceId).toBe(res2.occurrenceId);

      const rows = nodeDb
        .prepare('SELECT id FROM task_occurrences WHERE series_id = ? AND local_date = ?')
        .all(def.seriesId, '2026-09-15');
      expect(rows).toHaveLength(1);
    });

    it('TX-02: Guarded update race where occurrence was completed returns SKIPPED_COMPLETED (not UPDATED)', async () => {
      const def = await taskDefinitionRepository.create({
        id: 'def-tx-race',
        title: 'Race Condition Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '12:00' },
        seriesId: 'series-tx-race',
        isActive: true,
      });

      const occ = await taskOccurrenceRepository.create({
        id: 'occ-tx-race',
        taskDefinitionId: def.id,
        seriesId: def.seriesId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });

      // Simulate a mock occurrence repository where updateDerivedPlacement simulates losing race to COMPLETED
      const mockRepo = Object.create(taskOccurrenceRepository);
      mockRepo.updateDerivedPlacement = jest.fn().mockResolvedValue({
        outcome: 'NOT_PENDING',
        occurrence: {
          ...occ,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        },
      });

      const engine = new MaterializationEngine(mockRepo, taskDefinitionRepository);
      const context = createTestContext('2026-09-15');

      const res = await engine.materializeOne(
        { seriesId: def.seriesId, seedDate: '2026-09-15' },
        context
      );

      expect(res.action).toBe('SKIPPED_COMPLETED');
      expect(res.occurrenceId).toBe(occ.id);
    });

    it('TX-03: Per-item batch failure does not rollback unrelated items (independent transactions)', async () => {
      const def1 = await taskDefinitionRepository.create({
        id: 'def-tx-bt1',
        title: 'Item 1',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId: 'series-tx-bt1',
        isActive: true,
      });

      const context = createTestContext('2026-09-15');
      const summary = await materializationEngine.materializeBatch(
        [
          { seriesId: def1.seriesId, seedDate: '2026-09-15' },
          { seriesId: 'invalid-series', seedDate: '2026-09-15' },
        ],
        context
      );

      expect(summary.created).toBe(1);
      expect(summary.errors).toHaveLength(1);

      // Verify item 1 was actually committed
      const rows = nodeDb
        .prepare('SELECT id FROM task_occurrences WHERE series_id = ?')
        .all(def1.seriesId);
      expect(rows).toHaveLength(1);
    });
  });
});
