import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '../schema';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setDatabase, resetDatabase } from '../db';

export function createTestDatabase(): {
  db: ExpoSQLiteDatabase<typeof schema>;
  nodeDb: DatabaseSync;
  client: any;
} {
  const nodeDb = new DatabaseSync(':memory:');
  nodeDb.exec('PRAGMA foreign_keys = ON;');

  const migrationPath = path.join(__dirname, '../migrations/0001_initial.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const statements = migrationSql.split('--> statement-breakpoint');
  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed) {
      nodeDb.exec(trimmed);
    }
  }

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
            const rawRows = rows.map(r => Object.values(r as object));
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
  // Set as global test db instance
  setDatabase(db, client);

  return { db, nodeDb, client };
}

export function cleanupTestDatabase(): void {
  resetDatabase();
}
