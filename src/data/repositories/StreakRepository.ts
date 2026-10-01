import { eq, inArray } from 'drizzle-orm';
import { streakData } from '@/data/schema';
import { getDatabase, type AppDatabase } from '@/data/db';
import type { StreakData } from '@/domain/task/types';
import { generateUuid } from '@/utils/uuid';

function getDb(tx?: any): AppDatabase {
  return tx ?? getDatabase();
}

function mapRowToStreakData(row: typeof streakData.$inferSelect): StreakData {
  return {
    id: row.id,
    seriesId: row.seriesId,
    streakEnabled: Boolean(row.streakEnabled),
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    lastCompletedDate: row.lastCompletedDate ?? null,
    lastResetDate: row.lastResetDate ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class StreakRepository {
  /**
   * Enables streak tracking for a series.
   * If a record already exists, enables it. Otherwise, creates a new one.
   */
  async enableStreak(seriesId: string, tx?: any): Promise<StreakData> {
    const db = getDb(tx);
    const existing = await this.findBySeriesId(seriesId, tx);
    const now = new Date().toISOString();

    if (existing) {
      if (!existing.streakEnabled) {
        const nextStreak = Math.max(1, existing.currentStreak);
        const nextLongest = Math.max(nextStreak, existing.longestStreak);
        await db
          .update(streakData)
          .set({
            streakEnabled: true,
            currentStreak: nextStreak,
            longestStreak: nextLongest,
            updatedAt: now,
          })
          .where(eq(streakData.seriesId, seriesId));
        return {
          ...existing,
          streakEnabled: true,
          currentStreak: nextStreak,
          longestStreak: nextLongest,
          updatedAt: now,
        };
      }
      return existing;
    }

    const newId = generateUuid();
    await db.insert(streakData).values({
      id: newId,
      seriesId,
      streakEnabled: true,
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: null,
      lastResetDate: null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: newId,
      seriesId,
      streakEnabled: true,
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: null,
      lastResetDate: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Disables streak tracking for a series without deleting historical data.
   */
  async disableStreak(seriesId: string, tx?: any): Promise<void> {
    const db = getDb(tx);
    const now = new Date().toISOString();
    await db
      .update(streakData)
      .set({
        streakEnabled: false,
        updatedAt: now,
      })
      .where(eq(streakData.seriesId, seriesId));
  }

  /**
   * Finds streak data by series ID.
   */
  async findBySeriesId(seriesId: string, tx?: any): Promise<StreakData | null> {
    const db = getDb(tx);
    const rows = await db
      .select()
      .from(streakData)
      .where(eq(streakData.seriesId, seriesId))
      .limit(1);

    if (rows.length === 0) return null;
    return mapRowToStreakData(rows[0]);
  }

  /**
   * Batch finds streak data for multiple series IDs to avoid N+1 queries.
   */
  async findBySeriesIds(seriesIds: string[], tx?: any): Promise<Map<string, StreakData>> {
    const result = new Map<string, StreakData>();
    if (!seriesIds || seriesIds.length === 0) return result;

    const uniqueIds = Array.from(new Set(seriesIds.filter(Boolean)));
    if (uniqueIds.length === 0) return result;

    const db = getDb(tx);
    const rows = await db
      .select()
      .from(streakData)
      .where(inArray(streakData.seriesId, uniqueIds));

    for (const row of rows) {
      result.set(row.seriesId, mapRowToStreakData(row));
    }

    return result;
  }

  /**
   * Increments current streak by 1 and updates longest streak if applicable.
   * If already completed on the same civil date, acts idempotently without double-incrementing.
   */
  async incrementStreak(
    seriesId: string,
    completedDate: string,
    tx?: any
  ): Promise<StreakData | null> {
    const existing = await this.findBySeriesId(seriesId, tx);
    if (!existing || !existing.streakEnabled) return existing;

    // Idempotency check: already completed today
    if (existing.lastCompletedDate === completedDate) {
      return existing;
    }

    const db = getDb(tx);
    const now = new Date().toISOString();
    // If brand new (never completed before) and starting at 1, completing today solidifies Day 1.
    // Subsequent days increment: 1 -> 2 -> 3...
    const newStreak =
      existing.lastCompletedDate === null && existing.currentStreak >= 1
        ? existing.currentStreak
        : existing.currentStreak + 1;
    const newLongest = Math.max(newStreak, existing.longestStreak);

    await db
      .update(streakData)
      .set({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCompletedDate: completedDate,
        updatedAt: now,
      })
      .where(eq(streakData.seriesId, seriesId));

    return {
      ...existing,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastCompletedDate: completedDate,
      updatedAt: now,
    };
  }

  /**
   * Reverts completion when a task is undone.
   * Decrements currentStreak if it was incremented on completedDate.
   */
  async revertCompletion(
    seriesId: string,
    completedDate: string,
    tx?: any
  ): Promise<StreakData | null> {
    const existing = await this.findBySeriesId(seriesId, tx);
    if (!existing || !existing.streakEnabled) return existing;

    // Only revert if lastCompletedDate matches the date being undone
    if (existing.lastCompletedDate !== completedDate) {
      return existing;
    }

    const db = getDb(tx);
    const now = new Date().toISOString();
    const newStreak = Math.max(1, existing.currentStreak - 1);

    await db
      .update(streakData)
      .set({
        currentStreak: newStreak,
        lastCompletedDate: null,
        updatedAt: now,
      })
      .where(eq(streakData.seriesId, seriesId));

    return {
      ...existing,
      currentStreak: newStreak,
      lastCompletedDate: null,
      updatedAt: now,
    };
  }

  /**
   * Resets current streak to 0 upon missed occurrence.
   * Longest streak is preserved.
   */
  async resetStreak(
    seriesId: string,
    resetDate: string,
    tx?: any
  ): Promise<StreakData | null> {
    const existing = await this.findBySeriesId(seriesId, tx);
    if (!existing || !existing.streakEnabled) return existing;

    // If current streak is already 0, just update lastResetDate if needed
    if (existing.currentStreak === 0 && existing.lastResetDate === resetDate) {
      return existing;
    }

    const db = getDb(tx);
    const now = new Date().toISOString();

    await db
      .update(streakData)
      .set({
        currentStreak: 0,
        lastResetDate: resetDate,
        updatedAt: now,
      })
      .where(eq(streakData.seriesId, seriesId));

    return {
      ...existing,
      currentStreak: 0,
      lastResetDate: resetDate,
      updatedAt: now,
    };
  }

  /**
   * Checks whether streak tracking is active for a series.
   */
  async isStreakEnabled(seriesId: string, tx?: any): Promise<boolean> {
    const data = await this.findBySeriesId(seriesId, tx);
    return Boolean(data?.streakEnabled);
  }
}
