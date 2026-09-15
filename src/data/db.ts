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

/**
 * Symbol used to tag active transaction context on db/tx objects.
 */
export const TRANSACTION_CONTEXT = Symbol('TRANSACTION_CONTEXT');

export interface TransactionContext {
  id: number;
  savepointCount: number;
}

/**
 * Sequential transaction queue / mutex for root transactions on the SQLite connection.
 * Ensures root transactions are strictly serialized and cannot interleave.
 */
class TransactionLock {
  private queue: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release!: () => void;
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentQueue = this.queue;
    this.queue = this.queue.then(() => nextLock);
    await currentQueue;
    return release;
  }

  reset(): void {
    this.queue = Promise.resolve();
  }
}

const rootLock = new TransactionLock();
let txCounter = 0;

/**
 * Resets the current database instance and any pending transaction lock.
 */
export function resetDatabase(): void {
  databaseInstance = null;
  rawClient = null;
  rootLock.reset();
}

/**
 * Executes a callback within an atomic database transaction.
 *
 * Concurrency & Invariants:
 * - Root transactions on the single SQLite connection are strictly serialized.
 * - Two concurrent root transactions will execute sequentially; the second waits for the first to complete.
 * - Explicit nesting: Callers pass the explicit `tx` object. Nested calls create scoped SAVEPOINTS belonging
 *   to that specific transaction context, avoiding global counter hazards.
 * - Implicit nesting is avoided: an unrelated async operation calling runInTransaction without `tx` is treated
 *   as an independent root transaction and will safely wait for connection availability.
 */
export async function runInTransaction<T>(
  fn: (tx: any) => Promise<T>,
  dbOrTx?: any
): Promise<T> {
  const existingContext: TransactionContext | undefined = dbOrTx?.[TRANSACTION_CONTEXT];

  // 1. Explicit nested transaction context via SAVEPOINT
  if (existingContext) {
    const spId = ++existingContext.savepointCount;
    const savepoint = `sp_${existingContext.id}_${spId}`;

    if (rawClient && typeof rawClient.execSync === 'function') {
      rawClient.execSync(`SAVEPOINT ${savepoint};`);
    }

    try {
      const result = await fn(dbOrTx);
      if (rawClient && typeof rawClient.execSync === 'function') {
        rawClient.execSync(`RELEASE SAVEPOINT ${savepoint};`);
      }
      return result;
    } catch (err) {
      if (rawClient && typeof rawClient.execSync === 'function') {
        try {
          rawClient.execSync(`ROLLBACK TO SAVEPOINT ${savepoint};`);
        } catch {
          // ignore rollback errors if already aborted
        }
      }
      throw err;
    }
  }

  // 2. Root transaction: strictly serialized via rootLock
  const release = await rootLock.acquire();
  const activeDb = dbOrTx ?? getDatabase();

  const context: TransactionContext = {
    id: ++txCounter,
    savepointCount: 0,
  };

  const tx = Object.assign(Object.create(activeDb), {
    [TRANSACTION_CONTEXT]: context,
    $client: rawClient,
  });

  try {
    if (rawClient && typeof rawClient.execSync === 'function') {
      rawClient.execSync('BEGIN TRANSACTION;');
    }

    try {
      const result = await fn(tx);
      if (rawClient && typeof rawClient.execSync === 'function') {
        rawClient.execSync('COMMIT;');
      }
      return result;
    } catch (err) {
      if (rawClient && typeof rawClient.execSync === 'function') {
        try {
          rawClient.execSync('ROLLBACK;');
        } catch {
          // ignore rollback errors
        }
      }
      throw err;
    }
  } finally {
    release();
  }
}
