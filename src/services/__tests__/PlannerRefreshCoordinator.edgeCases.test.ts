import { DateTime } from 'luxon';
import { PlannerRefreshCoordinator } from '../PlannerRefreshCoordinator';
import type { TodayTemporalInputProvider, TodayTemporalInputs } from '../types';
import { widgetSyncCoordinator } from '../widget/WidgetSyncCoordinator';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';

describe('PlannerRefreshCoordinator Edge Cases (PRC-01 to PRC-09)', () => {
  const validInputs: TodayTemporalInputs = {
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
  };

  const now = DateTime.fromISO('2026-09-15T12:00:00', { zone: 'America/Chicago' });

  it('PRC-01: (UNIT) SETUP_REQUIRED on first step: returns SETUP_REQUIRED without running subsequent steps', async () => {
    const mockInputProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'SETUP_REQUIRED' }),
    };
    const mockTodayOrchestrator = { refreshToday: jest.fn() };
    const mockHorizonSync = { sync: jest.fn() };
    const mockLifecycle = { sweepExpired: jest.fn() };
    const mockNotification = { reconcile: jest.fn() };

    const coordinator = new PlannerRefreshCoordinator(
      mockInputProvider,
      mockTodayOrchestrator as any,
      mockHorizonSync as any,
      mockLifecycle as any,
      mockNotification as any
    );

    const result = await coordinator.fullRefresh(now);
    expect(result.status).toBe('SETUP_REQUIRED');
    expect(mockHorizonSync.sync).not.toHaveBeenCalled();
    expect(mockTodayOrchestrator.refreshToday).not.toHaveBeenCalled();
    expect(mockLifecycle.sweepExpired).not.toHaveBeenCalled();
    expect(mockNotification.reconcile).not.toHaveBeenCalled();
  });

  it('PRC-02: (UNIT) RecurringHorizonSync rejection propagates out; no downstream execution; ADR-031 Case A', async () => {
    const mockInputProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'READY', inputs: validInputs }),
    };
    const mockHorizonSync = {
      sync: jest.fn().mockRejectedValue(new Error('Recurrence sync DB crash')),
    };
    const mockTodayOrchestrator = {
      refreshToday: jest.fn(),
      queryAndProject: jest.fn(),
    };
    const mockLifecycle = { sweepExpired: jest.fn() };
    const mockNotification = { reconcile: jest.fn() };
    const widgetSpy = jest.spyOn(widgetSyncCoordinator, 'sync');

    const coordinator = new PlannerRefreshCoordinator(
      mockInputProvider,
      mockTodayOrchestrator as any,
      mockHorizonSync as any,
      mockLifecycle as any,
      mockNotification as any
    );

    // fullRefresh must REJECT and not catch the rejection internally
    await expect(coordinator.fullRefresh(now)).rejects.toThrow('Recurrence sync DB crash');

    // Downstream steps must NOT be invoked
    expect(mockTodayOrchestrator.refreshToday).not.toHaveBeenCalled();
    expect(mockLifecycle.sweepExpired).not.toHaveBeenCalled();
    expect(mockNotification.reconcile).not.toHaveBeenCalled();
    expect(widgetSpy).not.toHaveBeenCalled();

    widgetSpy.mockRestore();
  });

  it('PRC-03: (UNIT) TodayOrchestrator.refreshToday failure: propagates up', async () => {
    const mockInputProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'READY', inputs: validInputs }),
    };
    const mockHorizonSync = {
      sync: jest.fn().mockResolvedValue({ seriesProcessed: 1, created: 0, retained: 1, deleted: 0, issues: [] }),
    };
    const mockTodayOrchestrator = {
      refreshToday: jest.fn().mockRejectedValue(new Error('Orchestrator projection failed')),
    };
    const mockLifecycle = { sweepExpired: jest.fn() };
    const mockNotification = { reconcile: jest.fn() };

    const coordinator = new PlannerRefreshCoordinator(
      mockInputProvider,
      mockTodayOrchestrator as any,
      mockHorizonSync as any,
      mockLifecycle as any,
      mockNotification as any
    );

    await expect(coordinator.fullRefresh(now)).rejects.toThrow('Orchestrator projection failed');
    expect(mockLifecycle.sweepExpired).not.toHaveBeenCalled();
    expect(mockNotification.reconcile).not.toHaveBeenCalled();
  });

  it('PRC-04: (UNIT) Notification reconcile failure: fullRefresh returns READY (non-fatal)', async () => {
    const mockInputProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'READY', inputs: validInputs }),
    };
    const mockHorizonSync = {
      sync: jest.fn().mockResolvedValue({ seriesProcessed: 1, created: 0, retained: 1, deleted: 0, issues: [] }),
    };
    const mockTodayOrchestrator = {
      refreshToday: jest.fn().mockResolvedValue({
        viewModel: { currentPrayer: 'DHUHR', items: [] },
        runtime: { planningDayKey: '2026-09-15' },
      }),
    };
    const mockLifecycle = {
      sweepExpired: jest.fn().mockResolvedValue({ mutatedCount: 0, evaluatedCount: 1, expiredCount: 0, errors: [] }),
    };
    const mockNotification = {
      reconcile: jest.fn().mockRejectedValue(new Error('Notification permission revoked')),
    };

    const coordinator = new PlannerRefreshCoordinator(
      mockInputProvider,
      mockTodayOrchestrator as any,
      mockHorizonSync as any,
      mockLifecycle as any,
      mockNotification as any
    );

    const result = await coordinator.fullRefresh(now);
    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.viewModel.currentPrayer).toBe('DHUHR');
    }
  });

  it('PRC-05: (UNIT) Widget sync failure: fullRefresh returns READY (non-fatal, fire-and-forget)', async () => {
    const mockInputProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'READY', inputs: validInputs }),
    };
    const mockHorizonSync = {
      sync: jest.fn().mockResolvedValue({ seriesProcessed: 1, created: 0, retained: 1, deleted: 0, issues: [] }),
    };
    const mockTodayOrchestrator = {
      refreshToday: jest.fn().mockResolvedValue({
        viewModel: { currentPrayer: 'DHUHR', items: [] },
        runtime: { planningDayKey: '2026-09-15' },
      }),
    };
    const mockLifecycle = {
      sweepExpired: jest.fn().mockResolvedValue({ mutatedCount: 0 }),
    };
    const mockNotification = {
      reconcile: jest.fn().mockResolvedValue({ scheduled: [], cancelled: [] }),
    };

    const widgetSpy = jest.spyOn(widgetSyncCoordinator, 'sync').mockRejectedValue(new Error('Widget storage error'));

    const coordinator = new PlannerRefreshCoordinator(
      mockInputProvider,
      mockTodayOrchestrator as any,
      mockHorizonSync as any,
      mockLifecycle as any,
      mockNotification as any
    );

    const result = await coordinator.fullRefresh(now);
    expect(result.status).toBe('READY');
    widgetSpy.mockRestore();
  });

  describe('PRC-06: (INTEGRATION) Repeated rapid fullRefresh', () => {
    beforeEach(() => {
      createTestDatabase();
    });

    afterEach(() => {
      cleanupTestDatabase();
    });

    it('PRC-06: Repeated rapid fullRefresh: second call returns fresh result; no duplicate occurrences in DB', async () => {
      const engine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
      await engine.createTask({
        title: 'Recurring Rapid Task',
        startDate: '2026-09-15',
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: {},
        recurrenceRule: 'FREQ=DAILY',
      });

      const mockInputProvider: TodayTemporalInputProvider = {
        getInputs: jest.fn().mockResolvedValue({ status: 'READY', inputs: validInputs }),
      };

      const coordinator = new PlannerRefreshCoordinator(mockInputProvider);

      // Run two fullRefresh calls in rapid succession
      const [res1, res2] = await Promise.all([
        coordinator.fullRefresh(now),
        coordinator.fullRefresh(now),
      ]);

      expect(res1.status).toBe('READY');
      expect(res2.status).toBe('READY');

      // Check occurrences in DB for planningDayKey 2026-09-15: exactly 1 occurrence created
      const occurrences = await taskOccurrenceRepository.findTodayCandidates('2026-09-15', '2026-09-15T12:00:00.000Z');
      expect(occurrences).toHaveLength(1);
    });
  });

  it('PRC-07: (UNIT) Lifecycle sweep mutates 0 rows: reuses refreshToday viewModel (no second DB query)', async () => {
    const initialVm = { currentPrayer: 'DHUHR', items: [] };
    const mockInputProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'READY', inputs: validInputs }),
    };
    const mockHorizonSync = {
      sync: jest.fn().mockResolvedValue({ seriesProcessed: 1, created: 0, retained: 1, deleted: 0, issues: [] }),
    };
    const mockTodayOrchestrator = {
      refreshToday: jest.fn().mockResolvedValue({
        viewModel: initialVm,
        runtime: { planningDayKey: '2026-09-15' },
      }),
      queryAndProject: jest.fn(),
    };
    const mockLifecycle = {
      sweepExpired: jest.fn().mockResolvedValue({ mutatedCount: 0 }),
    };
    const mockNotification = {
      reconcile: jest.fn().mockResolvedValue({}),
    };

    const coordinator = new PlannerRefreshCoordinator(
      mockInputProvider,
      mockTodayOrchestrator as any,
      mockHorizonSync as any,
      mockLifecycle as any,
      mockNotification as any
    );

    const result = await coordinator.fullRefresh(now);
    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.viewModel).toBe(initialVm); // exact reference preserved
    }
    expect(mockTodayOrchestrator.queryAndProject).not.toHaveBeenCalled();
  });

  it('PRC-08: (UNIT) Lifecycle sweep mutates >= 1 row: fires queryAndProject', async () => {
    const reprojectedVm = { currentPrayer: 'DHUHR', items: [{ id: 'occ-1', status: 'MISSED' }] };
    const mockInputProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'READY', inputs: validInputs }),
    };
    const mockHorizonSync = {
      sync: jest.fn().mockResolvedValue({ seriesProcessed: 1, created: 0, retained: 1, deleted: 0, issues: [] }),
    };
    const mockTodayOrchestrator = {
      refreshToday: jest.fn().mockResolvedValue({
        viewModel: { currentPrayer: 'DHUHR', items: [] },
        runtime: { planningDayKey: '2026-09-15' },
      }),
      queryAndProject: jest.fn().mockResolvedValue(reprojectedVm),
    };
    const mockLifecycle = {
      sweepExpired: jest.fn().mockResolvedValue({ mutatedCount: 1, expiredCount: 1 }),
    };
    const mockNotification = {
      reconcile: jest.fn().mockResolvedValue({}),
    };

    const coordinator = new PlannerRefreshCoordinator(
      mockInputProvider,
      mockTodayOrchestrator as any,
      mockHorizonSync as any,
      mockLifecycle as any,
      mockNotification as any
    );

    const result = await coordinator.fullRefresh(now);
    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.viewModel).toBe(reprojectedVm);
    }
    expect(mockTodayOrchestrator.queryAndProject).toHaveBeenCalledTimes(1);
  });

  it('PRC-09: (UNIT) RecurringHorizonSync resolves with SyncIssue entries: coordinator does NOT abort; ADR-031 Case B', async () => {
    const resolvedWithIssues = {
      seriesProcessed: 2,
      created: 1,
      retained: 2,
      deleted: 0,
      issues: [
        {
          stage: 'MATERIALIZE' as const,
          seriesId: 'series-x',
          seedDate: '2026-09-20',
          message: 'Extreme offset insufficient timeline',
        },
      ],
    };

    const mockInputProvider: TodayTemporalInputProvider = {
      getInputs: jest.fn().mockResolvedValue({ status: 'READY', inputs: validInputs }),
    };
    const mockHorizonSync = {
      sync: jest.fn().mockResolvedValue(resolvedWithIssues),
    };
    const mockTodayOrchestrator = {
      refreshToday: jest.fn().mockResolvedValue({
        viewModel: { currentPrayer: 'DHUHR', items: [] },
        runtime: { planningDayKey: '2026-09-15' },
      }),
    };
    const mockLifecycle = {
      sweepExpired: jest.fn().mockResolvedValue({ mutatedCount: 0 }),
    };
    const mockNotification = {
      reconcile: jest.fn().mockResolvedValue({ scheduled: [] }),
    };

    const coordinator = new PlannerRefreshCoordinator(
      mockInputProvider,
      mockTodayOrchestrator as any,
      mockHorizonSync as any,
      mockLifecycle as any,
      mockNotification as any
    );

    const result = await coordinator.fullRefresh(now);
    // ADR-031 Case B: issues array is NOT an exception; fullRefresh does NOT throw; returns READY
    expect(result.status).toBe('READY');
    if (result.status === 'READY') {
      expect(result.horizonSync).toEqual(resolvedWithIssues);
      expect(result.horizonSync.issues).toHaveLength(1);
      expect(result.horizonSync.issues[0].message).toContain('Extreme offset');
    }

    // Downstream normal pipeline continued
    expect(mockTodayOrchestrator.refreshToday).toHaveBeenCalled();
    expect(mockLifecycle.sweepExpired).toHaveBeenCalled();
    expect(mockNotification.reconcile).toHaveBeenCalled();
  });
});
