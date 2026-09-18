import { renderHook, act } from '@testing-library/react-native';
import { useToday } from '../useToday';
import type { TaskEngine } from '@/domain/task/TaskEngine';
import type { TodayOrchestrator } from '@/services/TodayOrchestrator';
import type { OccurrenceLifecycleService } from '@/services/OccurrenceLifecycleService';
import { widgetSyncCoordinator } from '@/services/widget/WidgetSyncCoordinator';

describe('useToday Notification Integrations', () => {
  let mockEngine: jest.Mocked<Partial<TaskEngine>>;
  let mockOrchestrator: jest.Mocked<Partial<TodayOrchestrator>>;
  let mockLifecycle: jest.Mocked<Partial<OccurrenceLifecycleService>>;
  let mockNotificationService: any;
  let mockInputProvider: any;
  let mockCoordinator: any;

  beforeEach(() => {
    mockEngine = {
      completeTask: jest.fn().mockResolvedValue({} as any),
    };

    mockOrchestrator = {
      queryAndProject: jest.fn().mockResolvedValue({ currentPrayer: 'DHUHR', items: [] } as any),
      refreshToday: jest.fn().mockResolvedValue({
        viewModel: { currentPrayer: 'DHUHR', items: [] },
        runtime: { planningDayKey: '2026-09-17' },
      } as any),
    };

    mockLifecycle = {
      sweepExpired: jest.fn().mockResolvedValue({ mutatedCount: 0, evaluatedCount: 1, expiredCount: 0, errors: [] }),
    };

    mockNotificationService = {
      reconcile: jest.fn().mockResolvedValue({
        scheduled: [],
        cancelled: [],
        unchanged: [],
        skippedPast: [],
        skippedCapacity: [],
        failed: [],
      }),
      cancelOccurrenceReminder: jest.fn().mockResolvedValue(undefined),
    };

    mockInputProvider = {
      getInputs: jest.fn().mockResolvedValue({
        status: 'READY',
        inputs: {
          coordinates: { latitude: 21.42, longitude: 39.82 },
          params: { timezone: 'Asia/Riyadh' },
          planningDayConfig: { type: 'FAJR' },
        },
      }),
    };

    mockCoordinator = {
      fullRefresh: jest.fn().mockResolvedValue({
        status: 'READY',
        viewModel: { currentPrayer: 'DHUHR', items: [] },
        runtime: { planningDayKey: '2026-09-17' },
        horizonSync: { status: 'SUCCESS' },
      }),
    };
  });

  it('invokes cancelOccurrenceReminder upon task completion', async () => {
    const { result } = await renderHook(() =>
      useToday({
        engine: mockEngine as any,
        orchestrator: mockOrchestrator as any,
        coordinator: mockCoordinator as any,
        inputProvider: mockInputProvider,
        lifecycleService: mockLifecycle as any,
        notificationService: mockNotificationService as any,
        enableTimer: false,
      })
    );

    await act(async () => {
      await result.current.completeTask('occ-completed-1');
    });

    expect(mockEngine.completeTask).toHaveBeenCalledWith('occ-completed-1');
    expect(mockNotificationService.cancelOccurrenceReminder).toHaveBeenCalledWith('occ-completed-1');
  });

  it('preserves task completion success even if cancelOccurrenceReminder rejects', async () => {
    mockNotificationService.cancelOccurrenceReminder!.mockRejectedValueOnce(new Error('OS cancel failed'));

    const { result } = await renderHook(() =>
      useToday({
        engine: mockEngine as any,
        orchestrator: mockOrchestrator as any,
        coordinator: mockCoordinator as any,
        inputProvider: mockInputProvider,
        lifecycleService: mockLifecycle as any,
        notificationService: mockNotificationService as any,
        enableTimer: false,
      })
    );

    await act(async () => {
      await expect(result.current.completeTask('occ-completed-2')).resolves.not.toThrow();
    });

    expect(mockEngine.completeTask).toHaveBeenCalledWith('occ-completed-2');
  });

  it('triggers widget sync upon successful task completion', async () => {
    const syncSpy = jest.spyOn(widgetSyncCoordinator, 'sync').mockResolvedValue(undefined);

    const { result } = await renderHook(() =>
      useToday({
        engine: mockEngine as any,
        orchestrator: mockOrchestrator as any,
        coordinator: mockCoordinator as any,
        inputProvider: mockInputProvider,
        lifecycleService: mockLifecycle as any,
        notificationService: mockNotificationService as any,
        enableTimer: false,
      })
    );

    await act(async () => {
      await result.current.completeTask('occ-completed-widget');
    });

    expect(mockEngine.completeTask).toHaveBeenCalledWith('occ-completed-widget');
    expect(syncSpy).toHaveBeenCalled();
    syncSpy.mockRestore();
  });

  it('preserves task completion success even if widget sync rejects', async () => {
    const syncSpy = jest.spyOn(widgetSyncCoordinator, 'sync').mockRejectedValue(new Error('Widget sync explosion'));

    const { result } = await renderHook(() =>
      useToday({
        engine: mockEngine as any,
        orchestrator: mockOrchestrator as any,
        coordinator: mockCoordinator as any,
        inputProvider: mockInputProvider,
        lifecycleService: mockLifecycle as any,
        notificationService: mockNotificationService as any,
        enableTimer: false,
      })
    );

    await act(async () => {
      await expect(result.current.completeTask('occ-completed-widget-err')).resolves.not.toThrow();
    });

    expect(mockEngine.completeTask).toHaveBeenCalledWith('occ-completed-widget-err');
    syncSpy.mockRestore();
  });
});
