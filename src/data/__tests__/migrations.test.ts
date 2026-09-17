import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '../schema';
import { loadMigrationConfig, migrateDatabase } from '../migrator';

function createMockClient(nodeDb: DatabaseSync) {
  return {
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
}

describe('Drizzle Migrations & Discovery (MG Suite)', () => {
  it('MG-04: Journal, snapshot, migration SQL, and runtime migrations.js are consistent', () => {
    const config = loadMigrationConfig();
    expect(config.journal.entries.length).toBeGreaterThanOrEqual(2);

    // Verify each journal entry has a valid SQL file, snapshot, and runtime migrations.js mapping
    for (const entry of config.journal.entries) {
      const key = `m${entry.idx.toString().padStart(4, '0')}`;
      expect(config.migrations[key]).toBeDefined();
      expect(typeof config.migrations[key]).toBe('string');
      expect(config.migrations[key].length).toBeGreaterThan(0);

      // Verify SQL file exists on disk
      const sqlPath = path.join(__dirname, '..', 'migrations', `${entry.tag}.sql`);
      expect(fs.existsSync(sqlPath)).toBe(true);

      // Verify snapshot file exists for this index
      const snapshotPath = path.join(
        __dirname,
        '..',
        'migrations',
        'meta',
        `${entry.idx.toString().padStart(4, '0')}_snapshot.json`
      );
      expect(fs.existsSync(snapshotPath)).toBe(true);
    }

    // Verify runtime migrations.js imports and exports all journal entries
    const migrationsJsPath = path.join(__dirname, '..', 'migrations', 'migrations.js');
    expect(fs.existsSync(migrationsJsPath)).toBe(true);
    const migrationsJsContent = fs.readFileSync(migrationsJsPath, 'utf8');

    for (const entry of config.journal.entries) {
      const key = `m${entry.idx.toString().padStart(4, '0')}`;
      // Verify import statement for SQL file exists in migrations.js
      expect(migrationsJsContent).toContain(`import ${key} from './${entry.tag}.sql'`);
      // Verify key is included in migrations object
      expect(migrationsJsContent).toMatch(new RegExp(`\\b${key}\\b`));
    }
  });

  it('MG-01: Fresh DB applies 0000 + M6 migration and creates all expected tables and columns', async () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    const client = createMockClient(nodeDb);
    const db = drizzle(client as any, { schema });

    await migrateDatabase(db);

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

    // Verify task_occurrences columns include window_start and window_end
    const columns = (
      nodeDb.prepare("PRAGMA table_info('task_occurrences')").all() as { name: string }[]
    ).map(c => c.name);

    expect(columns).toContain('window_start');
    expect(columns).toContain('window_end');
    expect(columns).toContain('calculated_start_time');
    expect(columns).toContain('calculated_prayer_section');
    expect(columns).toContain('eligible_prayer_sections');
    expect(columns).toContain('wall_clock_resolution');
    expect(columns).toContain('status');
  });

  it('MG-02: Upgrade M4-era DB with existing occurrence data preserves rows and sets new columns null', async () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    // 1. Manually apply ONLY 0000_initial migration to simulate M4-era database
    const initialSqlPath = path.join(__dirname, '..', 'migrations', '0000_initial.sql');
    const initialSql = fs.readFileSync(initialSqlPath, 'utf8');
    for (const stmt of initialSql.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim();
      if (trimmed) nodeDb.exec(trimmed);
    }

    // Record 0000_initial as applied in __drizzle_migrations
    nodeDb.exec(
      `CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash text NOT NULL,
        created_at numeric
      );`
    );
    nodeDb
      .prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)')
      .run('0000_initial_hash', 1789444181320);

    // 2. Insert M4-era task_definition and task_occurrence rows
    nodeDb.exec(`
      INSERT INTO task_definitions (
        id, title, start_date, schedule_type, schedule_data, series_id, series_version,
        is_active, created_at, updated_at
      ) VALUES (
        'def-m4-legacy', 'Legacy M4 Task', '2026-09-15', 'EXACT_TIME',
        '{"time":"12:00"}', 'series-m4-legacy', 1, 1, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'
      );
    `);

    nodeDb.exec(`
      INSERT INTO task_occurrences (
        id, task_definition_id, series_id, local_date, planning_day_key, timezone,
        status, completed_at, missed_at, override_data
      ) VALUES (
        'occ-m4-legacy', 'def-m4-legacy', 'series-m4-legacy', '2026-09-15', '2026-09-15',
        'America/Chicago', 'PENDING', NULL, NULL, NULL
      );
    `);

    // 3. Now run production migrator to upgrade to M6
    const client = createMockClient(nodeDb);
    const db = drizzle(client as any, { schema });
    await migrateDatabase(db);

    // 4. Verify existing occurrence was preserved with window_start and window_end as null
    const row = nodeDb
      .prepare('SELECT id, task_definition_id, series_id, window_start, window_end, status FROM task_occurrences WHERE id = ?')
      .get('occ-m4-legacy') as any;

    expect(row).toBeDefined();
    expect(row.id).toBe('occ-m4-legacy');
    expect(row.task_definition_id).toBe('def-m4-legacy');
    expect(row.series_id).toBe('series-m4-legacy');
    expect(row.status).toBe('PENDING');
    expect(row.window_start).toBeNull();
    expect(row.window_end).toBeNull();
  });

  it('MG-03: Migration runner applies exactly once and is safe/idempotent on re-run', async () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    const client = createMockClient(nodeDb);
    const db = drizzle(client as any, { schema });

    // First run
    await migrateDatabase(db);
    const config = loadMigrationConfig();
    const recorded1 = nodeDb.prepare('SELECT id, hash, created_at FROM __drizzle_migrations').all();
    expect(recorded1).toHaveLength(config.journal.entries.length);

    // Second run
    await migrateDatabase(db);
    const recorded2 = nodeDb.prepare('SELECT id, hash, created_at FROM __drizzle_migrations').all();
    expect(recorded2).toHaveLength(config.journal.entries.length);
  });

  it('MG-05: Fresh DB includes last_auto_latitude and last_auto_longitude columns on user_settings', async () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    const client = createMockClient(nodeDb);
    const db = drizzle(client as any, { schema });

    await migrateDatabase(db);

    const columns = (
      nodeDb.prepare("PRAGMA table_info('user_settings')").all() as { name: string }[]
    ).map(c => c.name);

    expect(columns).toContain('last_auto_latitude');
    expect(columns).toContain('last_auto_longitude');
    expect(columns).toContain('location_mode');
    expect(columns).toContain('manual_latitude');
    expect(columns).toContain('manual_longitude');
    expect(columns).toContain('last_known_timezone');
  });

  it('MG-06: Upgrade M11-era DB with legacy AUTO row backfills location_mode to MANUAL', async () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    // 1. Apply 0000 and 0001
    for (const file of ['0000_initial.sql', '0001_lazy_the_order.sql']) {
      const sqlContent = fs.readFileSync(path.join(__dirname, '..', 'migrations', file), 'utf8');
      for (const stmt of sqlContent.split('--> statement-breakpoint')) {
        const trimmed = stmt.trim();
        if (trimmed) nodeDb.exec(trimmed);
      }
    }

    // Record 0000 and 0001 as already applied in __drizzle_migrations
    nodeDb.exec(
      `CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash text NOT NULL,
        created_at numeric
      );`
    );
    const insertStmt = nodeDb.prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)');
    insertStmt.run('0000_initial_hash', 1789444181320);
    insertStmt.run('0001_lazy_hash', 1789449475179);

    // Insert legacy user_settings row with default AUTO mode and configured manual location
    nodeDb.exec(`
      INSERT INTO user_settings (
        id, location_mode, manual_latitude, manual_longitude, manual_location_name,
        manual_timezone, last_known_timezone, calculation_method, created_at, updated_at
      ) VALUES (
        'default', 'AUTO', 41.8781, -87.6298, 'Chicago',
        'America/Chicago', 'America/Chicago', 'MWL', '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'
      );
    `);

    // 2. Now run migration to apply 0002
    const client = createMockClient(nodeDb);
    const db = drizzle(client as any, { schema });
    await migrateDatabase(db);

    // 3. Verify row was backfilled to MANUAL
    const row = nodeDb
      .prepare('SELECT location_mode, manual_latitude, manual_longitude, last_auto_latitude, last_auto_longitude FROM user_settings WHERE id = ?')
      .get('default') as any;

    expect(row).toBeDefined();
    expect(row.location_mode).toBe('MANUAL');
    expect(row.manual_latitude).toBeCloseTo(41.8781);
    expect(row.manual_longitude).toBeCloseTo(-87.6298);
    expect(row.last_auto_latitude).toBeNull();
    expect(row.last_auto_longitude).toBeNull();
  });
});
