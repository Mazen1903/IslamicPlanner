import { taskDefinitionRepository } from '../TaskDefinitionRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskValidationError, DataIntegrityError } from '@/domain/task/errors';

describe('TaskDefinitionRepository', () => {
  let nodeDb: ReturnType<typeof createTestDatabase>['nodeDb'];

  beforeEach(() => {
    const testDb = createTestDatabase();
    nodeDb = testDb.nodeDb;
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('CRUD and Schedule Data Round-Trip', () => {
    it('creates and retrieves an EXACT_TIME TaskDefinition', async () => {
      const created = await taskDefinitionRepository.create({
        id: 'def-exact',
        title: 'Morning Quran',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '06:30' },
        seriesId: 'def-exact',
        seriesVersion: 1,
        priority: 'IMPORTANT',
        estimatedMinutes: 30,
        notes: 'Surah Yaseen',
        tags: ['worship', 'morning'],
        subtasks: [
          { id: 's1', title: 'Wudu' },
          { id: 's2', title: 'Recite' },
        ],
        isActive: true,
      });

      expect(created.id).toBe('def-exact');
      expect(created.title).toBe('Morning Quran');
      expect(created.startDate).toBe('2026-09-15');
      expect(created.scheduleType).toBe('EXACT_TIME');
      expect(created.scheduleData).toEqual({ localTime: '06:30' });
      expect(created.priority).toBe('IMPORTANT');
      expect(created.tags).toEqual(['worship', 'morning']);
      expect(created.subtasks).toHaveLength(2);
      expect(created.createdAt).toBeDefined();

      const fetched = await taskDefinitionRepository.findById('def-exact');
      expect(fetched).toEqual(created);
    });

    it('creates and retrieves a PRAYER_RELATIVE TaskDefinition', async () => {
      const created = await taskDefinitionRepository.create({
        id: 'def-rel',
        title: 'Dhikr after Maghrib',
        startDate: '2026-09-15',
        source: 'WORSHIP',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'MAGHRIB',
          direction: 'AFTER',
          offsetMinutes: 15,
        },
        seriesId: 'def-rel',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 10,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      expect(created.scheduleType).toBe('PRAYER_RELATIVE');
      expect(created.scheduleData).toEqual({
        anchorPrayer: 'MAGHRIB',
        direction: 'AFTER',
        offsetMinutes: 15,
      });

      const fetched = await taskDefinitionRepository.findById('def-rel');
      expect(fetched?.scheduleData).toEqual(created.scheduleData);
    });

    it('creates and retrieves a PRAYER_WINDOW TaskDefinition', async () => {
      const created = await taskDefinitionRepository.create({
        id: 'def-win',
        title: 'Study Window',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: {
          startPrayer: 'FAJR',
          endPrayer: 'DHUHR',
        },
        seriesId: 'def-win',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 120,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      expect(created.scheduleType).toBe('PRAYER_WINDOW');
      expect(created.scheduleData).toEqual({
        startPrayer: 'FAJR',
        endPrayer: 'DHUHR',
      });
    });

    it('creates and retrieves an ANYTIME_TODAY TaskDefinition', async () => {
      const created = await taskDefinitionRepository.create({
        id: 'def-anytime',
        title: 'Give Charity',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'def-anytime',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      expect(created.scheduleType).toBe('ANYTIME_TODAY');
      expect(created.scheduleData).toEqual({});
    });
  });

  describe('Validation & Guards', () => {
    it('rejects empty title on creation', async () => {
      await expect(
        taskDefinitionRepository.create({
          id: 'def-bad-title',
          title: '   ',
          startDate: '2026-09-15',
          scheduleType: 'ANYTIME_TODAY',
          scheduleData: {},
          seriesId: 'def-bad-title',
          seriesVersion: 1,
          priority: 'NORMAL',
          estimatedMinutes: null,
          notes: null,
          tags: [],
          subtasks: [],
          isActive: true,
        })
      ).rejects.toThrow(TaskValidationError);
    });

    it('rejects invalid startDate on creation', async () => {
      await expect(
        taskDefinitionRepository.create({
          id: 'def-bad-date',
          title: 'Title',
          startDate: 'not-a-date',
          scheduleType: 'ANYTIME_TODAY',
          scheduleData: {},
          seriesId: 'def-bad-date',
          seriesVersion: 1,
          priority: 'NORMAL',
          estimatedMinutes: null,
          notes: null,
          tags: [],
          subtasks: [],
          isActive: true,
        })
      ).rejects.toThrow(TaskValidationError);
    });

    it('IM-01: rejects mutation of immutable fields via update()', async () => {
      await taskDefinitionRepository.create({
        id: 'def-immutable',
        title: 'Original Title',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-imm',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      // Attempt to mutate id
      await expect(
        taskDefinitionRepository.update('def-immutable', { id: 'new-id' } as any)
      ).rejects.toThrow(TaskValidationError);

      // Attempt to mutate seriesId
      await expect(
        taskDefinitionRepository.update('def-immutable', { seriesId: 'new-series' } as any)
      ).rejects.toThrow(TaskValidationError);

      // Attempt to mutate seriesVersion
      await expect(
        taskDefinitionRepository.update('def-immutable', { seriesVersion: 2 } as any)
      ).rejects.toThrow(TaskValidationError);

      // Attempt to mutate createdAt
      await expect(
        taskDefinitionRepository.update('def-immutable', { createdAt: 'new-time' } as any)
      ).rejects.toThrow(TaskValidationError);
    });

    it('updates mutable fields successfully', async () => {
      await taskDefinitionRepository.create({
        id: 'def-mutate',
        title: 'Original Title',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-mut',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 15,
        notes: 'Notes 1',
        tags: ['t1'],
        subtasks: [],
        isActive: true,
      });

      const updated = await taskDefinitionRepository.update('def-mutate', {
        title: 'Updated Title',
        priority: 'IMPORTANT',
        estimatedMinutes: 45,
        tags: ['t1', 't2'],
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('IMPORTANT');
      expect(updated.estimatedMinutes).toBe(45);
      expect(updated.tags).toEqual(['t1', 't2']);
    });
  });

  describe('Series Queries & SV-01 Active Version Resolution', () => {
    it('SV-01: findActiveBySeriesId returns open version and ignores closed predecessor', async () => {
      // Version 1: closed from 2026-09-01 to 2026-09-14
      await taskDefinitionRepository.create({
        id: 'v1',
        title: 'Workout V1',
        startDate: '2026-09-01',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '07:00' },
        seriesId: 'series-sv',
        seriesVersion: 1,
        effectiveFromDate: '2026-09-01',
        effectiveToDate: '2026-09-14',
        priority: 'NORMAL',
        estimatedMinutes: 30,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      // Version 2: open from 2026-09-15 onward
      await taskDefinitionRepository.create({
        id: 'v2',
        title: 'Workout V2 (Earlier)',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '06:00' },
        seriesId: 'series-sv',
        seriesVersion: 2,
        effectiveFromDate: '2026-09-15',
        effectiveToDate: null,
        priority: 'NORMAL',
        estimatedMinutes: 30,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      const allVersions = await taskDefinitionRepository.findBySeriesId('series-sv');
      expect(allVersions).toHaveLength(2);
      expect(allVersions[0].seriesVersion).toBe(1);
      expect(allVersions[1].seriesVersion).toBe(2);

      const active = await taskDefinitionRepository.findActiveBySeriesId('series-sv');
      expect(active).toBeDefined();
      expect(active?.id).toBe('v2');
      expect(active?.seriesVersion).toBe(2);
      expect(active?.scheduleData).toEqual({ localTime: '06:00' });
    });
  });

  describe('Guarded Hard Delete (HD-01)', () => {
    it('HD-01: rejects hard-delete if terminal historical occurrences exist', async () => {
      await taskDefinitionRepository.create({
        id: 'def-with-history',
        title: 'Parent Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-hd',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      // Insert a completed occurrence directly
      nodeDb
        .prepare(
          `INSERT INTO task_occurrences (id, task_definition_id, series_id, local_date, planning_day_key, timezone, status, completed_at)
           VALUES ('occ-comp', 'def-with-history', 'series-hd', '2026-09-15', '2026-09-15', 'UTC', 'COMPLETED', 'now')`
        )
        .run();

      await expect(
        taskDefinitionRepository.delete('def-with-history')
      ).rejects.toThrow(TaskValidationError);

      const stillExists = await taskDefinitionRepository.findById('def-with-history');
      expect(stillExists).toBeDefined();
    });

    it('HD-01b: allows hard-delete if NO terminal occurrences exist', async () => {
      await taskDefinitionRepository.create({
        id: 'def-no-history',
        title: 'Unmaterialized Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        seriesId: 'series-clean',
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: null,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });

      await taskDefinitionRepository.delete('def-no-history');
      const fetched = await taskDefinitionRepository.findById('def-no-history');
      expect(fetched).toBeNull();
    });
  });

  describe('Data Integrity & Corrupted JSON Detection', () => {
    it('throws DataIntegrityError on malformed persisted subtasks JSON', async () => {
      nodeDb
        .prepare(
          `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, subtasks, created_at, updated_at)
           VALUES ('corrupt-sub', 'Corrupt Subtasks', '2026-09-15', 'ANYTIME_TODAY', '{}', 's1', '{not valid json}', 'now', 'now')`
        )
        .run();

      await expect(taskDefinitionRepository.findById('corrupt-sub')).rejects.toThrow(
        DataIntegrityError
      );
    });

    it('throws DataIntegrityError on malformed persisted scheduleData JSON', async () => {
      nodeDb
        .prepare(
          `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, created_at, updated_at)
           VALUES ('corrupt-sched', 'Corrupt Schedule', '2026-09-15', 'EXACT_TIME', '{"localTime":"99:99"}', 's2', 'now', 'now')`
        )
        .run();

      await expect(taskDefinitionRepository.findById('corrupt-sched')).rejects.toThrow(
        DataIntegrityError
      );
    });
  });
});
