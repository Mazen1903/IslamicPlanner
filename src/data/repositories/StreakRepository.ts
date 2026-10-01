import { eq, inArray } from 'drizzle-orm';
import { DateTime } from 'luxon';
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
        // Re-enabling: preserve historical counts but do NOT inflate — keep as-is
        await db
          .update(streakData)
          .set({
            streakEnabled: true,
            updatedAt: now,
          })
          .where(eq(streakData.seriesId, seriesId));
        return {
          ...existing,
          streakEnabled: true,
          updatedAt: now,
        };
      }
      return existing;
    }

    const newId = generateUuid();
    // BUG-FIX: seed at 0 so the first real completion correctly increments to 1
    await db.insert(streakData).values({
      id: newId,
      seriesId,
      streakEnabled: true,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      lastResetDate: null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: newId,
      seriesId,
      streakEnabled: true,
      currentStreak: 0,
      longestStreak: 0,
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

    // BUG-FIX: Consecutive-day continuity check.
    // If the gap between lastCompletedDate and today is > 1 day the streak is
    // broken regardless of whether the lifecycle sweep fired. Reset to 1.
    let newStreak: number;
    if (existing.lastCompletedDate === null) {
      // No prior completion — first real completion, start at 1
      newStreak = 1;
    } else {
      const lastDt = DateTime.fromISO(existing.lastCompletedDate, { zone: 'utc' });
      const completedDt = DateTime.fromISO(completedDate, { zone: 'utc' });
      const daysDiff = Math.round(completedDt.diff(lastDt, 'days').days);
      if (daysDiff < 1) {
        // Backfilled completion of an older historical date — does not advance or break the current forward streak
        return existing;
      } else if (daysDiff > 1) {
        // Gap detected (> 1 day) — streak broken, restart
        newStreak = 1;
      } else {
        // Exactly consecutive day (1 day diff)
        newStreak = existing.currentStreak + 1;
      }
    }

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
    // BUG-FIX: decrement to 0 floor (not 1), so the badge correctly shows 0
    const newStreak = Math.max(0, existing.currentStreak - 1);

    // BUG-FIX: Restore lastCompletedDate to the day before instead of nulling it.
    // Nulling caused the next re-completion to hit the "first completion" branch
    // and freeze the streak at 1. Setting it to completedDate-1 restores continuity.
    let restoredLastCompletedDate: string | null;
    if (newStreak === 0) {
      // No prior days in the streak — truly back to ground zero
      restoredLastCompletedDate = null;
    } else {
      // Point lastCompletedDate back to the day before the reverted date
      restoredLastCompletedDate = DateTime.fromISO(completedDate, { zone: 'utc' })
        .minus({ days: 1 })
        .toISODate();
    }

    await db
      .update(streakData)
      .set({
        currentStreak: newStreak,
        lastCompletedDate: restoredLastCompletedDate,
        updatedAt: now,
      })
      .where(eq(streakData.seriesId, seriesId));

    return {
      ...existing,
      currentStreak: newStreak,
      lastCompletedDate: restoredLastCompletedDate,
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
