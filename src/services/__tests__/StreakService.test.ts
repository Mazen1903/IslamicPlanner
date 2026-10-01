import { StreakService } from '../StreakService';
import { StreakRepository } from '@/data/repositories/StreakRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';

describe('StreakService', () => {
  let streakRepo: StreakRepository;
  let service: StreakService;

  beforeEach(() => {
    createTestDatabase();
    streakRepo = new StreakRepository();
    service = new StreakService(streakRepo);
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('onOccurrenceCompleted increments streak when enabled for series', async () => {
    await service.enableStreak('series-1');

    // First real completion: 0 → 1
    await service.onOccurrenceCompleted('series-1', '2026-10-01');
    let streak = await streakRepo.findBySeriesId('series-1');
    expect(streak?.currentStreak).toBe(1);
    expect(streak?.longestStreak).toBe(1);

    // Consecutive day: 1 → 2
    await service.onOccurrenceCompleted('series-1', '2026-10-02');
    streak = await streakRepo.findBySeriesId('series-1');
    expect(streak?.currentStreak).toBe(2);
    expect(streak?.longestStreak).toBe(2);
  });

  it('onOccurrenceCompleted is a no-op when streak is not enabled', async () => {
    // Never enabled
    const res = await service.onOccurrenceCompleted('series-untracked', '2026-10-01');
    expect(res).toBeNull();

    const streak = await streakRepo.findBySeriesId('series-untracked');
    expect(streak).toBeNull();
  });

  it('onOccurrenceCompleted is a no-op when streak was disabled', async () => {
    await service.enableStreak('series-1');
    await service.onOccurrenceCompleted('series-1', '2026-10-01');
    await service.disableStreak('series-1');

    const res = await service.onOccurrenceCompleted('series-1', '2026-10-02');
    expect(res).toBeNull();

    const streak = await streakRepo.findBySeriesId('series-1');
    expect(streak?.currentStreak).toBe(1); // Unchanged
  });

  it('onOccurrenceMissed resets current streak to 0 while preserving longest streak', async () => {
    await service.enableStreak('series-1');
    await service.onOccurrenceCompleted('series-1', '2026-10-01');
    await service.onOccurrenceCompleted('series-1', '2026-10-02');

    let streak = await streakRepo.findBySeriesId('series-1');
    expect(streak?.currentStreak).toBe(2);
    expect(streak?.longestStreak).toBe(2);

    await service.onOccurrenceMissed('series-1', '2026-10-03');
    streak = await streakRepo.findBySeriesId('series-1');
    expect(streak?.currentStreak).toBe(0);
    expect(streak?.longestStreak).toBe(2);
  });

  it('onOccurrenceMissed is a no-op when streak is not enabled', async () => {
    const res = await service.onOccurrenceMissed('series-untracked', '2026-10-01');
    expect(res).toBeNull();
  });

  it('isStreakEnabled reports accurate status', async () => {
    expect(await service.isStreakEnabled('series-abc')).toBe(false);

    await service.enableStreak('series-abc');
    expect(await service.isStreakEnabled('series-abc')).toBe(true);

    await service.disableStreak('series-abc');
    expect(await service.isStreakEnabled('series-abc')).toBe(false);
  });

  it('onOccurrenceUncompleted reverts streak completion when undone', async () => {
    await service.enableStreak('series-undo');
    await service.onOccurrenceCompleted('series-undo', '2026-10-01');
    await service.onOccurrenceCompleted('series-undo', '2026-10-02');

    let streak = await streakRepo.findBySeriesId('series-undo');
    expect(streak?.currentStreak).toBe(2);
    expect(streak?.lastCompletedDate).toBe('2026-10-02');

    await service.onOccurrenceUncompleted('series-undo', '2026-10-02');
    streak = await streakRepo.findBySeriesId('series-undo');
    expect(streak?.currentStreak).toBe(1);
    // BUG-FIX: lastCompletedDate restored to previous day, not null
    expect(streak?.lastCompletedDate).toBe('2026-10-01');
  });
});
