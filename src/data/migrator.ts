import * as fs from 'node:fs';
import * as path from 'node:path';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import type { AppDatabase } from './db';
import journalData from './migrations/meta/_journal.json';

export interface MigrationJournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

export interface MigrationJournal {
  version: string;
  dialect: string;
  entries: MigrationJournalEntry[];
}

export interface MigrationConfig {
  journal: MigrationJournal;
  migrations: Record<string, string>;
}

/**
 * Discovers and loads migrations according to the Drizzle journal.
 * Reads meta/_journal.json, iterates over each entry, and loads the corresponding SQL file (<tag>.sql).
 */
export function loadMigrationConfig(): MigrationConfig {
  const journal = journalData as unknown as MigrationJournal;
  const migrations: Record<string, string> = {};

  for (const entry of journal.entries) {
    const key = `m${entry.idx.toString().padStart(4, '0')}`;
    const sqlPath = path.join(__dirname, 'migrations', `${entry.tag}.sql`);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration SQL file not found for journal entry tag "${entry.tag}": ${sqlPath}`);
    }
    migrations[key] = fs.readFileSync(sqlPath, 'utf8');
  }

  return {
    journal,
    migrations,
  };
}

/**
 * Executes migrations on the given database instance using Drizzle's canonical migration mechanism.
 * Safe and idempotent: subsequent runs skip already applied migrations.
 */
export async function migrateDatabase(db: AppDatabase): Promise<void> {
  const config = loadMigrationConfig();
  await migrate(db, config);
}
