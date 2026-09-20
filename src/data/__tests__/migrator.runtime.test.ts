import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '../schema';
import { migrateDatabase } from '../migrator';

describe('Runtime Migrator Isolation (MB-01, MB-02)', () => {
  it('MB-01: src/data/migrator.ts contains zero node:* imports and does not import Node migration loader', () => {
    const migratorPath = path.join(__dirname, '..', 'migrator.ts');
    expect(fs.existsSync(migratorPath)).toBe(true);

    const content = fs.readFileSync(migratorPath, 'utf8');

    // Invariant: Zero node:* imports
    expect(content).not.toMatch(/from\s+['"]node:/);
    expect(content).not.toMatch(/require\s*\(\s*['"]node:/);

    // Invariant: No Node-only migration loader import
    expect(content).not.toContain('migrationConfigLoader');

    // Invariant: No fs / path imports
    expect(content).not.toMatch(/from\s+['"]fs['"]/);
    expect(content).not.toMatch(/from\s+['"]path['"]/);
    expect(content).not.toMatch(/from\s+['"]sqlite['"]/);
  });

  it('MB-02: migrateDatabase() uses static migration bundle without calling loadMigrationConfig', async () => {
    const nodeDb = new DatabaseSync(':memory:');
    nodeDb.exec('PRAGMA foreign_keys = ON;');

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

    // Migrate database using runtime function
    await migrateDatabase(db);

    // Verify __drizzle_migrations table was created and populated
    const migrations = nodeDb.prepare('SELECT id, hash, created_at FROM __drizzle_migrations').all();
    expect(migrations.length).toBeGreaterThanOrEqual(4);
  });
});
