import { PlannerRefreshCoordinator } from '../PlannerRefreshCoordinator';
import { useTodayStore } from '@/stores/useTodayStore';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import type { TodayTemporalInputProvider, TodayTemporalInputs } from '../types';
import { DateTime } from 'luxon';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { TaskEngine } from '@/domain/task/TaskEngine';

describe('PlannerRefreshCoordinator & M7 Store Generation Concurrency (M10 §41)', () => {
  let taskEngine: TaskEngine;

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

    // Reset store state
    useTodayStore.getState().reset();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('runs fullRefresh and returns READY with viewModel and horizonSync', async () => {
    // Create a task
    await taskEngine.createTask({
      title: 'Coordinator Task',
      startDate: '2026-09-15',
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      recurrenceRule: 'FREQ=DAILY',
    });

    const mockProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({
        status: 'READY',
        inputs: validTemporalInputs,
      }),
    };

    const coordinator = new PlannerRefreshCoordinator(mockProvider);
    const result = await coordinator.fullRefresh(DateTime.fromISO('2026-09-15T12:00:00', { zone: 'America/New_York' }));

    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.viewModel).toBeDefined();
      expect(result.runtime).toBeDefined();
      expect(result.horizonSync).toBeDefined();
      expect(result.horizonSync.created).toBeGreaterThan(0);
    }
  });

  it('returns SETUP_REQUIRED when temporal inputs are missing', async () => {
    const setupReqProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'SETUP_REQUIRED' }),
    };

    const coordinator = new PlannerRefreshCoordinator(setupReqProvider);
    const result = await coordinator.fullRefresh();
    expect(result.status).toBe('SETUP_REQUIRED');
  });

  describe('M7 Store Generation Token & Stale Result Protection', () => {
    it('preserves existing M7 store API methods and signatures without changes', () => {
      const state = useTodayStore.getState();
      expect(typeof state.startRefresh).toBe('function');
      expect(typeof state.commitRefresh).toBe('function');
      expect(typeof state.setSetupRequired).toBe('function');
      expect(typeof state.setError).toBe('function');
    });

    it('rejects stale refresh result when newer refresh completes first', async () => {
      // 1. Refresh A begins: token = 1
      const tokenA = useTodayStore.getState().startRefresh();
      expect(tokenA).toBe(1);

      // 2. Refresh B begins later: token = 2
      const tokenB = useTodayStore.getState().startRefresh();
      expect(tokenB).toBe(2);

      const mockVmB: any = { currentPrayer: 'DHUHR', tabs: [] };
      const mockVmA: any = { currentPrayer: 'FAJR', tabs: [] };

      // 3. Refresh B finishes first and commits
      const committedB = useTodayStore.getState().commitRefresh(
        tokenB,
        { viewModel: mockVmB, runtime: {} as any },
        false
      );
      expect(committedB).toBe(true);
      expect(useTodayStore.getState().viewModel?.currentPrayer).toBe('DHUHR');

      // 4. Stale Refresh A finishes and tries to commit
      const committedA = useTodayStore.getState().commitRefresh(
        tokenA,
        { viewModel: mockVmA, runtime: {} as any },
        false
      );
      expect(committedA).toBe(false); // Rejected!
      // State retains B's viewModel
      expect(useTodayStore.getState().viewModel?.currentPrayer).toBe('DHUHR');
    });

    it('setSetupRequired increments generation token and invalidates in-flight READY commit', () => {
      const token = useTodayStore.getState().startRefresh();
      expect(token).toBe(1);

      // setSetupRequired is called
      useTodayStore.getState().setSetupRequired(token);
      expect(useTodayStore.getState().status).toBe('setup_required');

      // Subsequent commit with old token is rejected
      const mockVm: any = { currentPrayer: 'ASR', tabs: [] };
      const committed = useTodayStore.getState().commitRefresh(
        token,
        { viewModel: mockVm, runtime: {} as any },
        false
      );
      expect(committed).toBe(false);
      expect(useTodayStore.getState().status).toBe('setup_required');
    });
  });
});
