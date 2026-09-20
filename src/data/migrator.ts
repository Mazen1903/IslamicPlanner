import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import type { AppDatabase } from './db';
import migrationsBundle from './migrations/migrations.js';

/**
 * Executes migrations on the given database instance using Drizzle's canonical migration mechanism.
 * Safe and idempotent: subsequent runs skip already applied migrations.
 *
 * RUNTIME MODULE — Zero Node APIs (no node:fs, node:path, etc.)
 */
export async function migrateDatabase(db: AppDatabase): Promise<void> {
  await migrate(db, migrationsBundle);
}
