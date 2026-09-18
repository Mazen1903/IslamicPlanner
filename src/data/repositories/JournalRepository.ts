import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { journalEntries } from '@/data/schema';
import { getDatabase, runInTransaction, type AppDatabase } from '@/data/db';
import type {
  JournalEntryRow,
  JournalEntryMetadata,
  JournalListOptions,
} from '@/domain/journal/types';
import { StaleWriteError, JournalError } from '@/domain/journal/errors';
import { generateUuid } from '@/utils/uuid';
import { isValidCivilDate } from '@/utils/dateValidation';

export interface JournalRepoSaveInput {
  planningDayKey: string;
  encryptedPayload: string;
  encryptionVersion?: number;
  revision?: number;
}

export class JournalRepository {
  private getDb(tx?: any): AppDatabase {
    return tx ?? getDatabase();
  }

  /**
   * Finds a journal entry row by its canonical planningDayKey.
   */
  async findByPlanningDayKey(
    planningDayKey: string,
    tx?: any
  ): Promise<JournalEntryRow | null> {
    const db = this.getDb(tx);
    const rows = db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.planningDayKey, planningDayKey))
      .limit(1)
      .all();

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      planningDayKey: row.planningDayKey,
      encryptedPayload: row.encryptedPayload,
      encryptionVersion: row.encryptionVersion,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Finds a journal entry row by its unique UUID.
   */
  async findById(id: string, tx?: any): Promise<JournalEntryRow | null> {
    const db = this.getDb(tx);
    const rows = db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id))
      .limit(1)
      .all();

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      planningDayKey: row.planningDayKey,
      encryptedPayload: row.encryptedPayload,
      encryptionVersion: row.encryptionVersion,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Creates or updates a journal entry atomically with stale-write protection.
   * - If no row exists: inserts with revision = 1
   * - If row exists and input.revision === existing.revision: updates with revision = existing.revision + 1
   * - If row exists and input.revision !== existing.revision: throws StaleWriteError
   */
  async save(input: JournalRepoSaveInput, tx?: any): Promise<JournalEntryRow> {
    if (!isValidCivilDate(input.planningDayKey)) {
      throw new JournalError(
        `Invalid planningDayKey: ${input.planningDayKey}. Expected YYYY-MM-DD civil date.`
      );
    }

    return runInTransaction(async (activeTx) => {
      const existingRows = activeTx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.planningDayKey, input.planningDayKey))
        .limit(1)
        .all();

      const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
      const nowUtc = new Date().toISOString();

      if (!existing) {
        // If caller passed a revision > 1 for a nonexistent row, reject as stale write
        if (input.revision !== undefined && input.revision !== 1) {
          throw new StaleWriteError(
            `Cannot update nonexistent journal entry for planningDayKey "${input.planningDayKey}" with revision ${input.revision}`
          );
        }

        const newRow: JournalEntryRow = {
          id: generateUuid(),
          planningDayKey: input.planningDayKey,
          encryptedPayload: input.encryptedPayload,
          encryptionVersion: input.encryptionVersion ?? 1,
          revision: 1,
          createdAt: nowUtc,
          updatedAt: nowUtc,
        };

        activeTx.insert(journalEntries).values(newRow).run();
        return newRow;
      }

      // Existing row found: verify revision matches for optimistic locking
      if (input.revision !== existing.revision) {
        throw new StaleWriteError(
          `Revision mismatch for journal entry "${existing.id}": provided ${input.revision}, current ${existing.revision}`
        );
      }

      const nextRevision = existing.revision + 1;
      const updatedRow: JournalEntryRow = {
        id: existing.id,
        planningDayKey: existing.planningDayKey,
        encryptedPayload: input.encryptedPayload,
        encryptionVersion: input.encryptionVersion ?? existing.encryptionVersion,
        revision: nextRevision,
        createdAt: existing.createdAt,
        updatedAt: nowUtc,
      };

      activeTx
        .update(journalEntries)
        .set({
          encryptedPayload: updatedRow.encryptedPayload,
          encryptionVersion: updatedRow.encryptionVersion,
          revision: updatedRow.revision,
          updatedAt: updatedRow.updatedAt,
        })
        .where(eq(journalEntries.id, existing.id))
        .run();

      return updatedRow;
    }, tx);
  }

  /**
   * Deletes a journal entry row by its UUID.
   * Returns true if a row was deleted, false if not found.
   */
  async delete(id: string, tx?: any): Promise<boolean> {
    return runInTransaction(async (activeTx) => {
      const existing = activeTx
        .select({ id: journalEntries.id })
        .from(journalEntries)
        .where(eq(journalEntries.id, id))
        .limit(1)
        .all();

      if (!existing || existing.length === 0) {
        return false;
      }

      activeTx.delete(journalEntries).where(eq(journalEntries.id, id)).run();
      return true;
    }, tx);
  }

  /**
   * Returns journal metadata newest-first by updatedAt for history listing.
   * Never decrypts or exposes entry payload.
   */
  async listHistory(
    options?: JournalListOptions,
    tx?: any
  ): Promise<JournalEntryMetadata[]> {
    const db = this.getDb(tx);
    let query = db
      .select({
        id: journalEntries.id,
        planningDayKey: journalEntries.planningDayKey,
        revision: journalEntries.revision,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
      })
      .from(journalEntries)
      .orderBy(desc(journalEntries.updatedAt));

    if (options?.limit !== undefined) {
      query = query.limit(options.limit) as any;
    }
    if (options?.offset !== undefined) {
      query = query.offset(options.offset) as any;
    }

    const rows = query.all();
    return rows.map((r) => ({
      id: r.id,
      planningDayKey: r.planningDayKey,
      revision: r.revision,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Finds journal metadata within a date range [startKey, endKey] inclusive.
   */
  async findByDateRange(
    startKey: string,
    endKey: string,
    tx?: any
  ): Promise<JournalEntryMetadata[]> {
    const db = this.getDb(tx);
    const rows = db
      .select({
        id: journalEntries.id,
        planningDayKey: journalEntries.planningDayKey,
        revision: journalEntries.revision,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
      })
      .from(journalEntries)
      .where(
        and(
          gte(journalEntries.planningDayKey, startKey),
          lte(journalEntries.planningDayKey, endKey)
        )
      )
      .orderBy(asc(journalEntries.planningDayKey))
      .all();

    return rows.map((r) => ({
      id: r.id,
      planningDayKey: r.planningDayKey,
      revision: r.revision,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }
}

export const journalRepository = new JournalRepository();
