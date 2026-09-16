import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from '../schema';
import { DatabaseSync } from 'node:sqlite';
import { setDatabase, resetDatabase } from '../db';
import { loadMigrationConfig } from '../migrator';

export function createTestDatabase(): {
  db: ExpoSQLiteDatabase<typeof schema>;
  nodeDb: DatabaseSync;
  client: any;
} {
  const nodeDb = new DatabaseSync(':memory:');
  nodeDb.exec('PRAGMA foreign_keys = ON;');

  const config = loadMigrationConfig();
  for (const entry of config.journal.entries) {
    const key = `m${entry.idx.toString().padStart(4, '0')}`;
    const migrationSql = config.migrations[key];
    if (migrationSql) {
      const statements = migrationSql.split('--> statement-breakpoint');
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
          nodeDb.exec(trimmed);
        }
      }
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
          const upper = sql.trim().toUpperCase();
          if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.includes('RETURNING')) {
            try {
              const rows = stmt.all(...params);
              return {
                getAllSync: () => rows,
                getFirstSync: () => rows[0] ?? null,
                changes: 0,
                lastInsertRowId: 0,
              };
            } catch {
              // fallback to run if statement didn't return rows
            }
          }
          const info = stmt.run(...params);
          return {
            getAllSync: () => [],
            getFirstSync: () => null,
            changes: Number(info.changes),
            lastInsertRowId: Number(info.lastInsertRowid),
          };
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
