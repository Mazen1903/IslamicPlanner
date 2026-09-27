/**
 * Custom database migrator for drizzle-orm/expo-sqlite.
 *
 * WHY: drizzle-orm@0.45.2 has a bug in its SQLiteSyncDialect.migrate() —
 * it creates the __drizzle_migrations tracking table using `SERIAL PRIMARY KEY`,
 * which is PostgreSQL syntax unsupported by SQLite. This causes the error:
 *   "Failed to run the query 'CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL...'"
 *
 * FIX: We implement our own migration runner that:
 *   1. Creates the tracking table with `INTEGER PRIMARY KEY AUTOINCREMENT` (valid SQLite).
 *   2. Reads migration SQL from the same Drizzle-format bundle (migrations.js).
 *   3. Applies only new migrations (those newer than the last applied timestamp).
 *   4. Records applied migrations idempotently.
 *
 * RUNTIME MODULE — Zero Node APIs.
 */
import type { AppDatabase } from './db';
import migrationsBundle from './migrations/migrations.js';

const MIGRATIONS_TABLE = '__drizzle_migrations';

function parseMigrations(bundle: typeof migrationsBundle) {
  const { journal, migrations } = bundle;
  return journal.entries.map((entry) => {
    const key = `m${String(entry.idx).padStart(4, '0')}`;
    const rawSql: string = (migrations as Record<string, string>)[key];
    if (!rawSql) {
      throw new Error(`[migrator] Missing migration SQL for: ${entry.tag}`);
    }
    const statements = rawSql
      .split('--> statement-breakpoint')
      .map((s: string) => s.trim())
      .filter(Boolean);
    return {
      tag: entry.tag,
      folderMillis: entry.when,
      statements,
    };
  });
}

/**
 * Runs all pending Drizzle migrations against the given database.
 * Safe to call on every app startup — already-applied migrations are skipped.
 */
export async function migrateDatabase(db: AppDatabase): Promise<void> {
  // Access the underlying raw SQLite client
  const client = (db as any).$client;
  if (!client || typeof client.execSync !== 'function') {
    throw new Error('[migrator] Cannot access raw SQLite client from db instance.');
  }

  // 1. Ensure tracking table exists with valid SQLite syntax.
  // If the table was previously created with a broken `SERIAL` schema (drizzle bug),
  // it may exist but be dysfunctional. We detect this and recreate it correctly.
  try {
    client.execSync(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at NUMERIC
      );
    `);
  } catch {
    // Table creation failed — drop any broken version and retry
    client.execSync(`DROP TABLE IF EXISTS ${MIGRATIONS_TABLE};`);
    client.execSync(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at NUMERIC
      );
    `);
  }

  // 2. Find the most recent applied migration timestamp
  let lastAppliedMillis = 0;
  try {
    const rows = client.getAllSync(
      `SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`
    ) as { created_at: number }[];
    if (rows.length > 0 && rows[0].created_at) {
      lastAppliedMillis = Number(rows[0].created_at);
    }
  } catch {
    // Table may be empty or query may fail on very first run — safe to ignore
    lastAppliedMillis = 0;
  }

  // 3. Parse migration bundle
  const migrations = parseMigrations(migrationsBundle);

  // 4. Apply pending migrations in a single transaction
  const pending = migrations.filter(m => m.folderMillis > lastAppliedMillis);
  if (pending.length === 0) {
    return;
  }

  client.execSync('BEGIN;');
  try {
    for (const migration of pending) {
      for (const stmt of migration.statements) {
        if (stmt) {
          client.execSync(stmt);
        }
      }
      client.runSync(
        `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`,
        [migration.tag, migration.folderMillis]
      );
    }
    client.execSync('COMMIT;');
  } catch (err) {
    try {
      client.execSync('ROLLBACK;');
    } catch {
      // Ignore rollback errors
    }
    throw err;
  }
}
