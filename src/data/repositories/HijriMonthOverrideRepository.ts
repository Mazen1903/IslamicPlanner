import { and, asc, eq } from 'drizzle-orm';
import { getDatabase, type AppDatabase } from '@/data/db';
import { hijriMonthOverrides } from '@/data/schema';
import { generateUuid } from '@/utils/uuid';
import { SUPPORTED_RANGE } from '@/domain/calendar/HijriService';

export type HijriMonthOverrideRow = typeof hijriMonthOverrides.$inferSelect;

function getDb(tx?: any): AppDatabase {
  return tx ?? getDatabase();
}

export class HijriMonthOverrideValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HijriMonthOverrideValidationError';
  }
}

/**
 * Validates Hijri month override inputs:
 * - year: integer within SUPPORTED_RANGE.hijri (1343..1500)
 * - month: integer 1..12
 * - adjustmentDays: integer -2..+2
 */
export function validateMonthOverride(year: number, month: number, adjustmentDays: number): void {
  if (
    typeof year !== 'number' ||
    !Number.isInteger(year) ||
    year < SUPPORTED_RANGE.hijri.min.year ||
    year > SUPPORTED_RANGE.hijri.max.year
  ) {
    throw new HijriMonthOverrideValidationError(
      `Hijri year must be an integer between ${SUPPORTED_RANGE.hijri.min.year} and ${SUPPORTED_RANGE.hijri.max.year}. Received: ${year}`
    );
  }

  if (typeof month !== 'number' || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new HijriMonthOverrideValidationError(
      `Hijri month must be an integer between 1 and 12. Received: ${month}`
    );
  }

  if (
    typeof adjustmentDays !== 'number' ||
    !Number.isInteger(adjustmentDays) ||
    adjustmentDays < -2 ||
    adjustmentDays > 2
  ) {
    throw new HijriMonthOverrideValidationError(
      `Hijri adjustment days must be an integer between -2 and +2. Received: ${adjustmentDays}`
    );
  }
}

export class HijriMonthOverrideRepository {
  /**
   * Retrieves all month overrides, ordered by Hijri year and month ascending.
   */
  async list(tx?: any): Promise<HijriMonthOverrideRow[]> {
    const db = getDb(tx);
    return await db
      .select()
      .from(hijriMonthOverrides)
      .orderBy(asc(hijriMonthOverrides.hijriYear), asc(hijriMonthOverrides.hijriMonth));
  }

  /**
   * Alias for list() for compatibility.
   */
  async findAll(tx?: any): Promise<HijriMonthOverrideRow[]> {
    return this.list(tx);
  }

  /**
   * Finds a month override for a specific Hijri year and month.
   */
  async find(year: number, month: number, tx?: any): Promise<HijriMonthOverrideRow | null> {
    const db = getDb(tx);
    const rows = await db
      .select()
      .from(hijriMonthOverrides)
      .where(
        and(
          eq(hijriMonthOverrides.hijriYear, year),
          eq(hijriMonthOverrides.hijriMonth, month)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Alias for find() for compatibility.
   */
  async findByYearAndMonth(year: number, month: number, tx?: any): Promise<HijriMonthOverrideRow | null> {
    return this.find(year, month, tx);
  }

  /**
   * Inserts or updates a month override.
   * Validates year, month, and adjustmentDays.
   */
  async upsert(
    year: number,
    month: number,
    adjustmentDays: number,
    tx?: any
  ): Promise<HijriMonthOverrideRow> {
    validateMonthOverride(year, month, adjustmentDays);
    const db = getDb(tx);
    const now = new Date().toISOString();

    const existing = await this.find(year, month, tx);

    if (existing) {
      await db
        .update(hijriMonthOverrides)
        .set({
          adjustmentDays,
          updatedAt: now,
        })
        .where(eq(hijriMonthOverrides.id, existing.id));
    } else {
      const id = generateUuid();
      await db.insert(hijriMonthOverrides).values({
        id,
        hijriYear: year,
        hijriMonth: month,
        adjustmentDays,
        createdAt: now,
        updatedAt: now,
      });
    }

    const updated = await this.find(year, month, tx);
    if (!updated) {
      throw new Error(`Failed to retrieve month override after upsert for ${year}-${month}`);
    }
    return updated;
  }

  /**
   * Deletes a month override for a specific Hijri year and month.
   * Returns true if a row was deleted, false if no row existed.
   */
  async delete(year: number, month: number, tx?: any): Promise<boolean> {
    const db = getDb(tx);
    const existing = await this.find(year, month, tx);
    if (!existing) {
      return false;
    }

    await db
      .delete(hijriMonthOverrides)
      .where(eq(hijriMonthOverrides.id, existing.id));

    return true;
  }
}

export const hijriMonthOverrideRepository = new HijriMonthOverrideRepository();
