import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { TaskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { TaskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { StreakRepository } from '@/data/repositories/StreakRepository';
import { StreakService } from '../StreakService';

/**
 * Habit streaks must follow the task's own repeat period (weekly, every N
 * days, ...) rather than assuming a daily cadence.
 */
describe('StreakService — any repeat period', () => {
  let defRepo: TaskDefinitionRepository;
  let occRepo: TaskOccurrenceRepository;
  let engine: TaskEngine;
  let streakRepo: StreakRepository;
  let service: StreakService;

  beforeEach(() => {
    createTestDatabase();
    defRepo = new TaskDefinitionRepository();
    occRepo = new TaskOccurrenceRepository();
    engine = new TaskEngine(defRepo, occRepo);
    streakRepo = new StreakRepository();
    service = new StreakService(streakRepo);
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  async function createRecurring(recurrenceRule: string, startDate: string) {
    const def = await engine.createTask({
      title: 'Recurring habit',
      startDate,
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '06:00' },
      recurrenceRule,
      priority: 'NORMAL',
    });
    await service.enableStreak(def.seriesId);
    return def;
  }

  it('weekly habit: consecutive weekly completions continue the streak', async () => {
    // 2026-10-05 is a Monday
    const def = await createRecurring('FREQ=WEEKLY;BYDAY=MO', '2026-10-05');

    await service.onOccurrenceCompleted(def.seriesId, '2026-10-05');
    await service.onOccurrenceCompleted(def.seriesId, '2026-10-12');
    await service.onOccurrenceCompleted(def.seriesId, '2026-10-19');

    const streak = await streakRepo.findBySeriesId(def.seriesId);
    expect(streak?.currentStreak).toBe(3);
    expect(streak?.longestStreak).toBe(3);
  });

  it('weekly habit: skipping a scheduled week restarts the streak', async () => {
    const def = await createRecurring('FREQ=WEEKLY;BYDAY=MO', '2026-10-05');

    await service.onOccurrenceCompleted(def.seriesId, '2026-10-05');
    await service.onOccurrenceCompleted(def.seriesId, '2026-10-12');
    // 2026-10-19 skipped
    await service.onOccurrenceCompleted(def.seriesId, '2026-10-26');

    const streak = await streakRepo.findBySeriesId(def.seriesId);
    expect(streak?.currentStreak).toBe(1);
    expect(streak?.longestStreak).toBe(2);
  });

  it('every-3-days habit: completions 3 days apart are consecutive', async () => {
    const def = await createRecurring('FREQ=DAILY;INTERVAL=3', '2026-10-01');

    await service.onOccurrenceCompleted(def.seriesId, '2026-10-01');
    await service.onOccurrenceCompleted(def.seriesId, '2026-10-04');
    await service.onOccurrenceCompleted(def.seriesId, '2026-10-07');

    const streak = await streakRepo.findBySeriesId(def.seriesId);
    expect(streak?.currentStreak).toBe(3);
  });

  it('every-3-days habit: missing a scheduled day restarts the streak', async () => {
    const def = await createRecurring('FREQ=DAILY;INTERVAL=3', '2026-10-01');

    await service.onOccurrenceCompleted(def.seriesId, '2026-10-01');
    // 2026-10-04 skipped
    await service.onOccurrenceCompleted(def.seriesId, '2026-10-07');

    const streak = await streakRepo.findBySeriesId(def.seriesId);
    expect(streak?.currentStreak).toBe(1);
  });

  it('accepts an RRULE: prefixed rule from storage', async () => {
    const def = await createRecurring('RRULE:FREQ=WEEKLY;BYDAY=MO', '2026-10-05');

    await service.onOccurrenceCompleted(def.seriesId, '2026-10-05');
    await service.onOccurrenceCompleted(def.seriesId, '2026-10-12');

    const streak = await streakRepo.findBySeriesId(def.seriesId);
    expect(streak?.currentStreak).toBe(2);
  });
});
