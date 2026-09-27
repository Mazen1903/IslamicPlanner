import { DateTime } from 'luxon';
import type { JournalEntryMetadata } from '@/domain/journal/types';

/**
 * Computes the current active journaling streak ending at today (or yesterday if today has no entry yet).
 *
 * Rules:
 * - If today has an entry, streak counts backwards consecutively from today.
 * - If today does NOT have an entry, streak counts backwards consecutively from yesterday
 *   (preserving the habit momentum before the day ends).
 * - If neither today nor yesterday has an entry, streak is 0.
 */
export function computeCurrentStreak(
  entries: JournalEntryMetadata[],
  todayKey: string
): number {
  if (!entries || entries.length === 0 || !todayKey) {
    return 0;
  }

  const dateSet = new Set(entries.map(e => e.planningDayKey));

  let startKey: string | null = null;
  if (dateSet.has(todayKey)) {
    startKey = todayKey;
  } else {
    // Check yesterday
    const yesterday = DateTime.fromISO(todayKey).minus({ days: 1 }).toISODate();
    if (yesterday && dateSet.has(yesterday)) {
      startKey = yesterday;
    }
  }

  if (!startKey) {
    return 0;
  }

  let streak = 0;
  let current = DateTime.fromISO(startKey);

  while (current.isValid) {
    const key = current.toISODate();
    if (key && dateSet.has(key)) {
      streak += 1;
      current = current.minus({ days: 1 });
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Computes the longest consecutive journaling streak across all recorded entries.
 */
export function computeLongestStreak(entries: JournalEntryMetadata[]): number {
  if (!entries || entries.length === 0) {
    return 0;
  }

  const uniqueSortedDates = Array.from(
    new Set(entries.map(e => e.planningDayKey))
  ).sort();

  if (uniqueSortedDates.length === 0) {
    return 0;
  }

  let longest = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueSortedDates.length; i++) {
    const prev = DateTime.fromISO(uniqueSortedDates[i - 1]);
    const curr = DateTime.fromISO(uniqueSortedDates[i]);

    if (curr.diff(prev, 'days').days === 1) {
      currentRun += 1;
      if (currentRun > longest) {
        longest = currentRun;
      }
    } else {
      currentRun = 1;
    }
  }

  return longest;
}
