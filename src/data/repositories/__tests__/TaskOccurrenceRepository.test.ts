import { taskOccurrenceRepository } from '../TaskOccurrenceRepository';
import { taskDefinitionRepository } from '../TaskDefinitionRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskValidationError, DataIntegrityError } from '@/domain/task/errors';

describe('TaskOccurrenceRepository', () => {
  let nodeDb: ReturnType<typeof createTestDatabase>['nodeDb'];
  let testDefId: string;
  const testSeriesId = 'series-occ-test';

  beforeEach(async () => {
    const testDb = createTestDatabase();
    nodeDb = testDb.nodeDb;

    const def = await taskDefinitionRepository.create({
      id: 'def-parent-1',
      title: 'Daily Fajr Workout',
      startDate: '2026-09-15',
      source: 'USER',
      scheduleType: 'PRAYER_RELATIVE',
      scheduleData: {
        anchorPrayer: 'FAJR',
        direction: 'AFTER',
        offsetMinutes: 20,
      },
      seriesId: testSeriesId,
      seriesVersion: 1,
      priority: 'NORMAL',
      estimatedMinutes: 30,
      notes: null,
      tags: [],
      subtasks: [],
      isActive: true,
    });
    testDefId = def.id;
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('CRUD & SeriesId Derivation (OC-01)', () => {
    it('creates an occurrence with auto-derived seriesId from TaskDefinition', async () => {
      const created = await taskOccurrenceRepository.create({
        id: 'occ-1',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/New_York',
        calculatedStartTime: '2026-09-15T06:00:00.000-04:00',
        calculatedPrayerSection: 'FAJR',
        eligiblePrayerSections: ['FAJR'],
        wallClockResolution: 'NORMAL',
        status: 'PENDING',
      });

      expect(created.id).toBe('occ-1');
      expect(created.seriesId).toBe(testSeriesId); // Derived from definition!
      expect(created.localDate).toBe('2026-09-15');
      expect(created.planningDayKey).toBe('2026-09-15');
      expect(created.status).toBe('PENDING');

      const fetched = await taskOccurrenceRepository.findById('occ-1');
      expect(fetched).toEqual(created);
    });

    it('OC-01: rejects occurrence creation with mismatched seriesId', async () => {
      await expect(
        taskOccurrenceRepository.create({
          id: 'occ-mismatch',
          taskDefinitionId: testDefId,
          seriesId: 'unrelated-series-id', // Mismatched!
          localDate: '2026-09-15',
          planningDayKey: '2026-09-15',
          timezone: 'America/New_York',
        })
      ).rejects.toThrow(TaskValidationError);
    });

    it('creates batch of occurrences atomically', async () => {
      const batch = await taskOccurrenceRepository.createBatch([
        {
          id: 'batch-1',
          taskDefinitionId: testDefId,
          localDate: '2026-09-16',
          planningDayKey: '2026-09-16',
          timezone: 'America/New_York',
        },
        {
          id: 'batch-2',
          taskDefinitionId: testDefId,
          localDate: '2026-09-17',
          planningDayKey: '2026-09-17',
          timezone: 'America/New_York',
        },
      ]);

      expect(batch).toHaveLength(2);
      expect(batch[0].seriesId).toBe(testSeriesId);
      expect(batch[1].seriesId).toBe(testSeriesId);

      const bySeries = await taskOccurrenceRepository.findBySeriesId(testSeriesId);
      expect(bySeries).toHaveLength(2);
    });
  });

  describe('Query Methods', () => {
    beforeEach(async () => {
      await taskOccurrenceRepository.create({
        id: 'q-1',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        calculatedPrayerSection: 'FAJR',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.create({
        id: 'q-2',
        taskDefinitionId: testDefId,
        localDate: '2026-09-16',
        planningDayKey: '2026-09-15', // custom night task belonging to 09-15 planning day
        timezone: 'UTC',
        calculatedPrayerSection: 'ISHA',
        status: 'PENDING',
      });
    });

    it('queries by planningDayKey', async () => {
      const rows = await taskOccurrenceRepository.findByPlanningDay('2026-09-15');
      expect(rows).toHaveLength(2);
    });

    it('queries by prayerSection', async () => {
      const fajrTasks = await taskOccurrenceRepository.findByPrayerSection('2026-09-15', 'FAJR');
      expect(fajrTasks).toHaveLength(1);
      expect(fajrTasks[0].id).toBe('q-1');

      const ishaTasks = await taskOccurrenceRepository.findByPrayerSection('2026-09-15', 'ISHA');
      expect(ishaTasks).toHaveLength(1);
      expect(ishaTasks[0].id).toBe('q-2');
    });

    it('queries by definition and date', async () => {
      const found = await taskOccurrenceRepository.findByDefinitionAndDate(testDefId, '2026-09-15');
      expect(found?.id).toBe('q-1');
    });
  });

  describe('Guarded Status Transitions', () => {
    it('transitions PENDING -> COMPLETED with completedAt and null missedAt', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-status-1',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      });

      const completed = await taskOccurrenceRepository.updateStatus(
        occ.id,
        'COMPLETED',
        '2026-09-15T12:00:00.000Z'
      );
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBe('2026-09-15T12:00:00.000Z');
      expect(completed.missedAt).toBeNull();

      // Idempotent call returns unchanged
      const same = await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');
      expect(same.status).toBe('COMPLETED');
    });

    it('transitions PENDING -> MISSED with missedAt and null completedAt', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-status-2',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      });

      const missed = await taskOccurrenceRepository.updateStatus(
        occ.id,
        'MISSED',
        '2026-09-15T18:00:00.000Z'
      );
      expect(missed.status).toBe('MISSED');
      expect(missed.missedAt).toBe('2026-09-15T18:00:00.000Z');
      expect(missed.completedAt).toBeNull();
    });

    it('transitions PENDING -> CANCELLED with null timestamps', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-status-3',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      });

      const cancelled = await taskOccurrenceRepository.updateStatus(occ.id, 'CANCELLED');
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.completedAt).toBeNull();
      expect(cancelled.missedAt).toBeNull();
    });

    it('rejects illegal transition from terminal status to another status', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-terminal-1',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      });

      await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');

      // Attempt COMPLETED -> PENDING
      await expect(
        taskOccurrenceRepository.updateStatus(occ.id, 'PENDING')
      ).rejects.toThrow(TaskValidationError);

      // Attempt COMPLETED -> MISSED
      await expect(
        taskOccurrenceRepository.updateStatus(occ.id, 'MISSED')
      ).rejects.toThrow(TaskValidationError);

      // Attempt COMPLETED -> CANCELLED
      await expect(
        taskOccurrenceRepository.updateStatus(occ.id, 'CANCELLED')
      ).rejects.toThrow(TaskValidationError);
    });
  });

  describe('Terminal Historical Placement Freezing', () => {
    it('allows placement update on PENDING occurrence', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-pending-place',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      });

      const updated = await taskOccurrenceRepository.updateDerivedPlacement(occ.id, {
        calculatedStartTime: '2026-09-15T05:30:00.000Z',
        calculatedPrayerSection: 'FAJR',
        eligiblePrayerSections: ['FAJR'],
        wallClockResolution: 'NORMAL',
        planningDayKey: '2026-09-15',
      });

      expect(updated.calculatedPrayerSection).toBe('FAJR');
      expect(updated.calculatedStartTime).toBe('2026-09-15T05:30:00.000Z');
    });

    it('strictly rejects placement update on COMPLETED, MISSED, or CANCELLED occurrences', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-frozen-place',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        calculatedPrayerSection: 'FAJR',
        status: 'PENDING',
      });

      await taskOccurrenceRepository.updateStatus(occ.id, 'COMPLETED');

      await expect(
        taskOccurrenceRepository.updateDerivedPlacement(occ.id, {
          calculatedStartTime: '2026-09-15T12:00:00.000Z',
          calculatedPrayerSection: 'DHUHR', // Attempting to move historical completed task!
          eligiblePrayerSections: ['DHUHR'],
          wallClockResolution: 'NORMAL',
          planningDayKey: '2026-09-15',
        })
      ).rejects.toThrow(TaskValidationError);

      // Verify placement is still Fajr
      const fetched = await taskOccurrenceRepository.findById(occ.id);
      expect(fetched?.calculatedPrayerSection).toBe('FAJR');
    });
  });

  describe('Guarded Hard Delete (HD-02)', () => {
    it('HD-02: rejects hard delete of terminal occurrences', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-terminal-del',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      });

      await taskOccurrenceRepository.updateStatus(occ.id, 'MISSED');

      await expect(taskOccurrenceRepository.delete(occ.id)).rejects.toThrow(
        TaskValidationError
      );
      const stillExists = await taskOccurrenceRepository.findById(occ.id);
      expect(stillExists).toBeDefined();
    });

    it('allows hard delete of disposable PENDING occurrences', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-pending-del',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      });

      await taskOccurrenceRepository.delete(occ.id);
      const fetched = await taskOccurrenceRepository.findById(occ.id);
      expect(fetched).toBeNull();
    });
  });

  describe('deletePendingFutureOccurrences & cancelAllPendingOccurrences', () => {
    beforeEach(async () => {
      // Past completed
      await taskOccurrenceRepository.create({
        id: 'occ-past-comp',
        taskDefinitionId: testDefId,
        localDate: '2026-09-14',
        planningDayKey: '2026-09-14',
        timezone: 'UTC',
        status: 'PENDING',
      });
      await taskOccurrenceRepository.updateStatus('occ-past-comp', 'COMPLETED');

      // Today pending
      await taskOccurrenceRepository.create({
        id: 'occ-today-pend',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      });

      // Future pending
      await taskOccurrenceRepository.create({
        id: 'occ-future-pend',
        taskDefinitionId: testDefId,
        localDate: '2026-09-16',
        planningDayKey: '2026-09-16',
        timezone: 'UTC',
        status: 'PENDING',
      });
    });

    it('deletePendingFutureOccurrences deletes only future PENDING rows and preserves history', async () => {
      const deletedCount = await taskOccurrenceRepository.deletePendingFutureOccurrences(
        testSeriesId,
        '2026-09-15'
      );
      expect(deletedCount).toBe(2); // today and future

      // Past completed is preserved
      const past = await taskOccurrenceRepository.findById('occ-past-comp');
      expect(past?.status).toBe('COMPLETED');

      // Future pending rows are gone
      expect(await taskOccurrenceRepository.findById('occ-today-pend')).toBeNull();
      expect(await taskOccurrenceRepository.findById('occ-future-pend')).toBeNull();
    });

    it('cancelAllPendingOccurrences transitions all pending rows to CANCELLED and preserves history', async () => {
      const cancelledCount = await taskOccurrenceRepository.cancelAllPendingOccurrences(
        testSeriesId
      );
      expect(cancelledCount).toBe(2);

      const past = await taskOccurrenceRepository.findById('occ-past-comp');
      expect(past?.status).toBe('COMPLETED');

      const today = await taskOccurrenceRepository.findById('occ-today-pend');
      expect(today?.status).toBe('CANCELLED');

      const future = await taskOccurrenceRepository.findById('occ-future-pend');
      expect(future?.status).toBe('CANCELLED');
    });
  });

  describe('Data Integrity & Corrupted JSON Detection', () => {
    it('throws DataIntegrityError on malformed persisted overrideData', async () => {
      nodeDb
        .prepare(
          `INSERT INTO task_occurrences (id, task_definition_id, series_id, local_date, planning_day_key, timezone, status, override_data)
           VALUES ('occ-corrupt', '${testDefId}', '${testSeriesId}', '2026-09-20', '2026-09-20', 'UTC', 'PENDING', '{malformed')`
        )
        .run();

      await expect(taskOccurrenceRepository.findById('occ-corrupt')).rejects.toThrow(
        DataIntegrityError
      );
    });

    it('throws DataIntegrityError on invalid eligiblePrayerSections (containing SUNRISE)', async () => {
      nodeDb
        .prepare(
          `INSERT INTO task_occurrences (id, task_definition_id, series_id, local_date, planning_day_key, timezone, status, eligible_prayer_sections)
           VALUES ('occ-sunrise', '${testDefId}', '${testSeriesId}', '2026-09-21', '2026-09-21', 'UTC', 'PENDING', '["SUNRISE"]')`
        )
        .run();

      await expect(taskOccurrenceRepository.findById('occ-sunrise')).rejects.toThrow(
        DataIntegrityError
      );
    });
  });

  describe('M4 Hardening: Civil Dates, Terminal Invariants, Timestamps & Timezones', () => {
    describe('Civil Date Validation', () => {
      it('accepts valid Gregorian civil dates for localDate and planningDayKey', async () => {
        const validDates = ['2026-01-31', '2028-02-29', '2026-12-31'];
        for (const d of validDates) {
          const occ = await taskOccurrenceRepository.create({
            id: `occ-valid-${d}`,
            taskDefinitionId: testDefId,
            localDate: d,
            planningDayKey: d,
            timezone: 'UTC',
            status: 'PENDING',
          });
          expect(occ.localDate).toBe(d);
          expect(occ.planningDayKey).toBe(d);
        }
      });

      it('rejects impossible dates for localDate', async () => {
        const invalidDates = [
          '2026-02-29',
          '2026-02-30',
          '2026-02-31',
          '2026-04-31',
          '2026-00-10',
          '2026-13-01',
          '2026-01-00',
          '2026-1-01',
          'text',
        ];

        for (const d of invalidDates) {
          await expect(
            taskOccurrenceRepository.create({
              taskDefinitionId: testDefId,
              localDate: d,
              planningDayKey: '2026-09-15',
              timezone: 'UTC',
              status: 'PENDING',
            })
          ).rejects.toThrow(TaskValidationError);
        }
      });

      it('rejects impossible dates for planningDayKey', async () => {
        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-02-29',
            timezone: 'UTC',
            status: 'PENDING',
          })
        ).rejects.toThrow(TaskValidationError);
      });

      it('rejects impossible dates in query methods', async () => {
        await expect(
          taskOccurrenceRepository.findByDefinitionAndDate(testDefId, '2026-02-29')
        ).rejects.toThrow(TaskValidationError);

        await expect(
          taskOccurrenceRepository.findByPlanningDay('2026-04-31')
        ).rejects.toThrow(TaskValidationError);

        await expect(
          taskOccurrenceRepository.findByPrayerSection('2026-13-01', 'FAJR')
        ).rejects.toThrow(TaskValidationError);

        await expect(
          taskOccurrenceRepository.deletePendingFutureOccurrences(testSeriesId, 'invalid-date')
        ).rejects.toThrow(TaskValidationError);

        await expect(
          taskOccurrenceRepository.cancelFutureOccurrences(testSeriesId, '2026-02-30')
        ).rejects.toThrow(TaskValidationError);
      });
    });

    describe('Terminal Status Timestamp Invariants on create & createBatch', () => {
      it('rejects PENDING with completedAt or missedAt', async () => {
        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'PENDING',
            completedAt: '2026-09-15T10:00:00Z',
          })
        ).rejects.toThrow(TaskValidationError);

        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'PENDING',
            missedAt: '2026-09-15T10:00:00Z',
          })
        ).rejects.toThrow(TaskValidationError);
      });

      it('enforces COMPLETED must have completedAt and missedAt null', async () => {
        // Missing completedAt -> rejected
        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'COMPLETED',
          })
        ).rejects.toThrow(TaskValidationError);

        // Has missedAt -> rejected
        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'COMPLETED',
            completedAt: '2026-09-15T10:00:00Z',
            missedAt: '2026-09-15T10:00:00Z',
          })
        ).rejects.toThrow(TaskValidationError);

        // Valid COMPLETED -> accepted
        const created = await taskOccurrenceRepository.create({
          id: 'occ-valid-comp',
          taskDefinitionId: testDefId,
          localDate: '2026-09-15',
          planningDayKey: '2026-09-15',
          timezone: 'UTC',
          status: 'COMPLETED',
          completedAt: '2026-09-15T10:00:00Z',
        });
        expect(created.status).toBe('COMPLETED');
        expect(created.completedAt).toBe('2026-09-15T10:00:00.000Z');
        expect(created.missedAt).toBeNull();
      });

      it('enforces MISSED must have missedAt and completedAt null', async () => {
        // Missing missedAt -> rejected
        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'MISSED',
          })
        ).rejects.toThrow(TaskValidationError);

        // Has completedAt -> rejected
        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'MISSED',
            missedAt: '2026-09-15T23:59:59Z',
            completedAt: '2026-09-15T10:00:00Z',
          })
        ).rejects.toThrow(TaskValidationError);

        // Valid MISSED -> accepted
        const created = await taskOccurrenceRepository.create({
          id: 'occ-valid-missed',
          taskDefinitionId: testDefId,
          localDate: '2026-09-15',
          planningDayKey: '2026-09-15',
          timezone: 'UTC',
          status: 'MISSED',
          missedAt: '2026-09-15T23:59:59Z',
        });
        expect(created.status).toBe('MISSED');
        expect(created.missedAt).toBe('2026-09-15T23:59:59.000Z');
        expect(created.completedAt).toBeNull();
      });

      it('enforces CANCELLED must have completedAt and missedAt null', async () => {
        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'CANCELLED',
            completedAt: '2026-09-15T10:00:00Z',
          })
        ).rejects.toThrow(TaskValidationError);

        // Valid CANCELLED -> accepted
        const created = await taskOccurrenceRepository.create({
          id: 'occ-valid-cancelled',
          taskDefinitionId: testDefId,
          localDate: '2026-09-15',
          planningDayKey: '2026-09-15',
          timezone: 'UTC',
          status: 'CANCELLED',
        });
        expect(created.status).toBe('CANCELLED');
        expect(created.completedAt).toBeNull();
        expect(created.missedAt).toBeNull();
      });

      it('createBatch rejects invalid terminal status and rolls back atomically', async () => {
        await expect(
          taskOccurrenceRepository.createBatch([
            {
              id: 'batch-valid-1',
              taskDefinitionId: testDefId,
              localDate: '2026-09-15',
              planningDayKey: '2026-09-15',
              timezone: 'UTC',
              status: 'PENDING',
            },
            {
              id: 'batch-invalid-2',
              taskDefinitionId: testDefId,
              localDate: '2026-09-16',
              planningDayKey: '2026-09-16',
              timezone: 'UTC',
              status: 'COMPLETED',
              // Missing completedAt!
            },
          ])
        ).rejects.toThrow(TaskValidationError);

        // Assert atomic rollback: batch-valid-1 must NOT have been inserted
        const row = await taskOccurrenceRepository.findById('batch-valid-1');
        expect(row).toBeNull();
      });
    });

    describe('Absolute Timestamp Validation', () => {
      it('rejects bare local timestamps without UTC offset or Z', async () => {
        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'COMPLETED',
            completedAt: '2026-09-15T18:00:00', // bare local!
          })
        ).rejects.toThrow(TaskValidationError);

        await expect(
          taskOccurrenceRepository.create({
            taskDefinitionId: testDefId,
            localDate: '2026-09-15',
            planningDayKey: '2026-09-15',
            timezone: 'UTC',
            status: 'PENDING',
            calculatedStartTime: '2026-09-15T18:00:00', // bare local!
          })
        ).rejects.toThrow(TaskValidationError);
      });

      it('canonicalizes valid absolute instants with offset to UTC ISO string', async () => {
        const occ = await taskOccurrenceRepository.create({
          id: 'occ-offset-test',
          taskDefinitionId: testDefId,
          localDate: '2026-09-15',
          planningDayKey: '2026-09-15',
          timezone: 'Asia/Riyadh',
          status: 'COMPLETED',
          completedAt: '2026-09-15T18:00:00+03:00',
        });

        // 18:00+03:00 is 15:00 UTC
        expect(occ.completedAt).toBe('2026-09-15T15:00:00.000Z');
      });
    });

    describe('IANA Timezone Validation', () => {
      it('accepts valid IANA timezone strings', async () => {
        const validZones = [
          { tz: 'America/Chicago', date: '2026-09-15' },
          { tz: 'Asia/Riyadh', date: '2026-09-16' },
          { tz: 'Europe/London', date: '2026-09-17' },
        ];
        for (const { tz, date } of validZones) {
          const occ = await taskOccurrenceRepository.create({
            id: `occ-tz-${tz}`,
            taskDefinitionId: testDefId,
            localDate: date,
            planningDayKey: date,
            timezone: tz,
            status: 'PENDING',
          });
          expect(occ.timezone).toBe(tz);
        }
      });

      it('rejects arbitrary or invalid timezone strings', async () => {
        const invalidZones = ['Texas', 'GMT-ish', 'not-a-zone', ''];
        for (const tz of invalidZones) {
          await expect(
            taskOccurrenceRepository.create({
              taskDefinitionId: testDefId,
              localDate: '2026-09-15',
              planningDayKey: '2026-09-15',
              timezone: tz,
              status: 'PENDING',
            })
          ).rejects.toThrow(TaskValidationError);
        }
      });
    });
  });
});
