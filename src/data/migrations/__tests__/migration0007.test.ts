import { DatabaseSync } from 'node:sqlite';
import { loadMigrationConfig } from '../../__tests__/migrationConfigLoader.node';

describe('Migration 0007 Compatibility', () => {
  it('Migration 0007 applies cleanly, adds quiet hours columns, and negates positive reminder offsets', () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

    const config = loadMigrationConfig();

    // 1. Apply migrations 0000 through 0006
    for (let i = 0; i <= 6; i++) {
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

    // 2. Insert sample baseline data
    nodeDb.exec(`
      INSERT INTO user_settings (id, location_mode, calculation_method, asr_method, created_at, updated_at)
      VALUES ('default', 'MANUAL', 'MWL', 'SHAFI', '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z');
    `);

    // Insert task with positive reminder offset (+10 min before in old UI)
    nodeDb.exec(`
      INSERT INTO task_definitions (
        id, title, start_date, schedule_type, schedule_data, reminder_rule, series_id, series_version, created_at, updated_at
      ) VALUES (
        'def-rem-1', 'Read Quran', '2026-09-17', 'EXACT_TIME', '{"time":"14:30"}',
        '{"offsetMinutes":10}', 'series-1', 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'
      );
    `);

    // Insert task with 0 offset (at time of task)
    nodeDb.exec(`
      INSERT INTO task_definitions (
        id, title, start_date, schedule_type, schedule_data, reminder_rule, series_id, series_version, created_at, updated_at
      ) VALUES (
        'def-rem-2', 'Dhuhr Prayer', '2026-09-17', 'EXACT_TIME', '{"time":"13:00"}',
        '{"offsetMinutes":0}', 'series-2', 1, '2026-09-17T00:00:00Z', '2026-09-17T00:00:00Z'
      );
    `);

    // 3. Apply migration 0007
    const entry0007 = config.journal.entries[7];
    expect(entry0007).toBeDefined();
    const key0007 = `m${entry0007.idx.toString().padStart(4, '0')}`;
    const sql0007 = config.migrations[key0007];
    expect(sql0007).toBeDefined();

    const statements0007 = sql0007.split('--> statement-breakpoint');
    for (const statement of statements0007) {
      const trimmed = statement.trim();
      if (trimmed) nodeDb.exec(trimmed);
    }

    // 4. Verify user_settings has new columns with defaults
    const userRow = nodeDb.prepare("SELECT * FROM user_settings WHERE id = 'default'").get() as any;
    expect(userRow).toBeDefined();
    expect(userRow.quiet_hours_start).toBe('22:00');
    expect(userRow.quiet_hours_end).toBe('06:00');
    expect(userRow.default_reminder_minutes).toBeNull();

    // 5. Verify task with positive offset was negated
    const taskRow1 = nodeDb.prepare("SELECT * FROM task_definitions WHERE id = 'def-rem-1'").get() as any;
    expect(taskRow1).toBeDefined();
    const rule1 = JSON.parse(taskRow1.reminder_rule);
    expect(rule1.offsetMinutes).toBe(-10);
    expect(rule1.offsetsMinutes).toEqual([-10]);

    // 6. Verify task with 0 offset remained 0
    const taskRow2 = nodeDb.prepare("SELECT * FROM task_definitions WHERE id = 'def-rem-2'").get() as any;
    expect(taskRow2).toBeDefined();
    const rule2 = JSON.parse(taskRow2.reminder_rule);
    expect(rule2.offsetMinutes).toBe(0);
  });
});
