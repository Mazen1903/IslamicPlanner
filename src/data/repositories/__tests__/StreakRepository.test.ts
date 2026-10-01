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

  it('enableStreak creates a new streak tracking record', async () => {
    const streak = await repo.enableStreak('series-1');
    expect(streak).toBeDefined();
    expect(streak.seriesId).toBe('series-1');
    expect(streak.streakEnabled).toBe(true);
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
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

    // Re-enabling keeps history
    const reEnabled = await repo.enableStreak('series-1');
    expect(reEnabled.streakEnabled).toBe(true);
    expect(reEnabled.currentStreak).toBe(1);
  });

  it('incrementStreak increments current and longest streak correctly', async () => {
    await repo.enableStreak('series-1');

    const day1 = await repo.incrementStreak('series-1', '2026-10-01');
    expect(day1?.currentStreak).toBe(1);
    expect(day1?.longestStreak).toBe(1);
    expect(day1?.lastCompletedDate).toBe('2026-10-01');

    const day2 = await repo.incrementStreak('series-1', '2026-10-02');
    expect(day2?.currentStreak).toBe(2);
    expect(day2?.longestStreak).toBe(2);
    expect(day2?.lastCompletedDate).toBe('2026-10-02');

    // Idempotent completion on the same date does not double-count
    const day2Repeat = await repo.incrementStreak('series-1', '2026-10-02');
    expect(day2Repeat?.currentStreak).toBe(2);
    expect(day2Repeat?.longestStreak).toBe(2);
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

    // New streak after reset
    const newDay = await repo.incrementStreak('series-1', '2026-10-05');
    expect(newDay?.currentStreak).toBe(1);
    expect(newDay?.longestStreak).toBe(3); // Longest preserved
  });

  it('findBySeriesIds batch loads streak data for multiple series', async () => {
    await repo.enableStreak('series-a');
    await repo.enableStreak('series-b');
    await repo.incrementStreak('series-a', '2026-10-01');

    const map = await repo.findBySeriesIds(['series-a', 'series-b', 'series-c']);
    expect(map.size).toBe(2);
    expect(map.get('series-a')?.currentStreak).toBe(1);
    expect(map.get('series-b')?.currentStreak).toBe(1);
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
});
