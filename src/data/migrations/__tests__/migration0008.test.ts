import { DatabaseSync } from 'node:sqlite';
import { loadMigrationConfig } from '../../__tests__/migrationConfigLoader.node';

describe('Migration 0008 Compatibility & Dead Code/Table Purge', () => {
  it('verifies journal timestamps are strictly monotonically increasing', () => {
    const config = loadMigrationConfig();
    expect(config.journal.entries.length).toBeGreaterThanOrEqual(9);

    for (let i = 1; i < config.journal.entries.length; i++) {
      const prev = config.journal.entries[i - 1];
      const curr = config.journal.entries[i];
      expect(curr.when).toBeGreaterThan(prev.when);
    }
  });

  it('Migration 0008 applies cleanly, drops dead tables and dead columns, and preserves data', () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    const config = loadMigrationConfig();

    // 1. Apply migrations 0000 through 0007
    for (let i = 0; i <= 7; i++) {
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

    // 2. Insert test data in tables and columns slated for removal
    nodeDb.exec(`
      INSERT INTO worship_item_settings (id, worship_item_key, is_enabled, created_at, updated_at)
      VALUES ('worship-1', 'dhikr_morning', 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');
    `);

    nodeDb.exec(`
      INSERT INTO prayer_cache (fingerprint, date, result_json, cached_at)
      VALUES ('fp-1', '2026-09-17', '{"fajr":"05:00"}', '2026-09-17T00:00:00Z');
    `);

    nodeDb.exec(`
      INSERT INTO notification_schedule (id, type, title, body, scheduled_for, channel_id, created_at)
      VALUES ('notif-1', 'TASK_REMINDER', 'Title', 'Body', '2026-09-17T05:00:00Z', 'reminders', '2026-09-17T00:00:00Z');
    `);

    nodeDb.exec(`
      INSERT INTO user_settings (
        id, location_mode, calculation_method, asr_method,
        flame_engine, worship_suggestions_enabled, hijri_base_method,
        created_at, updated_at
      ) VALUES (
        'default', 'MANUAL', 'MWL', 'SHAFI',
        1, 1, 'UMM_AL_QURA',
        '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'
      );
    `);

    nodeDb.exec(`
      INSERT INTO task_definitions (
        id, title, start_date, schedule_type, schedule_data, series_id, series_version, created_at, updated_at
      ) VALUES (
        'def-audit-1', 'Audit Task', '2026-09-17', 'EXACT_TIME', '{"time":"12:00"}',
        'series-audit-1', 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'
      );
    `);

    nodeDb.exec(`
      INSERT INTO task_occurrences (
        id, task_definition_id, series_id, local_date, planning_day_key, timezone, status
      ) VALUES (
        'occ-audit-1', 'def-audit-1', 'series-audit-1', '2026-09-17', '2026-09-17', 'UTC', 'PENDING'
      );
    `);

    // Verify dead tables exist prior to migration 0008
    const preTables = (
      nodeDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map(t => t.name);
    expect(preTables).toContain('worship_item_settings');
    expect(preTables).toContain('prayer_cache');
    expect(preTables).toContain('notification_schedule');

    // 3. Apply migration 0008
    const entry0008 = config.journal.entries[8];
    expect(entry0008).toBeDefined();
    const key0008 = `m${entry0008.idx.toString().padStart(4, '0')}`;
    const sql0008 = config.migrations[key0008];
    expect(sql0008).toBeDefined();

    const statements0008 = sql0008.split('--> statement-breakpoint');
    for (const statement of statements0008) {
      const trimmed = statement.trim();
      if (trimmed) nodeDb.exec(trimmed);
    }

    // 4. Verify dead tables are DROPPED
    const postTables = (
      nodeDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map(t => t.name);
    expect(postTables).not.toContain('worship_item_settings');
    expect(postTables).not.toContain('prayer_cache');
    expect(postTables).not.toContain('notification_schedule');

    // 5. Verify dead columns are DROPPED from user_settings
    const userColumns = (
      nodeDb.prepare("PRAGMA table_info('user_settings')").all() as { name: string }[]
    ).map(c => c.name);
    expect(userColumns).not.toContain('flame_engine');
    expect(userColumns).not.toContain('worship_suggestions_enabled');
    expect(userColumns).not.toContain('hijri_base_method');
    expect(userColumns).toContain('calculation_method');
    expect(userColumns).toContain('asr_method');

    // 6. Verify existing data preserved
    const userRow = nodeDb.prepare("SELECT * FROM user_settings WHERE id = 'default'").get() as any;
    expect(userRow).toBeDefined();
    expect(userRow.calculation_method).toBe('MWL');
    expect(userRow.asr_method).toBe('SHAFI');

    const taskRow = nodeDb.prepare("SELECT * FROM task_definitions WHERE id = 'def-audit-1'").get() as any;
    expect(taskRow).toBeDefined();
    expect(taskRow.title).toBe('Audit Task');

    const occRow = nodeDb.prepare("SELECT * FROM task_occurrences WHERE id = 'occ-audit-1'").get() as any;
    expect(occRow).toBeDefined();
    expect(occRow.status).toBe('PENDING');

    // 7. Verify streak_data insert works with default constraints
    nodeDb.exec(`
      INSERT INTO streak_data (id, series_id, last_completed_date, created_at, updated_at)
      VALUES ('streak-1', 'series-audit-1', '2026-09-17', '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');
    `);

    const streakRow = nodeDb.prepare("SELECT * FROM streak_data WHERE id = 'streak-1'").get() as any;
    expect(streakRow).toBeDefined();
    expect(streakRow.current_streak).toBe(1);
    expect(streakRow.longest_streak).toBe(1);
  });
});
