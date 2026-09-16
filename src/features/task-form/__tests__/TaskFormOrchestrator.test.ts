import { TaskFormOrchestrator } from '../TaskFormOrchestrator';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { createInitialFormState, formReducer } from '../formReducer';
import type { TodayTemporalInputProvider, TodayTemporalInputs } from '@/services/types';
import { TaskFormSyncService } from '../syncService';
import { RecurringHorizonSync } from '../recurringHorizonSync';
import { MaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { RecurrenceEngine } from '@/domain/recurrence/RecurrenceEngine';
import { HijriService } from '@/domain/calendar/HijriService';

describe('TaskFormOrchestrator & Two-Phase Save Contract (M10)', () => {
  let taskEngine: TaskEngine;
  let matEngine: MaterializationEngine;
  let syncService: TaskFormSyncService;
  let horizonSync: RecurringHorizonSync;
  let mockInputProvider: TodayTemporalInputProvider;

  const validTemporalInputs: TodayTemporalInputs = {
    coordinates: { latitude: 40.7128, longitude: -74.006 },
    params: {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'America/New_York',
    },
    planningDayConfig: { mode: 'FAJR' },
  };

  beforeEach(() => {
    createTestDatabase();
    taskEngine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
    matEngine = new MaterializationEngine(taskOccurrenceRepository, taskDefinitionRepository);
    const recEngine = new RecurrenceEngine();
    const hijri = new HijriService();
    horizonSync = new RecurringHorizonSync(
      taskDefinitionRepository,
      taskOccurrenceRepository,
      recEngine,
      matEngine,
      hijri
    );
    syncService = new TaskFormSyncService(
      taskOccurrenceRepository,
      matEngine,
      recEngine,
      horizonSync
    );

    mockInputProvider = {
      getInputs: jest.fn().mockResolvedValue({
        status: 'READY',
        inputs: validTemporalInputs,
      }),
    };
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  describe('Two-Phase Save & Partial Success Contract', () => {
    it('returns SAVED_AND_SYNCED when both Phase 1 and Phase 2 succeed', async () => {
      const orchestrator = new TaskFormOrchestrator(
        taskEngine,
        syncService,
        horizonSync,
        mockInputProvider
      );

      let state = createInitialFormState({
        civilSeedDate: '2026-09-15',
        planningDayDate: '2026-09-15',
      });
      state = formReducer(state, { type: 'SET_TITLE', payload: 'Morning Fajr Task' });
      state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'EXACT_TIME' });
      state = formReducer(state, { type: 'UPDATE_EXACT_DRAFT', payload: { localTime: '06:00' } });

      const result = await orchestrator.submit(state);
      expect(result.status).toBe('SAVED_AND_SYNCED');
      expect(result.definitionId).toBeDefined();
      expect(result.seriesId).toBeDefined();

      // Verify DB contains definition and materialized occurrence
      const def = await taskDefinitionRepository.findById(result.definitionId);
      expect(def).not.toBeNull();
      expect(def!.title).toBe('Morning Fajr Task');

      const occs = await taskOccurrenceRepository.findByPlanningDay('2026-09-15');
      expect(occs.length).toBeGreaterThan(0);
    });

    it('returns SAVED_SYNC_INCOMPLETE when Phase 1 succeeds but temporal inputs are SETUP_REQUIRED', async () => {
      const setupReqProvider: TodayTemporalInputProvider = {
        getInputs: jest.fn().mockResolvedValue({ status: 'SETUP_REQUIRED' }),
      };

      const orchestrator = new TaskFormOrchestrator(
        taskEngine,
        syncService,
        horizonSync,
        setupReqProvider
      );

      let state = createInitialFormState({
        civilSeedDate: '2026-09-15',
        planningDayDate: '2026-09-15',
      });
      state = formReducer(state, { type: 'SET_TITLE', payload: 'Offline Location Task' });
      state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'EXACT_TIME' });
      state = formReducer(state, { type: 'UPDATE_EXACT_DRAFT', payload: { localTime: '07:00' } });

      const result = await orchestrator.submit(state);
      expect(result.status).toBe('SAVED_SYNC_INCOMPLETE');
      if (result.status === 'SAVED_SYNC_INCOMPLETE') {
        expect(result.issues).toBeDefined();
        expect(result.issues[0].stage).toBe('CONTEXT');
      }

      // Definition is still committed and exists in DB!
      const def = await taskDefinitionRepository.findById(result.definitionId);
      expect(def).not.toBeNull();
      expect(def!.title).toBe('Offline Location Task');
    });

    it('retrySync reuses committed identity and executes Phase 2 only without creating duplicate definitions', async () => {
      let providerStatus: 'SETUP_REQUIRED' | 'READY' = 'SETUP_REQUIRED';
      const dynamicProvider: TodayTemporalInputProvider = {
        getInputs: jest.fn().mockImplementation(async () => {
          if (providerStatus === 'SETUP_REQUIRED') return { status: 'SETUP_REQUIRED' };
          return { status: 'READY', inputs: validTemporalInputs };
        }),
      };

      const orchestrator = new TaskFormOrchestrator(
        taskEngine,
        syncService,
        horizonSync,
        dynamicProvider
      );

      let state = createInitialFormState({
        civilSeedDate: '2026-09-15',
        planningDayDate: '2026-09-15',
      });
      state = formReducer(state, { type: 'SET_TITLE', payload: 'Retryable Task' });
      state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'EXACT_TIME' });
      state = formReducer(state, { type: 'UPDATE_EXACT_DRAFT', payload: { localTime: '08:00' } });

      // First submit: Phase 1 succeeds, Phase 2 fails (SETUP_REQUIRED)
      const res1 = await orchestrator.submit(state);
      expect(res1.status).toBe('SAVED_SYNC_INCOMPLETE');
      const committedDefId = res1.definitionId;

      // Count definitions in DB
      const defsBefore = await taskDefinitionRepository.findBySeriesId(res1.seriesId);
      expect(defsBefore).toHaveLength(1);

      // Now location becomes ready
      providerStatus = 'READY';

      // Call retrySync
      const res2 = await orchestrator.retrySync();
      expect(res2.status).toBe('SAVED_AND_SYNCED');
      expect(res2.definitionId).toBe(committedDefId);

      // Verify NO duplicate definition was created
      const defsAfter = await taskDefinitionRepository.findBySeriesId(res1.seriesId);
      expect(defsAfter).toHaveLength(1);

      // Occurrence is now materialized!
      const occs = await taskOccurrenceRepository.findPendingByLocalDateRange('2026-09-15', '2026-09-15');
      expect(occs.some(o => o.seriesId === res1.seriesId)).toBe(true);
    });
  });

  describe('Single-Flight Mutex Protection', () => {
    it('synchronously rejects rapid double-tap Save before first await completes', async () => {
      const orchestrator = new TaskFormOrchestrator(
        taskEngine,
        syncService,
        horizonSync,
        mockInputProvider
      );

      let state = createInitialFormState({
        civilSeedDate: '2026-09-15',
        planningDayDate: '2026-09-15',
      });
      state = formReducer(state, { type: 'SET_TITLE', payload: 'Double Tap Task' });

      // Start first save
      const p1 = orchestrator.submit(state);

      // Immediate second submit in same tick
      await expect(orchestrator.submit(state)).rejects.toThrow('Save operation already in flight');

      const res1 = await p1;
      expect(res1.status).toBe('SAVED_AND_SYNCED');
    });

    it('split double-tap executes splitSeriesAndFuture exactly once', async () => {
      // Create initial recurring series
      const def = await taskEngine.createTask({
        title: 'Original Series',
        startDate: '2026-09-10',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const orchestrator = new TaskFormOrchestrator(
        taskEngine,
        syncService,
        horizonSync,
        mockInputProvider
      );

      let state = createInitialFormState({
        civilSeedDate: '2026-09-15',
        planningDayDate: '2026-09-15',
        initialDefinition: def,
        editScope: 'THIS_AND_FUTURE',
      });
      state = formReducer(state, { type: 'SET_TITLE', payload: 'Split Future Series' });

      const p1 = orchestrator.submit(state);
      await expect(orchestrator.submit(state)).rejects.toThrow('Save operation already in flight');

      const res = await p1;
      expect(res.status).toBe('SAVED_AND_SYNCED');

      // Verify versions: exactly 2 versions in DB (v1 and v2)
      const allVersions = await taskDefinitionRepository.findBySeriesId(def.seriesId);
      expect(allVersions).toHaveLength(2);
      expect(allVersions[0].seriesVersion).toBe(1);
      expect(allVersions[1].seriesVersion).toBe(2);
    });
  });

  describe('Non-Recurring Date Move (M10 §24)', () => {
    it('deletes old pending occurrence and materializes new seed date without scanning continuous range', async () => {
      const def = await taskEngine.createTask({
        title: 'Doctor Appointment',
        startDate: '2026-09-15',
        scheduleType: 'EXACT_TIME',
        scheduleData: { localTime: '10:00' },
      });

      // Materialize old occurrence on 2026-09-15
      await syncService.syncOccurrencesAfterCreate(def, validTemporalInputs);
      const oldOcc = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      expect(oldOcc).not.toBeNull();
      expect(oldOcc!.status).toBe('PENDING');

      // Update definition date in Phase 1 (Move date far in future: 2027-09-15)
      await taskEngine.updateEntireSeries(def.seriesId, { startDate: '2027-09-15' });

      const res = await syncService.reconcileNonRecurringMove(
        def.seriesId,
        '2026-09-15',
        '2027-09-15',
        validTemporalInputs
      );

      expect(res.issues).toHaveLength(0);
      expect(res.sync.deleted).toBe(1);
      expect(res.sync.created).toBe(1);

      // Old occurrence was physically deleted
      const oldCheck = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      expect(oldCheck).toBeNull();

      // New occurrence exists on 2027-09-15
      const newCheck = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2027-09-15');
      expect(newCheck).not.toBeNull();
      expect(newCheck!.status).toBe('PENDING');
    });

    it('leaves terminal old occurrence permanently frozen and untouched', async () => {
      const def = await taskEngine.createTask({
        title: 'Completed Task Moved',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
      });

      await syncService.syncOccurrencesAfterCreate(def, validTemporalInputs);
      const oldOcc = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      await taskOccurrenceRepository.updateStatus(oldOcc!.id, 'COMPLETED');

      // Update definition date in Phase 1 (Move date to 2026-09-20)
      await taskEngine.updateEntireSeries(def.seriesId, { startDate: '2026-09-20' });

      const res = await syncService.reconcileNonRecurringMove(
        def.seriesId,
        '2026-09-15',
        '2026-09-20',
        validTemporalInputs
      );

      expect(res.issues).toHaveLength(0);
      expect(res.sync.deleted).toBe(0); // NOT deleted!

      // Old completed occurrence is still in DB with COMPLETED status
      const oldCheck = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-15');
      expect(oldCheck).not.toBeNull();
      expect(oldCheck!.status).toBe('COMPLETED');

      // New occurrence materialized on 2026-09-20
      const newCheck = await taskOccurrenceRepository.findBySeriesAndDate(def.seriesId, '2026-09-20');
      expect(newCheck).not.toBeNull();
      expect(newCheck!.status).toBe('PENDING');
    });
  });
});
