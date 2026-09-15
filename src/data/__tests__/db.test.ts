import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { createTestDatabase, cleanupTestDatabase } from './testDbHelper';
import { runInTransaction } from '../db';
import { TaskDefinitionRepository } from '../repositories/TaskDefinitionRepository';
import { TaskOccurrenceRepository } from '../repositories/TaskOccurrenceRepository';

describe('Database Schema, Constraints and Migration (0000_initial.sql)', () => {
  let db: ReturnType<typeof createTestDatabase>['db'];
  let nodeDb: ReturnType<typeof createTestDatabase>['nodeDb'];

  beforeEach(() => {
    const testDb = createTestDatabase();
    db = testDb.db;
    nodeDb = testDb.nodeDb;
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('verifies 0001_initial.sql creates all 7 tables and sets foreign keys', () => {
    const tables = nodeDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain('task_definitions');
    expect(tables).toContain('task_occurrences');
    expect(tables).toContain('user_settings');
    expect(tables).toContain('hijri_month_overrides');
    expect(tables).toContain('worship_item_settings');
    expect(tables).toContain('prayer_cache');
    expect(tables).toContain('notification_schedule');
  });

  it('enforces SQLite CHECK constraint on schedule_type', () => {
    expect(() => {
      nodeDb
        .prepare(
          `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, created_at, updated_at)
           VALUES ('d1', 'Test', '2026-09-15', 'INVALID_TYPE', '{}', 's1', 'now', 'now')`
        )
        .run();
    }).toThrow(/CHECK constraint failed/);
  });

  it('enforces SQLite CHECK constraint on priority', () => {
    expect(() => {
      nodeDb
        .prepare(
          `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, priority, created_at, updated_at)
           VALUES ('d1', 'Test', '2026-09-15', 'EXACT_TIME', '{"localTime":"12:00"}', 's1', 'URGENT', 'now', 'now')`
        )
        .run();
    }).toThrow(/CHECK constraint failed/);
  });

  it('enforces SQLite CHECK constraint on series_version >= 1', () => {
    expect(() => {
      nodeDb
        .prepare(
          `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, series_version, created_at, updated_at)
           VALUES ('d1', 'Test', '2026-09-15', 'EXACT_TIME', '{"localTime":"12:00"}', 's1', 0, 'now', 'now')`
        )
        .run();
    }).toThrow(/CHECK constraint failed/);
  });

  it('enforces SQLite CHECK constraint on occurrence status', () => {
    db.insert(schema.taskDefinitions)
      .values({
        id: 'd1',
        title: 'Parent',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: '{"localTime":"12:00"}',
        seriesId: 's1',
        seriesVersion: 1,
        createdAt: 'now',
        updatedAt: 'now',
      })
      .run();

    expect(() => {
      nodeDb
        .prepare(
          `INSERT INTO task_occurrences (id, task_definition_id, series_id, local_date, planning_day_key, timezone, status)
           VALUES ('o1', 'd1', 's1', '2026-09-15', '2026-09-15', 'UTC', 'OVERDUE')`
        )
        .run();
    }).toThrow(/CHECK constraint failed/);
  });

  it('enforces UNIQUE(seriesId, seriesVersion) on task_definitions', () => {
    db.insert(schema.taskDefinitions)
      .values({
        id: 'd1',
        title: 'V1',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: '{"localTime":"12:00"}',
        seriesId: 'series-1',
        seriesVersion: 1,
        createdAt: 'now',
        updatedAt: 'now',
      })
      .run();

    expect(() => {
      db.insert(schema.taskDefinitions)
        .values({
          id: 'd2',
          title: 'Duplicate V1',
          startDate: '2026-09-15',
          scheduleType: 'EXACT_TIME',
          scheduleData: '{"localTime":"12:00"}',
          seriesId: 'series-1',
          seriesVersion: 1,
          createdAt: 'now',
          updatedAt: 'now',
        })
        .run();
    }).toThrow(/UNIQUE constraint failed/);
  });

  it('enforces UNIQUE(seriesId, localDate) on task_occurrences', () => {
    db.insert(schema.taskDefinitions)
      .values({
        id: 'd1',
        title: 'Def 1',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: '{"localTime":"12:00"}',
        seriesId: 'series-1',
        seriesVersion: 1,
        createdAt: 'now',
        updatedAt: 'now',
      })
      .run();

    db.insert(schema.taskOccurrences)
      .values({
        id: 'o1',
        taskDefinitionId: 'd1',
        seriesId: 'series-1',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      })
      .run();

    expect(() => {
      db.insert(schema.taskOccurrences)
        .values({
          id: 'o2',
          taskDefinitionId: 'd1',
          seriesId: 'series-1',
          localDate: '2026-09-15',
          planningDayKey: '2026-09-15',
          timezone: 'UTC',
          status: 'PENDING',
        })
        .run();
    }).toThrow(/UNIQUE constraint failed/);
  });

  it('enforces foreign key cascade deletion from task_definitions to task_occurrences', () => {
    db.insert(schema.taskDefinitions)
      .values({
        id: 'def-parent',
        title: 'Parent Task',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: '{"localTime":"12:00"}',
        seriesId: 'series-cascade',
        seriesVersion: 1,
        createdAt: 'now',
        updatedAt: 'now',
      })
      .run();

    db.insert(schema.taskOccurrences)
      .values({
        id: 'occ-child',
        taskDefinitionId: 'def-parent',
        seriesId: 'series-cascade',
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'UTC',
        status: 'PENDING',
      })
      .run();

    // Delete parent definition
    db.delete(schema.taskDefinitions)
      .where(eq(schema.taskDefinitions.id, 'def-parent'))
      .run();

    const occurrences = db
      .select()
      .from(schema.taskOccurrences)
      .where(eq(schema.taskOccurrences.id, 'occ-child'))
      .all();

    expect(occurrences).toHaveLength(0);
  });

  it('verifies manualTimezone column is present in user_settings', () => {
    const columns = nodeDb
      .prepare("PRAGMA table_info('user_settings')")
      .all()
      .map((c: any) => c.name);

    expect(columns).toContain('manual_timezone');
    expect(columns).toContain('last_known_timezone');
  });

  describe('Transaction Architecture & Concurrency', () => {
    it('concurrency regression: Tx B started while Tx A is paused does NOT become a SAVEPOINT and serializes after Tx A', async () => {
      const testDb = createTestDatabase();
      const client = testDb.client;

      const executedCommands: string[] = [];
      const origExecSync = client.execSync;
      client.execSync = (sql: string) => {
        executedCommands.push(sql);
        origExecSync(sql);
      };

      let resolveA!: () => void;
      const pauseA = new Promise<void>(resolve => {
        resolveA = resolve;
      });

      let txAStarted = false;
      let txAFinished = false;
      let txBStarted = false;
      let txBFinished = false;

      // Start transaction A
      const promiseA = runInTransaction(async () => {
        txAStarted = true;
        // Insert in A
        testDb.nodeDb
          .prepare(
            `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, created_at, updated_at)
             VALUES ('def-a', 'Task A', '2026-09-15', 'EXACT_TIME', '{"localTime":"12:00"}', 's-a', '2026-09-15T12:00:00.000Z', '2026-09-15T12:00:00.000Z')`
          )
          .run();
        // Pause A after BEGIN and write
        await pauseA;
        txAFinished = true;
      });

      // Wait until Tx A has started and acquired the lock
      while (!txAStarted) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      expect(txAStarted).toBe(true);
      expect(txAFinished).toBe(false);

      // Start transaction B while Tx A is paused
      const promiseB = runInTransaction(async () => {
        txBStarted = true;
        // Tx B must only execute AFTER Tx A has fully finished and committed
        expect(txAFinished).toBe(true);
        testDb.nodeDb
          .prepare(
            `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, created_at, updated_at)
             VALUES ('def-b', 'Task B', '2026-09-15', 'EXACT_TIME', '{"localTime":"14:00"}', 's-b', '2026-09-15T14:00:00.000Z', '2026-09-15T14:00:00.000Z')`
          )
          .run();
        txBFinished = true;
      });

      // Allow event loop to process microtasks
      await new Promise(resolve => setTimeout(resolve, 20));

      // Assert Tx B has NOT started yet while Tx A is paused
      expect(txBStarted).toBe(false);
      // Assert Tx B was NOT executed as a SAVEPOINT belonging to Tx A
      expect(executedCommands.filter(cmd => cmd.includes('SAVEPOINT'))).toHaveLength(0);

      // Now unpause Tx A
      resolveA();
      await promiseA;

      expect(txAFinished).toBe(true);

      // Now Tx B can run and finish
      await promiseB;
      expect(txBFinished).toBe(true);

      // Verify sequence of transaction boundaries
      const txBoundaries = executedCommands.filter(
        cmd => cmd.includes('BEGIN') || cmd.includes('COMMIT') || cmd.includes('SAVEPOINT')
      );
      expect(txBoundaries).toEqual([
        'BEGIN TRANSACTION;',
        'COMMIT;',
        'BEGIN TRANSACTION;',
        'COMMIT;',
      ]);

      // Both definitions exist
      const count = testDb.nodeDb
        .prepare("SELECT count(*) as count FROM task_definitions WHERE id IN ('def-a', 'def-b')")
        .get() as any;
      expect(count.count).toBe(2);
    });

    it('rolls back root transaction completely on error', async () => {
      const testDb = createTestDatabase();

      await expect(
        runInTransaction(async () => {
          testDb.nodeDb
            .prepare(
              `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, created_at, updated_at)
               VALUES ('def-fail', 'Task Fail', '2026-09-15', 'EXACT_TIME', '{"localTime":"12:00"}', 's-fail', '2026-09-15T12:00:00.000Z', '2026-09-15T12:00:00.000Z')`
            )
            .run();
          throw new Error('Simulated failure during transaction');
        })
      ).rejects.toThrow('Simulated failure during transaction');

      const found = testDb.nodeDb
        .prepare("SELECT * FROM task_definitions WHERE id = 'def-fail'")
        .get();
      expect(found).toBeUndefined();
    });

    it('supports explicit nested transactions via savepoints and rolls back only savepoint on nested error', async () => {
      const testDb = createTestDatabase();

      await runInTransaction(async (tx) => {
        // Outer write
        testDb.nodeDb
          .prepare(
            `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, created_at, updated_at)
             VALUES ('def-outer', 'Outer Task', '2026-09-15', 'EXACT_TIME', '{"localTime":"12:00"}', 's-outer', '2026-09-15T12:00:00.000Z', '2026-09-15T12:00:00.000Z')`
          )
          .run();

        // Nested operation that fails
        try {
          await runInTransaction(async () => {
            testDb.nodeDb
              .prepare(
                `INSERT INTO task_definitions (id, title, start_date, schedule_type, schedule_data, series_id, created_at, updated_at)
                 VALUES ('def-inner', 'Inner Task', '2026-09-15', 'EXACT_TIME', '{"localTime":"12:00"}', 's-outer', '2026-09-15T12:00:00.000Z', '2026-09-15T12:00:00.000Z')`
              )
              .run();
            throw new Error('Inner error');
          }, tx);
        } catch {
          // Expected inner failure
        }
      });

      // Outer row was committed
      const outer = testDb.nodeDb
        .prepare("SELECT * FROM task_definitions WHERE id = 'def-outer'")
        .get();
      expect(outer).toBeDefined();

      // Inner row was rolled back via savepoint
      const inner = testDb.nodeDb
        .prepare("SELECT * FROM task_definitions WHERE id = 'def-inner'")
        .get();
      expect(inner).toBeUndefined();
    });

    it('proves createBatch called within an existing transaction does not attempt an independent nested BEGIN', async () => {
      const testDb = createTestDatabase();
      const client = testDb.client;

      const defRepo = new TaskDefinitionRepository();
      const occRepo = new TaskOccurrenceRepository();

      const def = await defRepo.create({
        id: 'def-batch',
        title: 'Batch Parent',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
        seriesId: 'series-batch',
      });

      const executedCommands: string[] = [];
      const origExecSync = client.execSync;
      client.execSync = (sql: string) => {
        executedCommands.push(sql);
        origExecSync(sql);
      };

      await runInTransaction(async (tx) => {
        const batchResults = await occRepo.createBatch(
          [
            {
              taskDefinitionId: def.id,
              localDate: '2026-09-15',
              planningDayKey: '2026-09-15',
              timezone: 'America/Chicago',
              status: 'PENDING',
            },
            {
              taskDefinitionId: def.id,
              localDate: '2026-09-16',
              planningDayKey: '2026-09-16',
              timezone: 'America/Chicago',
              status: 'PENDING',
            },
          ],
          tx
        );

        expect(batchResults).toHaveLength(2);
      });

      // BEGIN TRANSACTION must occur exactly ONCE (for the outer root transaction)
      const beginCommands = executedCommands.filter(cmd => cmd.includes('BEGIN TRANSACTION'));
      expect(beginCommands).toHaveLength(1);

      // Exactly one COMMIT
      const commitCommands = executedCommands.filter(cmd => cmd === 'COMMIT;');
      expect(commitCommands).toHaveLength(1);

      // Both occurrences exist
      const occurrences = await occRepo.findBySeriesId('series-batch');
      expect(occurrences).toHaveLength(2);
    });
  });
});
