import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskEngine } from '../TaskEngine';
import { TaskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { TaskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { TaskValidationError } from '../errors';

describe('TaskEngine.deleteTask — delete scopes', () => {
  let defRepo: TaskDefinitionRepository;
  let occRepo: TaskOccurrenceRepository;
  let engine: TaskEngine;

  beforeEach(() => {
    createTestDatabase();
    defRepo = new TaskDefinitionRepository();
    occRepo = new TaskOccurrenceRepository();
    engine = new TaskEngine(defRepo, occRepo);
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  async function seedRecurring() {
    const def = await engine.createTask({
      title: 'Daily Dhikr',
      startDate: '2026-09-01',
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '07:00' },
      recurrenceRule: 'FREQ=DAILY',
    });
    const mk = (localDate: string, status: 'PENDING' | 'COMPLETED', completedAt?: string) =>
      occRepo.create({
        taskDefinitionId: def.id,
        localDate,
        planningDayKey: localDate,
        timezone: 'America/Chicago',
        status,
        ...(completedAt ? { completedAt } : {}),
      });
    const past = await mk('2026-09-10', 'COMPLETED', '2026-09-10T07:30:00Z');
    const split = await mk('2026-09-15', 'PENDING');
    const future1 = await mk('2026-09-16', 'PENDING');
    const future2 = await mk('2026-09-17', 'PENDING');
    return { def, past, split, future1, future2 };
  }

  it('THIS_OCCURRENCE tombstones only that occurrence and keeps the series active', async () => {
    const { def, past, split, future1 } = await seedRecurring();

    await engine.deleteTask({
      occurrenceId: split.id,
      definitionId: def.id,
      scope: 'THIS_OCCURRENCE',
    });

    expect((await occRepo.findById(split.id))?.status).toBe('CANCELLED');
    expect((await occRepo.findById(past.id))?.status).toBe('COMPLETED');
    expect((await occRepo.findById(future1.id))?.status).toBe('PENDING');

    const active = await defRepo.findActiveBySeriesId(def.seriesId);
    expect(active?.effectiveToDate ?? null).toBeNull();
  });

  it('THIS_AND_FUTURE closes the version the day before, preserves history and removes pending future', async () => {
    const { def, past, split, future1, future2 } = await seedRecurring();

    await engine.deleteTask({
      occurrenceId: split.id,
      definitionId: def.id,
      scope: 'THIS_AND_FUTURE',
    });

    // Version closed at date - 1
    const closed = await defRepo.findById(def.id);
    expect(closed?.effectiveToDate).toBe('2026-09-14');

    // History is preserved
    const pastKept = await occRepo.findById(past.id);
    expect(pastKept?.status).toBe('COMPLETED');

    // The chosen occurrence is tombstoned (not regenerated), later pending ones are gone
    expect((await occRepo.findById(split.id))?.status).toBe('CANCELLED');
    expect(await occRepo.findById(future1.id)).toBeNull();
    expect(await occRepo.findById(future2.id)).toBeNull();
  });

  it('THIS_AND_FUTURE requires an occurrenceId', async () => {
    const { def } = await seedRecurring();

    await expect(
      engine.deleteTask({ definitionId: def.id, scope: 'THIS_AND_FUTURE' })
    ).rejects.toBeInstanceOf(TaskValidationError);
  });

  it('ALL_OCCURRENCES deactivates the series, cancels pending and retains completed history', async () => {
    const { def, past, split, future1 } = await seedRecurring();

    await engine.deleteTask({
      occurrenceId: split.id,
      definitionId: def.id,
      scope: 'ALL_OCCURRENCES',
    });

    expect((await defRepo.findById(def.id))?.isActive).toBe(false);
    expect((await occRepo.findById(past.id))?.status).toBe('COMPLETED');
    expect((await occRepo.findById(split.id))?.status).toBe('CANCELLED');
    expect((await occRepo.findById(future1.id))?.status).toBe('CANCELLED');
  });

  it('one-off tasks are purged entirely regardless of scope', async () => {
    const def = await engine.createTask({
      title: 'One-off',
      startDate: '2026-09-15',
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '09:00' },
    });
    const occ = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    await engine.deleteTask({
      occurrenceId: occ.id,
      definitionId: def.id,
      scope: 'THIS_OCCURRENCE',
    });

    expect(await defRepo.findById(def.id)).toBeNull();
    expect(await occRepo.findById(occ.id)).toBeNull();
  });
});
