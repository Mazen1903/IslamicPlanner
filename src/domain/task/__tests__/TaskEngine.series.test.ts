import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskEngine } from '../TaskEngine';
import { TaskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { TaskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { DataIntegrityError } from '../errors';

describe('TaskEngine - Recurring Series Operations (RS-01 through RS-07, TX-01, SV-01)', () => {
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

  it('RS-01: "This occurrence" override writes to overrideData while definition remains unchanged', async () => {
    const def = await engine.createTask({
      title: 'Daily Quran Reading',
      startDate: '2026-09-01',
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '06:00' },
      recurrenceRule: 'FREQ=DAILY',
      priority: 'NORMAL',
    });

    const occ = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-10',
      planningDayKey: '2026-09-10',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Update single occurrence
    const updatedOcc = await engine.updateOccurrenceOverride(occ.id, {
      title: 'Read Surah Al-Kahf Today',
      notes: 'Read with tajweed',
    });

    expect(updatedOcc.overrideData).toEqual({
      title: 'Read Surah Al-Kahf Today',
      notes: 'Read with tajweed',
    });

    // Definition remains completely untouched
    const freshDef = await defRepo.findById(def.id);
    expect(freshDef?.title).toBe('Daily Quran Reading');
    expect(freshDef?.scheduleData).toEqual({ localTime: '06:00' });
  });

  it('RS-02 & SV-01: "This and future" split creates successor version, closes predecessor, and deletes pending future occurrences', async () => {
    const def = await engine.createTask({
      title: 'Daily Exercise',
      startDate: '2026-09-01',
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '07:00' },
      recurrenceRule: 'FREQ=DAILY',
    });

    // Create 3 occurrences: past completed, past pending, future pending
    const occPastCompleted = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-10',
      planningDayKey: '2026-09-10',
      timezone: 'America/Chicago',
      status: 'COMPLETED',
      completedAt: '2026-09-10T07:30:00Z',
    });

    const occAtSplit = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    const occAfterSplit = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-16',
      planningDayKey: '2026-09-16',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Perform split at 2026-09-15
    const splitResult = await engine.splitSeriesAndFuture(def.seriesId, '2026-09-15', {
      title: 'Daily Evening Exercise',
      scheduleData: { localTime: '19:00' },
    });

    // Predecessor checks
    expect(splitResult.predecessor.effectiveToDate).toBe('2026-09-14');
    expect(splitResult.predecessor.isActive).toBe(true);
    expect(splitResult.predecessor.seriesVersion).toBe(1);

    // Successor checks
    expect(splitResult.newVersion.seriesId).toBe(def.seriesId);
    expect(splitResult.newVersion.seriesVersion).toBe(2);
    expect(splitResult.newVersion.startDate).toBe('2026-09-15');
    expect(splitResult.newVersion.effectiveFromDate).toBe('2026-09-15');
    expect(splitResult.newVersion.effectiveToDate).toBeNull();
    expect(splitResult.newVersion.title).toBe('Daily Evening Exercise');
    expect(splitResult.newVersion.scheduleData).toEqual({ localTime: '19:00' });

    // SV-01: Active version query finds the successor
    const activeDef = await defRepo.findActiveBySeriesId(def.seriesId);
    expect(activeDef?.id).toBe(splitResult.newVersion.id);
    expect(activeDef?.seriesVersion).toBe(2);

    // Occurrences check:
    // Past completed occurrence MUST be preserved
    const pastPreserved = await occRepo.findById(occPastCompleted.id);
    expect(pastPreserved).not.toBeNull();
    expect(pastPreserved?.status).toBe('COMPLETED');

    // Pending occurrences from splitDate onward MUST be deleted
    const splitOccDeleted = await occRepo.findById(occAtSplit.id);
    expect(splitOccDeleted).toBeNull();

    const afterSplitOccDeleted = await occRepo.findById(occAfterSplit.id);
    expect(afterSplitOccDeleted).toBeNull();
  });

  it('RS-03: "Entire series" edit updates active definition in-place', async () => {
    const def = await engine.createTask({
      title: 'Family Halaqa',
      startDate: '2026-09-01',
      scheduleType: 'PRAYER_RELATIVE',
      scheduleData: { anchorPrayer: 'MAGHRIB', offsetMinutes: 15, direction: 'AFTER' },
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR',
    });

    const updated = await engine.updateEntireSeries(def.seriesId, {
      title: 'Weekly Family Halaqa',
      priority: 'IMPORTANT',
      scheduleData: { anchorPrayer: 'ISHA', offsetMinutes: 10, direction: 'AFTER' },
    });

    expect(updated.id).toBe(def.id);
    expect(updated.title).toBe('Weekly Family Halaqa');
    expect(updated.priority).toBe('IMPORTANT');
    expect(updated.scheduleData).toEqual({ anchorPrayer: 'ISHA', offsetMinutes: 10, direction: 'AFTER' });
    expect(updated.seriesVersion).toBe(1);
  });

  it('RS-04: Enforces UNIQUE(seriesId, localDate) preventing duplicate occurrences', async () => {
    const def = await engine.createTask({
      title: 'Tahajjud Routine',
      startDate: '2026-09-01',
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '04:30' },
      recurrenceRule: 'FREQ=DAILY',
    });

    await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Attempting to create duplicate occurrence for same seriesId and localDate must fail
    await expect(
      occRepo.create({
        taskDefinitionId: def.id,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      })
    ).rejects.toThrow(DataIntegrityError);
  });

  it('RS-06: Cancel one occurrence sets status=CANCELLED and persists row as tombstone', async () => {
    const def = await engine.createTask({
      title: 'Fast Mondays',
      startDate: '2026-09-01',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
    });

    const occ = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    const cancelled = await engine.cancelTask(occ.id);
    expect(cancelled.status).toBe('CANCELLED');

    // Tombstone persists in DB
    const fetched = await occRepo.findById(occ.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.status).toBe('CANCELLED');
  });

  it('RS-07: Delete entire series deactivates definitions and cancels ALL remaining PENDING occurrences (past and future)', async () => {
    const def = await engine.createTask({
      title: 'Study Tajweed',
      startDate: '2026-09-01',
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '18:00' },
      recurrenceRule: 'FREQ=DAILY',
    });

    // Create a variety of occurrences
    const completedOcc = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-05',
      planningDayKey: '2026-09-05',
      timezone: 'America/Chicago',
      status: 'COMPLETED',
      completedAt: '2026-09-05T18:30:00Z',
    });

    const missedOcc = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-06',
      planningDayKey: '2026-09-06',
      timezone: 'America/Chicago',
      status: 'MISSED',
      missedAt: '2026-09-06T23:59:59Z',
    });

    const pastPendingOcc = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-07',
      planningDayKey: '2026-09-07',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    const futurePendingOcc = await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-25',
      planningDayKey: '2026-09-25',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Delete entire series
    await engine.deleteEntireSeries(def.seriesId);

    // Definitions must be deactivated
    const freshDef = await defRepo.findById(def.id);
    expect(freshDef?.isActive).toBe(false);

    // COMPLETED and MISSED rows must be preserved
    const freshCompleted = await occRepo.findById(completedOcc.id);
    expect(freshCompleted?.status).toBe('COMPLETED');
    expect(freshCompleted?.completedAt).toBe('2026-09-05T18:30:00Z');

    const freshMissed = await occRepo.findById(missedOcc.id);
    expect(freshMissed?.status).toBe('MISSED');
    expect(freshMissed?.missedAt).toBe('2026-09-06T23:59:59Z');

    // Past PENDING must be CANCELLED (not left alive overdue)
    const freshPastPending = await occRepo.findById(pastPendingOcc.id);
    expect(freshPastPending?.status).toBe('CANCELLED');

    // Future PENDING must be CANCELLED
    const freshFuturePending = await occRepo.findById(futurePendingOcc.id);
    expect(freshFuturePending?.status).toBe('CANCELLED');
  });

  it('TX-01: Transactional atomicity rolls back all changes if series split fails midway', async () => {
    const def = await engine.createTask({
      title: 'Night Reflection',
      startDate: '2026-09-01',
      scheduleType: 'EXACT_TIME',
      scheduleData: { localTime: '22:00' },
      recurrenceRule: 'FREQ=DAILY',
    });

    await occRepo.create({
      taskDefinitionId: def.id,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Mock occRepo.deletePendingFutureOccurrences to throw inside the transaction
    jest.spyOn(occRepo, 'deletePendingFutureOccurrences').mockImplementationOnce(() => {
      throw new Error('Simulated SQLite disk write failure');
    });

    // Attempt split
    await expect(
      engine.splitSeriesAndFuture(def.seriesId, '2026-09-15', {
        title: 'New Title',
      })
    ).rejects.toThrow('Simulated SQLite disk write failure');

    // Verify rollback:
    // 1. Predecessor was NOT closed
    const activeDef = await defRepo.findActiveBySeriesId(def.seriesId);
    expect(activeDef?.id).toBe(def.id);
    expect(activeDef?.effectiveToDate).toBeNull();

    // 2. Successor version does NOT exist
    const allVersions = await defRepo.findBySeriesId(def.seriesId);
    expect(allVersions.length).toBe(1);

    // 3. Pending occurrence was NOT deleted
    const occs = await occRepo.findBySeriesId(def.seriesId);
    expect(occs.length).toBe(1);
  });
});
