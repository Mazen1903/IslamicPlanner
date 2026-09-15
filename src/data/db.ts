import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from '@/data/schema';

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

let databaseInstance: AppDatabase | null = null;
let rawClient: any = null;

export const DB_NAME = 'islamic_planner.db';

/**
 * Initializes and returns the singleton database connection.
 * Enforces PRAGMA foreign_keys = ON.
 */
export function getDatabase(): AppDatabase {
  if (!databaseInstance) {
    const client = SQLite.openDatabaseSync(DB_NAME);
    client.execSync('PRAGMA foreign_keys = ON;');
    rawClient = client;
    databaseInstance = drizzle(client as any, { schema });
  }
  return databaseInstance;
}

/**
 * Injects a custom database instance (e.g. for testing with in-memory SQLite).
 */
export function setDatabase(db: AppDatabase, client?: any): void {
  databaseInstance = db;
  rawClient = client ?? null;
}

let transactionDepth = 0;

/**
 * Resets the current database instance.
 */
export function resetDatabase(): void {
  databaseInstance = null;
  rawClient = null;
  transactionDepth = 0;
}

/**
 * Executes a callback within an atomic database transaction.
 * Supports async operations and nested transactions via SQLite SAVEPOINTS.
 */
export async function runInTransaction<T>(
  fn: (tx: any) => Promise<T>,
  db?: AppDatabase
): Promise<T> {
  const activeDb = db ?? getDatabase();

  if (rawClient && typeof rawClient.execSync === 'function') {
    const isRoot = transactionDepth === 0;
    const savepoint = `sp_${transactionDepth}`;
    transactionDepth++;

    if (isRoot) {
      rawClient.execSync('BEGIN TRANSACTION;');
    } else {
      rawClient.execSync(`SAVEPOINT ${savepoint};`);
    }

    try {
      const result = await fn(activeDb);
      if (isRoot) {
        rawClient.execSync('COMMIT;');
      } else {
        rawClient.execSync(`RELEASE SAVEPOINT ${savepoint};`);
      }
      return result;
    } catch (err) {
      try {
        if (isRoot) {
          rawClient.execSync('ROLLBACK;');
        } else {
          rawClient.execSync(`ROLLBACK TO SAVEPOINT ${savepoint};`);
        }
      } catch {
        // ignore rollback errors if already aborted
      }
      throw err;
    } finally {
      transactionDepth--;
    }
  }

  // Fallback to Drizzle transaction if rawClient is not available
  return (activeDb.transaction(async tx => {
    return await fn(tx);
  }) as unknown) as Promise<T>;
}
