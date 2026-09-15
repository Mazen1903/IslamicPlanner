import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '../schema';
import { loadMigrationConfig, migrateDatabase } from '../migrator';

describe('Drizzle Migrations & Discovery', () => {
  it('discovers migrations and reports journal entries matching migration files', () => {
    const config = loadMigrationConfig();
    expect(config.journal.entries.length).toBeGreaterThanOrEqual(1);

    for (const entry of config.journal.entries) {
      const key = `m${entry.idx.toString().padStart(4, '0')}`;
      expect(config.migrations[key]).toBeDefined();
      expect(typeof config.migrations[key]).toBe('string');
      expect(config.migrations[key].length).toBeGreaterThan(0);
      expect(entry.tag).toBe('0000_initial');
    }
  });

  it('runs migrations on a fresh empty DB, creates all expected tables, and is idempotent on re-run', async () => {
    // 1. Fresh empty DB
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    // Verify DB is initially completely empty
    const initialTables = nodeDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(initialTables.filter((t: any) => !t.name.startsWith('sqlite_'))).toHaveLength(0);

    // Mock client compatible with ExpoSQLiteDatabase & Drizzle migrator
    const client = {
      execSync(sql: string) {
        nodeDb.exec(sql);
      },
      runSync(sql: string, params: any[] = []) {
        const stmt = nodeDb.prepare(sql);
        return stmt.run(...params);
      },
      prepareSync(sql: string) {
        const stmt = nodeDb.prepare(sql);
        return {
          executeSync(params: any[] = []) {
            try {
              const rows = stmt.all(...params);
              return {
                getAllSync: () => rows,
                getFirstSync: () => rows[0] ?? null,
                changes: 1,
                lastInsertRowId: 1,
              };
            } catch {
              const info = stmt.run(...params);
              return {
                getAllSync: () => [],
                getFirstSync: () => null,
                changes: Number(info.changes),
                lastInsertRowId: Number(info.lastInsertRowid),
              };
            }
          },
          executeForRawResultSync(params: any[] = []) {
            try {
              const rows = stmt.all(...params);
              const rawRows = rows.map((r: any) => Object.values(r as object));
              return {
                getAllSync: () => rawRows,
                getFirstSync: () => rawRows[0] ?? null,
              };
            } catch {
              stmt.run(...params);
              return {
                getAllSync: () => [],
                getFirstSync: () => null,
              };
            }
          },
        };
      },
    };

    const db = drizzle(client as any, { schema });

    // 2. First migration run via production loader
    await migrateDatabase(db);

    // 3. Verify all expected tables exist
    const postMigrationTables = (
      nodeDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map(t => t.name);

    const expectedTables = [
      '__drizzle_migrations',
      'hijri_month_overrides',
      'notification_schedule',
      'prayer_cache',
      'task_definitions',
      'task_occurrences',
      'user_settings',
      'worship_item_settings',
    ];

    for (const expected of expectedTables) {
      expect(postMigrationTables).toContain(expected);
    }

    // Verify __drizzle_migrations recorded the migration
    const recordedMigrations = nodeDb.prepare('SELECT id, hash, created_at FROM __drizzle_migrations').all();
    expect(recordedMigrations).toHaveLength(1);

    // Verify indexes and constraints exist
    const indexes = (
      nodeDb.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as { name: string }[]
    ).map(i => i.name);

    expect(indexes).toContain('unique_year_month');
    expect(indexes).toContain('idx_task_definitions_series_id');
    expect(indexes).toContain('unique_series_version');
    expect(indexes).toContain('idx_task_occurrences_planning_day');
    expect(indexes).toContain('idx_task_occurrences_date');
    expect(indexes).toContain('idx_task_occurrences_series_id');
    expect(indexes).toContain('unique_def_date');
    expect(indexes).toContain('unique_series_date');
    expect(indexes).toContain('worship_item_settings_worship_item_key_unique');

    // 4. Running migrations again is safe and idempotent according to Drizzle
    await migrateDatabase(db);

    const recordedMigrationsAfter = nodeDb.prepare('SELECT id, hash, created_at FROM __drizzle_migrations').all();
    expect(recordedMigrationsAfter).toHaveLength(1);

    const tablesAfter = (
      nodeDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map(t => t.name);
    expect(tablesAfter).toEqual(postMigrationTables);
  });
});
