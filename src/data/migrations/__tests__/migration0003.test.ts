import { DatabaseSync } from 'node:sqlite';
import { loadMigrationConfig } from '@/data/migrator';

describe('Migration 0003 Compatibility', () => {
  it('JM-01: Migration 0003 applies cleanly on existing M14-era database', () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    const config = loadMigrationConfig();

    // 1. Apply migrations 0000, 0001, 0002 (M14 baseline)
    for (let i = 0; i <= 2; i++) {
      const entry = config.journal.entries[i];
      const key = `m${entry.idx.toString().padStart(4, '0')}`;
      const sql = config.migrations[key];
      expect(sql).toBeDefined();
      const statements = sql.split('--> statement-breakpoint');
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) nodeDb.exec(trimmed);
      }
    }

    // 2. Insert sample M14 data (user_settings, task_definitions)
    nodeDb.exec(`
      INSERT INTO user_settings (id, location_mode, calculation_method, asr_method, created_at, updated_at)
      VALUES ('default', 'MANUAL', 'MWL', 'SHAFI', '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');
    `);

    nodeDb.exec(`
      INSERT INTO task_definitions (
        id, title, start_date, schedule_type, schedule_data, series_id, series_version, created_at, updated_at
      ) VALUES (
        'def-1', 'Morning adhkar', '2026-09-17', 'ANYTIME_TODAY', '{}', 'series-1', 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'
      );
    `);

    // 3. Apply migration 0003
    const entry0003 = config.journal.entries[3];
    expect(entry0003).toBeDefined();
    const key0003 = `m${entry0003.idx.toString().padStart(4, '0')}`;
    const sql0003 = config.migrations[key0003];
    expect(sql0003).toBeDefined();

    const statements0003 = sql0003.split('--> statement-breakpoint');
    for (const statement of statements0003) {
      const trimmed = statement.trim();
      if (trimmed) nodeDb.exec(trimmed);
    }

    // 4. Verify existing M14 data is completely intact
    const userRow = nodeDb.prepare("SELECT * FROM user_settings WHERE id = 'default'").get() as any;
    expect(userRow).toBeDefined();
    expect(userRow.calculation_method).toBe('MWL');

    const taskRow = nodeDb.prepare("SELECT * FROM task_definitions WHERE id = 'def-1'").get() as any;
    expect(taskRow).toBeDefined();
    expect(taskRow.title).toBe('Morning adhkar');

    // 5. Verify journal_entries table exists and can be written to
    nodeDb.exec(`
      INSERT INTO journal_entries (id, planning_day_key, encrypted_payload, encryption_version, revision, created_at, updated_at)
      VALUES ('j-1', '2026-09-17', 'payload-base64', 1, 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');
    `);

    const journalRow = nodeDb.prepare("SELECT * FROM journal_entries WHERE id = 'j-1'").get() as any;
    expect(journalRow).toBeDefined();
    expect(journalRow.planning_day_key).toBe('2026-09-17');
    expect(journalRow.encrypted_payload).toBe('payload-base64');
  });

  it('JM-03: Existing Worship schema (worship_item_settings, worshipItemKey, source WORSHIP) remains valid', () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    const config = loadMigrationConfig();
    for (const entry of config.journal.entries) {
      const key = `m${entry.idx.toString().padStart(4, '0')}`;
      const sql = config.migrations[key];
      if (sql) {
        for (const stmt of sql.split('--> statement-breakpoint')) {
          const trimmed = stmt.trim();
          if (trimmed) nodeDb.exec(trimmed);
        }
      }
    }

    // Verify worship_item_settings can accept dormant records
    nodeDb.exec(`
      INSERT INTO worship_item_settings (id, worship_item_key, is_enabled, created_at, updated_at)
      VALUES ('w-1', 'DUHA_PRAYER', 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');
    `);

    // Verify task_definitions with source='WORSHIP' and worship_item_key is accepted by check constraints
    nodeDb.exec(`
      INSERT INTO task_definitions (
        id, title, start_date, source, worship_item_key, schedule_type, schedule_data, series_id, series_version, created_at, updated_at
      ) VALUES (
        'w-task-1', 'Duha', '2026-09-17', 'WORSHIP', 'DUHA_PRAYER', 'ANYTIME_TODAY', '{}', 'w-series-1', 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'
      );
    `);

    const row = nodeDb.prepare("SELECT * FROM task_definitions WHERE id = 'w-task-1'").get() as any;
    expect(row.source).toBe('WORSHIP');
    expect(row.worship_item_key).toBe('DUHA_PRAYER');
  });

  it('JM-04: journal_entries UNIQUE constraint on planning_day_key is enforced in SQLite', () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    const config = loadMigrationConfig();
    for (const entry of config.journal.entries) {
      const key = `m${entry.idx.toString().padStart(4, '0')}`;
      const sql = config.migrations[key];
      if (sql) {
        for (const stmt of sql.split('--> statement-breakpoint')) {
          const trimmed = stmt.trim();
          if (trimmed) nodeDb.exec(trimmed);
        }
      }
    }

    nodeDb.exec(`
      INSERT INTO journal_entries (id, planning_day_key, encrypted_payload, encryption_version, revision, created_at, updated_at)
      VALUES ('entry-1', '2026-09-15', 'payload-1', 1, 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');
    `);

    // Second direct INSERT with duplicate planning_day_key must fail UNIQUE constraint
    expect(() => {
      nodeDb.exec(`
        INSERT INTO journal_entries (id, planning_day_key, encrypted_payload, encryption_version, revision, created_at, updated_at)
        VALUES ('entry-2', '2026-09-15', 'payload-2', 1, 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');
      `);
    }).toThrow(/UNIQUE constraint failed/i);
  });
});
