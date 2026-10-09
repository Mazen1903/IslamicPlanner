import { eq, inArray, and, lt, desc } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { streakData, taskDefinitions, taskOccurrences } from '@/data/schema';
import { getDatabase, type AppDatabase } from '@/data/db';
import type { StreakData, TaskDefinition } from '@/domain/task/types';
import { generateUuid } from '@/utils/uuid';
import { RecurrenceEngine } from '@/domain/recurrence/RecurrenceEngine';
import { parseHijriRecurrence } from '@/domain/task/jsonBoundary';

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
   * Works for any recurrence period (daily, weekly, custom intervals).
   * Ignores CANCELLED occurrences so user deletes do not break streaks.
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

    let newStreak: number;
    const lastCompleted = existing.lastCompletedDate;
    if (lastCompleted === null) {
      // No prior completion — first real completion, start at 1
      newStreak = 1;
    } else {
      const lastDt = DateTime.fromISO(lastCompleted, { zone: 'utc' });
      const completedDt = DateTime.fromISO(completedDate, { zone: 'utc' });
      const daysDiff = Math.round(completedDt.diff(lastDt, 'days').days);
      if (daysDiff < 1) {
        // Backfilled completion of an older historical date — does not advance or break the current forward streak
        return existing;
      }

      // Check if this series has recurrence rules
      const defRows = await db
        .select()
        .from(taskDefinitions)
        .where(eq(taskDefinitions.seriesId, seriesId));

      const recurringDef = defRows.find(d => d.recurrenceRule != null || d.hijriRecurrence != null);

      if (recurringDef && recurringDef.recurrenceRule) {
        try {
          const engine = new RecurrenceEngine();
          const cleanRule = recurringDef.recurrenceRule.replace(/^RRULE:/i, '').trim();
          const pseudoDef: TaskDefinition = {
            id: recurringDef.id,
            title: recurringDef.title,
            description: recurringDef.description,
            startDate: recurringDef.startDate,
            source: recurringDef.source as any,
            worshipItemKey: recurringDef.worshipItemKey,
            scheduleType: recurringDef.scheduleType as any,
            scheduleData: {} as any,
            recurrenceRule: cleanRule,
            hijriRecurrence: parseHijriRecurrence(recurringDef.hijriRecurrence),
            recurrenceEnd: recurringDef.recurrenceEnd,
            seriesId: recurringDef.seriesId,
            seriesVersion: recurringDef.seriesVersion,
            effectiveFromDate: recurringDef.effectiveFromDate,
            effectiveToDate: recurringDef.effectiveToDate,
            reminderRule: null,
            priority: recurringDef.priority as any,
            estimatedMinutes: recurringDef.estimatedMinutes,
            notes: recurringDef.notes,
            tags: [],
            subtasks: [],
            isActive: Boolean(recurringDef.isActive),
            createdAt: recurringDef.createdAt,
            updatedAt: recurringDef.updatedAt,
          };

          const intermediateDates = engine
            .generateSeedDates(pseudoDef, {
              start: lastCompleted,
              end: completedDate,
            })
            .filter(d => d > lastCompleted && d < completedDate);

          if (intermediateDates.length === 0) {
            // No scheduled occurrences between them: completedDate is the consecutive scheduled occurrence!
            newStreak = existing.currentStreak + 1;
          } else {
            // Check if all intermediate occurrences were CANCELLED (deleted by user)
            const cancelledRows = await db
              .select({ localDate: taskOccurrences.localDate })
              .from(taskOccurrences)
              .where(
                and(
                  eq(taskOccurrences.seriesId, seriesId),
                  eq(taskOccurrences.status, 'CANCELLED'),
                  inArray(taskOccurrences.localDate, intermediateDates)
                )
              );
            const cancelledDates = new Set(cancelledRows.map(r => r.localDate));
            const uncancelledMissed = intermediateDates.filter(d => !cancelledDates.has(d));

            if (uncancelledMissed.length > 0) {
              // User skipped/missed a scheduled active occurrence -> restart streak
              newStreak = 1;
            } else {
              // Intermediate occurrences were cancelled/deleted, so streak continues!
              newStreak = existing.currentStreak + 1;
            }
          }
        } catch {
          // Fallback if rule evaluation fails
          newStreak = daysDiff <= 1 ? existing.currentStreak + 1 : 1;
        }
      } else {
        // Non-recurring or unit test series without definition in DB: daily consecutive check
        if (daysDiff > 1) {
          newStreak = 1;
        } else {
          newStreak = existing.currentStreak + 1;
        }
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

    let restoredLastCompletedDate: string | null;
    if (newStreak === 0) {
      // No prior days in the streak — truly back to ground zero
      restoredLastCompletedDate = null;
    } else {
      // Look for the actual prior completed occurrence in task_occurrences
      const priorCompleted = await db
        .select({ localDate: taskOccurrences.localDate })
        .from(taskOccurrences)
        .where(
          and(
            eq(taskOccurrences.seriesId, seriesId),
            eq(taskOccurrences.status, 'COMPLETED'),
            lt(taskOccurrences.localDate, completedDate)
          )
        )
        .orderBy(desc(taskOccurrences.localDate))
        .limit(1);

      if (priorCompleted.length > 0) {
        restoredLastCompletedDate = priorCompleted[0].localDate;
      } else {
        // Fallback for series without occurrence records (e.g. unit tests)
        restoredLastCompletedDate = DateTime.fromISO(completedDate, { zone: 'utc' })
          .minus({ days: 1 })
          .toISODate();
      }
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

  /**
   * Deletes streak data for a given series.
   */
  async deleteBySeriesId(seriesId: string, tx?: any): Promise<void> {
    const db = getDb(tx);
    await db.delete(streakData).where(eq(streakData.seriesId, seriesId));
  }
}

export const streakRepository = new StreakRepository();
