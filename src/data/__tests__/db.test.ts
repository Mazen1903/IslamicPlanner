import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { createTestDatabase, cleanupTestDatabase } from './testDbHelper';

describe('Database Schema, Constraints and Migration (0001_initial.sql)', () => {
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
});
