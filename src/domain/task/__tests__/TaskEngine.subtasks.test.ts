import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskEngine } from '../TaskEngine';
import { TaskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { TaskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { TaskValidationError } from '../errors';

describe('TaskEngine - Subtasks & Occurrence Isolation (Binding Constraint 4)', () => {
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

  it('validates and preserves subtask template in TaskDefinition', async () => {
    const def = await engine.createTask({
      title: 'Friday Prep',
      startDate: '2026-09-05',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      subtasks: [
        { id: 'sub-ghusl', title: 'Ghusl' },
        { id: 'sub-kahf', title: 'Surah Al-Kahf' },
        { title: 'Perfume' }, // ID should be auto-generated
      ],
    });

    expect(def.subtasks).toHaveLength(3);
    expect(def.subtasks[0]).toEqual({ id: 'sub-ghusl', title: 'Ghusl' });
    expect(def.subtasks[1]).toEqual({ id: 'sub-kahf', title: 'Surah Al-Kahf' });
    expect(def.subtasks[2].title).toBe('Perfume');
    expect(def.subtasks[2].id).toBeTruthy();
    expect(typeof def.subtasks[2].id).toBe('string');
  });

  it('rejects duplicate subtask IDs in the template with TaskValidationError', async () => {
    await expect(
      engine.createTask({
        title: 'Morning Routine',
        startDate: '2026-09-01',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        subtasks: [
          { id: 'dup-id', title: 'Subtask 1' },
          { id: 'dup-id', title: 'Subtask 2' },
        ],
      })
    ).rejects.toThrow(TaskValidationError);
  });

  it('occurrence subtask completion is isolated per occurrence and does not mutate template or other occurrences', async () => {
    const def = await engine.createTask({
      title: 'Daily Evening Routine',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      recurrenceRule: 'FREQ=DAILY',
      subtasks: [
        { id: 'sub-1', title: 'Adhkar' },
        { id: 'sub-2', title: 'Witr' },
      ],
    });

    // Occurrence 1: Day 1
    const occ1 = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-01',
      planningDayKey: '2026-09-01',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Occurrence 2: Day 2
    const occ2 = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-02',
      planningDayKey: '2026-09-02',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Complete subtask 1 on Occurrence 1
    const updatedOcc1 = await engine.toggleSubtaskCompletion(occ1.id, 'sub-1', true);
    expect(updatedOcc1.overrideData?.completedSubtaskIds).toEqual(['sub-1']);

    // Check Occurrence 2: MUST NOT be affected
    const freshOcc2 = await occRepo.findById(occ2.id);
    expect(freshOcc2?.overrideData?.completedSubtaskIds).toBeUndefined();

    // Check TaskDefinition template: MUST NOT store completion state
    const freshDef = await defRepo.findById(def.id);
    expect(freshDef?.subtasks).toEqual([
      { id: 'sub-1', title: 'Adhkar' },
      { id: 'sub-2', title: 'Witr' },
    ]);
  });

  it('rejects toggling a subtask ID that does not exist in the definition template', async () => {
    const def = await engine.createTask({
      title: 'Study Session',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      subtasks: [{ id: 'sub-real', title: 'Read Chapter 1' }],
    });

    const occ = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-01',
      planningDayKey: '2026-09-01',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    await expect(
      engine.toggleSubtaskCompletion(occ.id, 'sub-nonexistent', true)
    ).rejects.toThrow(TaskValidationError);
  });

  it('handles duplicate completion toggles idempotently without storing duplicate IDs', async () => {
    const def = await engine.createTask({
      title: 'Study Session',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      subtasks: [
        { id: 'sub-1', title: 'Part A' },
        { id: 'sub-2', title: 'Part B' },
      ],
    });

    const occ = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-01',
      planningDayKey: '2026-09-01',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Complete sub-1 twice
    await engine.toggleSubtaskCompletion(occ.id, 'sub-1', true);
    const occAfterSecond = await engine.toggleSubtaskCompletion(occ.id, 'sub-1', true);

    expect(occAfterSecond.overrideData?.completedSubtaskIds).toEqual(['sub-1']);

    // Complete sub-2 as well
    const occWithBoth = await engine.toggleSubtaskCompletion(occ.id, 'sub-2', true);
    expect(occWithBoth.overrideData?.completedSubtaskIds?.sort()).toEqual(['sub-1', 'sub-2']);

    // Un-toggle sub-1
    const occUntoggled = await engine.toggleSubtaskCompletion(occ.id, 'sub-1', false);
    expect(occUntoggled.overrideData?.completedSubtaskIds).toEqual(['sub-2']);
  });
});
