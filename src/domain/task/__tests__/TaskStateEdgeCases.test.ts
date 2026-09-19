import { TaskEngine } from '../TaskEngine';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskValidationError } from '@/domain/task/errors';
import { RecurringHorizonSync } from '@/features/task-form/recurringHorizonSync';
import { MaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { RecurrenceEngine } from '@/domain/recurrence/RecurrenceEngine';
import { HijriService } from '@/domain/calendar/HijriService';

describe('TaskStateEdgeCases (TSE-01 to TSE-08)', () => {
  let engine: TaskEngine;
  let testSeriesId = 'series-tse-test';
  let testDefId = 'def-tse-test';

  beforeEach(async () => {
    createTestDatabase();
    engine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);

    const def = await taskDefinitionRepository.create({
      id: testDefId,
      title: 'TSE Test Task',
      startDate: '2026-09-15',
      source: 'USER',
      scheduleType: 'PRAYER_RELATIVE',
      scheduleData: {
        anchorPrayer: 'DHUHR',
        direction: 'AFTER',
        offsetMinutes: 15,
      },
      seriesId: testSeriesId,
      seriesVersion: 1,
      priority: 'NORMAL',
      estimatedMinutes: 20,
      notes: null,
      tags: [],
      subtasks: [],
      isActive: true,
    });
    testDefId = def.id;
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('TSE-01: (UNIT) Double-complete attempt: second completeTask call is idempotent', async () => {
    const occ = await taskOccurrenceRepository.create({
      id: 'occ-tse-01',
      taskDefinitionId: testDefId,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    const first = await engine.completeTask(occ.id, '2026-09-15T13:00:00.000Z');
    expect(first.status).toBe('COMPLETED');
    expect(first.completedAt).toBe('2026-09-15T13:00:00.000Z');

    // Second complete attempt should be idempotent without error
    const second = await engine.completeTask(occ.id, '2026-09-15T14:00:00.000Z');
    expect(second.status).toBe('COMPLETED');
    // completedAt is preserved from first completion
    expect(second.completedAt).toBe('2026-09-15T13:00:00.000Z');
  });

  it('TSE-02: (UNIT) Complete then edit series: COMPLETED occurrence status unchanged', async () => {
    const occ = await taskOccurrenceRepository.create({
      id: 'occ-tse-02',
      taskDefinitionId: testDefId,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    await engine.completeTask(occ.id, '2026-09-15T13:30:00.000Z');

    // Edit series
    await engine.updateEntireSeries(testSeriesId, {
      title: 'Renamed Series Title',
      estimatedMinutes: 45,
    });

    const refreshed = await taskOccurrenceRepository.findById(occ.id);
    expect(refreshed?.status).toBe('COMPLETED');
    expect(refreshed?.completedAt).toBe('2026-09-15T13:30:00.000Z');
  });

  it('TSE-03: (UNIT) Complete then delete series: COMPLETED occurrence preserved in history', async () => {
    const occ = await taskOccurrenceRepository.create({
      id: 'occ-tse-03',
      taskDefinitionId: testDefId,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    await engine.completeTask(occ.id, '2026-09-15T13:30:00.000Z');

    // Delete entire series (deactivates defs, cancels pending, preserves completed)
    await engine.deleteEntireSeries(testSeriesId);

    const history = await taskOccurrenceRepository.findById(occ.id);
    expect(history).not.toBeNull();
    expect(history?.status).toBe('COMPLETED');
    expect(history?.completedAt).toBe('2026-09-15T13:30:00.000Z');
  });

  it('TSE-04: (UNIT) MISSED occurrence not rolled over on refresh', async () => {
    const occ = await taskOccurrenceRepository.create({
      id: 'occ-tse-04',
      taskDefinitionId: testDefId,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    await engine.missTask(occ.id, '2026-09-15T23:59:59.000Z');

    // Verify MISSED is terminal and date never rolls over
    const fetched = await taskOccurrenceRepository.findById(occ.id);
    expect(fetched?.status).toBe('MISSED');
    expect(fetched?.localDate).toBe('2026-09-15');
    expect(fetched?.planningDayKey).toBe('2026-09-15');
    expect(fetched?.missedAt).toBe('2026-09-15T23:59:59.000Z');

    // Attempting to hard-delete or transition should be blocked
    await expect(taskOccurrenceRepository.delete(occ.id)).rejects.toThrow(TaskValidationError);
  });

  it('TSE-05: (UNIT) Terminal occurrence in recurrence re-sync: status not overwritten', async () => {
    const occ = await taskOccurrenceRepository.create({
      id: 'occ-tse-05',
      taskDefinitionId: testDefId,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    await engine.completeTask(occ.id, '2026-09-15T13:00:00.000Z');

    const matEngine = new MaterializationEngine();
    const result = await matEngine.materializeOne(
      { seriesId: testSeriesId, seedDate: '2026-09-15' },
      {
        timeline: {
          centerDate: '2026-09-15',
          periods: [],
        } as any,
        planningDayConfig: { mode: 'FAJR' },
      }
    );

    // Terminal short-circuit: skipped without mutating status
    expect(result.action).toBe('SKIPPED_COMPLETED');
    const checked = await taskOccurrenceRepository.findById(occ.id);
    expect(checked?.status).toBe('COMPLETED');
    expect(checked?.completedAt).toBe('2026-09-15T13:00:00.000Z');
  });

  it('TSE-06: (UNIT) Stale view-model action on terminal occurrence: handled gracefully', async () => {
    const occ = await taskOccurrenceRepository.create({
      id: 'occ-tse-06',
      taskDefinitionId: testDefId,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Occurrence becomes CANCELLED
    await engine.cancelTask(occ.id);

    // Stale user action: user taps "Complete" on an occurrence that already transitioned to CANCELLED
    await expect(engine.completeTask(occ.id)).rejects.toThrow(TaskValidationError);

    // State remains CANCELLED; never corrupted
    const current = await taskOccurrenceRepository.findById(occ.id);
    expect(current?.status).toBe('CANCELLED');
  });

  it('TSE-07: (INTEGRATION) Rapid repeated completeTask calls (concurrent): exactly one COMPLETED row; no duplicate timestamps', async () => {
    const occ = await taskOccurrenceRepository.create({
      id: 'occ-tse-07',
      taskDefinitionId: testDefId,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // Fire 5 concurrent completion attempts
    const results = await Promise.all([
      engine.completeTask(occ.id, '2026-09-15T12:00:00.000Z'),
      engine.completeTask(occ.id, '2026-09-15T12:00:00.000Z'),
      engine.completeTask(occ.id, '2026-09-15T12:00:00.000Z'),
      engine.completeTask(occ.id, '2026-09-15T12:00:00.000Z'),
      engine.completeTask(occ.id, '2026-09-15T12:00:00.000Z'),
    ]);

    for (const res of results) {
      expect(res.status).toBe('COMPLETED');
    }

    const rows = await taskOccurrenceRepository.findTodayCandidates('2026-09-15', '2026-09-15T12:00:00.000Z');
    const matched = rows.filter(r => r.id === occ.id);
    expect(matched).toHaveLength(1);
    expect(matched[0].status).toBe('COMPLETED');
    expect(matched[0].completedAt).toBe('2026-09-15T12:00:00.000Z');
  });

  it('TSE-08: (INTEGRATION) Stale PENDING delete vs. concurrent terminal transition: atomic SQL guard protects terminal history', async () => {
    // 1. Occurrence begins PENDING
    const occ = await taskOccurrenceRepository.create({
      id: 'occ-tse-08',
      taskDefinitionId: testDefId,
      localDate: '2026-09-15',
      planningDayKey: '2026-09-15',
      timezone: 'America/Chicago',
      status: 'PENDING',
    });

    // 2. Recurrence cleanup identifies it as a deletion candidate (e.g. toDelete list)
    // 3. Before destructive cleanup executes, another operation transitions it to terminal COMPLETED
    const completedOcc = await engine.completeTask(occ.id, '2026-09-15T12:30:00.000Z');
    expect(completedOcc.status).toBe('COMPLETED');

    // 4. Cleanup attempts its guarded delete
    const delResult = await taskOccurrenceRepository.deleteIfPending(occ.id);

    // 5. Guarded delete must affect 0 rows and return NOT_PENDING with terminal occurrence
    expect(delResult.outcome).toBe('NOT_PENDING');
    if (delResult.outcome === 'NOT_PENDING') {
      expect(delResult.occurrence.id).toBe(occ.id);
      expect(delResult.occurrence.status).toBe('COMPLETED');
    }

    // 6. Terminal occurrence must still exist in the database
    const surviving = await taskOccurrenceRepository.findById(occ.id);
    expect(surviving).not.toBeNull();

    // 7. Terminal status/history must remain intact
    expect(surviving?.status).toBe('COMPLETED');
    expect(surviving?.completedAt).toBe('2026-09-15T12:30:00.000Z');

    // 8. Integration test with RecurringHorizonSync: verify syncSeries does not increment deleted count
    const sync = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      new RecurrenceEngine(),
      new MaterializationEngine(taskOccurrenceRepository, taskDefinitionRepository),
      new HijriService(),
      async () => ({ baseMethod: 'UMM_AL_QURA', globalAdjustment: 0, overrides: [] })
    );

    // If toDelete includes a now-terminal occurrence, deleted count remains 0
    const syncRes = await sync.syncSeries(
      testSeriesId,
      { start: '2026-09-14', end: '2026-09-16' },
      {
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        params: {
          method: 'ISNA',
          asrMethod: 'SHAFI',
          highLatitudeRule: 'AUTO',
          polarCircleResolution: 'AQRAB_YAUM',
          adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
          timezone: 'America/Chicago',
        },
        planningDayConfig: { mode: 'FAJR' },
      }
    );

    // Terminal row was NOT deleted by syncSeries
    expect(syncRes.deleted).toBe(0);
    const postSync = await taskOccurrenceRepository.findById(occ.id);
    expect(postSync?.status).toBe('COMPLETED');
  });
});
