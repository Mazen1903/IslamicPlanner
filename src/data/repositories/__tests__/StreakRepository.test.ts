import { StreakRepository } from '../StreakRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';

describe('StreakRepository', () => {
  let repo: StreakRepository;

  beforeEach(() => {
    createTestDatabase();
    repo = new StreakRepository();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('returns null on empty table or unknown seriesId', async () => {
    const streak = await repo.findBySeriesId('non-existent');
    expect(streak).toBeNull();
  });

  it('enableStreak creates a new streak tracking record seeded at 0', async () => {
    const streak = await repo.enableStreak('series-1');
    expect(streak).toBeDefined();
    expect(streak.seriesId).toBe('series-1');
    expect(streak.streakEnabled).toBe(true);
    // BUG-FIX: seed is 0 — badge must not show until first real completion
    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(0);
    expect(streak.lastCompletedDate).toBeNull();
    expect(streak.lastResetDate).toBeNull();

    const fetched = await repo.findBySeriesId('series-1');
    expect(fetched).toEqual(streak);
  });

  it('disableStreak disables tracking without losing count history', async () => {
    await repo.enableStreak('series-1');
    await repo.incrementStreak('series-1', '2026-10-01');
    await repo.disableStreak('series-1');

    const fetched = await repo.findBySeriesId('series-1');
    expect(fetched).toBeDefined();
    expect(fetched?.streakEnabled).toBe(false);
    expect(fetched?.currentStreak).toBe(1);

    // Re-enabling preserves history exactly as-is (no artificial inflation)
    const reEnabled = await repo.enableStreak('series-1');
    expect(reEnabled.streakEnabled).toBe(true);
    expect(reEnabled.currentStreak).toBe(1);
    expect(reEnabled.longestStreak).toBe(1);
  });

  it('incrementStreak increments current and longest streak correctly', async () => {
    await repo.enableStreak('series-1');

    // First real completion: 0 → 1
    const day1 = await repo.incrementStreak('series-1', '2026-10-01');
    expect(day1?.currentStreak).toBe(1);
    expect(day1?.longestStreak).toBe(1);
    expect(day1?.lastCompletedDate).toBe('2026-10-01');

    // Consecutive day: 1 → 2
    const day2 = await repo.incrementStreak('series-1', '2026-10-02');
    expect(day2?.currentStreak).toBe(2);
    expect(day2?.longestStreak).toBe(2);
    expect(day2?.lastCompletedDate).toBe('2026-10-02');

    // Idempotent: same date does not double-count
    const day2Repeat = await repo.incrementStreak('series-1', '2026-10-02');
    expect(day2Repeat?.currentStreak).toBe(2);
    expect(day2Repeat?.longestStreak).toBe(2);
  });

  it('incrementStreak resets to 1 when a day gap is detected (consecutive-day guard)', async () => {
    await repo.enableStreak('series-gap');
    await repo.incrementStreak('series-gap', '2026-10-01'); // streak = 1

    // Skip Day 2 — complete Day 3 with a gap
    const day3 = await repo.incrementStreak('series-gap', '2026-10-03');
    // Gap > 1 day → streak must restart at 1, not inflate to 2
    expect(day3?.currentStreak).toBe(1);
    expect(day3?.longestStreak).toBe(1);
    expect(day3?.lastCompletedDate).toBe('2026-10-03');
  });

  it('incrementStreak ignores backfilled completions of older dates without corrupting head', async () => {
    await repo.enableStreak('series-backfill');
    await repo.incrementStreak('series-backfill', '2026-10-01');
    await repo.incrementStreak('series-backfill', '2026-10-02'); // streak = 2, head = 2026-10-02

    // Complete older date (2026-09-30) after 2026-10-02 was already completed
    const backfilled = await repo.incrementStreak('series-backfill', '2026-09-30');
    // Must return existing without rewinding lastCompletedDate or incrementing streak
    expect(backfilled?.currentStreak).toBe(2);
    expect(backfilled?.lastCompletedDate).toBe('2026-10-02');

    // Subsequent day 2026-10-03 continues cleanly (diff = 1)
    const day3 = await repo.incrementStreak('series-backfill', '2026-10-03');
    expect(day3?.currentStreak).toBe(3);
    expect(day3?.lastCompletedDate).toBe('2026-10-03');
  });

  it('resetStreak sets currentStreak to 0 while preserving longestStreak', async () => {
    await repo.enableStreak('series-1');
    await repo.incrementStreak('series-1', '2026-10-01');
    await repo.incrementStreak('series-1', '2026-10-02');
    await repo.incrementStreak('series-1', '2026-10-03');

    const streakBefore = await repo.findBySeriesId('series-1');
    expect(streakBefore?.currentStreak).toBe(3);
    expect(streakBefore?.longestStreak).toBe(3);

    const reset = await repo.resetStreak('series-1', '2026-10-04');
    expect(reset?.currentStreak).toBe(0);
    expect(reset?.longestStreak).toBe(3);
    expect(reset?.lastResetDate).toBe('2026-10-04');

    // New streak after reset — first real completion restarts at 1
    const newDay = await repo.incrementStreak('series-1', '2026-10-05');
    expect(newDay?.currentStreak).toBe(1);
    expect(newDay?.longestStreak).toBe(3); // Longest preserved
  });

  it('revertCompletion decrements and restores lastCompletedDate to previous day', async () => {
    await repo.enableStreak('series-undo');
    await repo.incrementStreak('series-undo', '2026-10-01');
    await repo.incrementStreak('series-undo', '2026-10-02');

    // Undo day 2: streak 2 → 1, lastCompletedDate → '2026-10-01'
    const reverted = await repo.revertCompletion('series-undo', '2026-10-02');
    expect(reverted?.currentStreak).toBe(1);
    expect(reverted?.lastCompletedDate).toBe('2026-10-01');

    // BUG-FIX: re-completing day 2 now correctly increments to 2, not freezes at 1
    const reCompleted = await repo.incrementStreak('series-undo', '2026-10-02');
    expect(reCompleted?.currentStreak).toBe(2);
    expect(reCompleted?.lastCompletedDate).toBe('2026-10-02');
  });

  it('revertCompletion sets lastCompletedDate to null when reverting the very first day', async () => {
    await repo.enableStreak('series-first');
    await repo.incrementStreak('series-first', '2026-10-01');

    const reverted = await repo.revertCompletion('series-first', '2026-10-01');
    expect(reverted?.currentStreak).toBe(0);
    // Only first day reverted — no prior day, so null is correct
    expect(reverted?.lastCompletedDate).toBeNull();
  });

  it('findBySeriesIds batch loads streak data for multiple series', async () => {
    await repo.enableStreak('series-a');
    await repo.enableStreak('series-b');
    await repo.incrementStreak('series-a', '2026-10-01');

    const map = await repo.findBySeriesIds(['series-a', 'series-b', 'series-c']);
    expect(map.size).toBe(2);
    expect(map.get('series-a')?.currentStreak).toBe(1);
    // series-b enabled but no completions yet — seeded at 0
    expect(map.get('series-b')?.currentStreak).toBe(0);
    expect(map.get('series-c')).toBeUndefined();

    // Empty list returns empty map
    const emptyMap = await repo.findBySeriesIds([]);
    expect(emptyMap.size).toBe(0);
  });

  it('isStreakEnabled reports correct boolean status', async () => {
    expect(await repo.isStreakEnabled('series-x')).toBe(false);

    await repo.enableStreak('series-x');
    expect(await repo.isStreakEnabled('series-x')).toBe(true);

    await repo.disableStreak('series-x');
    expect(await repo.isStreakEnabled('series-x')).toBe(false);
  });

  describe('Recurring habit streaks with any repeat period', () => {
    const { getDatabase } = require('@/data/db');
    const { taskDefinitions, taskOccurrences } = require('@/data/schema');

    it('weekly recurring habit increments streak across weekly intervals', async () => {
      const db = getDatabase();
      const seriesId = 'series-weekly-fri';

      // Insert weekly definition (every Friday)
      await db.insert(taskDefinitions).values({
        id: 'def-weekly-fri',
        title: 'Read Surah Al-Kahf',
        startDate: '2026-10-02',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: '{}',
        recurrenceRule: 'RRULE:FREQ=WEEKLY;BYDAY=FR',
        seriesId,
        seriesVersion: 1,
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      });

      await repo.enableStreak(seriesId);

      // Friday Oct 2: 1st completion
      const day1 = await repo.incrementStreak(seriesId, '2026-10-02');
      expect(day1?.currentStreak).toBe(1);

      // Friday Oct 9: consecutive scheduled occurrence (7 days later) -> streak = 2!
      const day2 = await repo.incrementStreak(seriesId, '2026-10-09');
      expect(day2?.currentStreak).toBe(2);

      // Friday Oct 16: consecutive scheduled occurrence (7 days later) -> streak = 3!
      const day3 = await repo.incrementStreak(seriesId, '2026-10-16');
      expect(day3?.currentStreak).toBe(3);
    });

    it('weekly recurring habit resets to 1 if a scheduled week is skipped', async () => {
      const db = getDatabase();
      const seriesId = 'series-weekly-skip';

      await db.insert(taskDefinitions).values({
        id: 'def-weekly-skip',
        title: 'Weekly Task',
        startDate: '2026-10-02',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: '{}',
        recurrenceRule: 'RRULE:FREQ=WEEKLY;BYDAY=FR',
        seriesId,
        seriesVersion: 1,
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      });

      await repo.enableStreak(seriesId);
      await repo.incrementStreak(seriesId, '2026-10-02'); // streak = 1

      // Skip Friday Oct 9, complete Friday Oct 16 (gap with uncancelled missed occurrence in between)
      const day3 = await repo.incrementStreak(seriesId, '2026-10-16');
      expect(day3?.currentStreak).toBe(1); // Reset to 1 because Oct 9 was missed
    });

    it('ignoring CANCELLED occurrences: user delete does not break streak', async () => {
      const db = getDatabase();
      const seriesId = 'series-weekly-delete';

      await db.insert(taskDefinitions).values({
        id: 'def-weekly-delete',
        title: 'Weekly Task With Delete',
        startDate: '2026-10-02',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: '{}',
        recurrenceRule: 'RRULE:FREQ=WEEKLY;BYDAY=FR',
        seriesId,
        seriesVersion: 1,
        isActive: true,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      });

      // Oct 9 was CANCELLED (deleted by user)
      await db.insert(taskOccurrences).values({
        id: 'occ-oct-9',
        taskDefinitionId: 'def-weekly-delete',
        seriesId,
        localDate: '2026-10-09',
        planningDayKey: '2026-10-09',
        timezone: 'UTC',
        status: 'CANCELLED',
      });

      await repo.enableStreak(seriesId);
      await repo.incrementStreak(seriesId, '2026-10-02'); // streak = 1

      // Complete Oct 16: intermediate Oct 9 was CANCELLED, so streak continues!
      const day3 = await repo.incrementStreak(seriesId, '2026-10-16');
      expect(day3?.currentStreak).toBe(2);
    });
  });
});
