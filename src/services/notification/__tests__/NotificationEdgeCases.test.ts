import { renderHook, act } from '@testing-library/react-native';
import { NotificationReconciliationService } from '../NotificationReconciliationService';
import type { NotificationSchedulerAdapterAPI } from '../NotificationSchedulerAdapter';
import type { NotificationChannelManagerAPI } from '../NotificationChannelManager';
import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';
import type { ScheduledNotificationSnapshot } from '@/domain/notification/types';
import { useToday } from '@/hooks/useToday';

describe('NotificationEdgeCases (NE-01 to NE-07)', () => {
  let mockOccRepo: any;
  let mockDefRepo: any;
  let mockAdapter: jest.Mocked<NotificationSchedulerAdapterAPI>;
  let mockChannelManager: jest.Mocked<NotificationChannelManagerAPI>;
  let scheduledMap: Map<string, ScheduledNotificationSnapshot>;
  let currentTimeMs: number;
  let service: NotificationReconciliationService;

  const makeDef = (id: string, title: string): TaskDefinition => ({
    id,
    title,
    description: null,
    startDate: '2026-09-17',
    source: 'USER',
    worshipItemKey: null,
    scheduleType: 'EXACT_TIME',
    scheduleData: { localTime: '14:30' } as any,
    recurrenceRule: null,
    hijriRecurrence: null,
    recurrenceEnd: null,
    seriesId: `series-${id}`,
    seriesVersion: 1,
    effectiveFromDate: null,
    effectiveToDate: null,
    reminderRule: { offsetMinutes: 0 },
    priority: 'NORMAL',
    estimatedMinutes: 30,
    notes: null,
    tags: [],
    subtasks: [],
    isActive: true,
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
  });

  const makeOcc = (
    id: string,
    defId: string,
    status: TaskOccurrence['status'] = 'PENDING'
  ): TaskOccurrence => ({
    id,
    taskDefinitionId: defId,
    seriesId: `series-${defId}`,
    localDate: '2026-09-17',
    planningDayKey: '2026-09-17',
    timezone: 'UTC',
    calculatedStartTime: '2026-09-17T14:30:00.000Z',
    calculatedPrayerSection: 'DHUHR',
    eligiblePrayerSections: ['DHUHR'],
    wallClockResolution: 'NORMAL',
    windowStart: null,
    windowEnd: null,
    status,
    completedAt: status === 'COMPLETED' ? '2026-09-17T13:00:00.000Z' : null,
    missedAt: null,
    overrideData: null,
  });

  beforeEach(() => {
    currentTimeMs = Date.parse('2026-09-17T12:00:00.000Z');
    scheduledMap = new Map();

    mockOccRepo = {
      findAllMaterializedPending: jest.fn().mockResolvedValue([]),
    };

    mockDefRepo = {
      findById: jest.fn(),
    };

    mockAdapter = {
      getPermissionStatus: jest.fn().mockResolvedValue({ canSchedule: true, canRequest: false, status: 'AUTHORIZED' }),
      requestPermission: jest.fn().mockResolvedValue({ canSchedule: true, status: 'AUTHORIZED' }),
      scheduleNotification: jest.fn().mockImplementation(async d => {
        scheduledMap.set(d.identifier, {
          identifier: d.identifier,
          title: d.title,
          triggerAtMs: d.triggerAtMs,
        });
        return d.identifier;
      }),
      cancelScheduledNotification: jest.fn().mockImplementation(async id => {
        scheduledMap.delete(id);
      }),
      scheduleDailyNotification: jest.fn().mockResolvedValue(undefined),
      getAllScheduledNotifications: jest.fn().mockImplementation(async () => Array.from(scheduledMap.values())),
    };

    mockChannelManager = {
      ensureChannel: jest.fn().mockResolvedValue(undefined),
      getTaskChannelId: jest.fn().mockReturnValue('task-reminders-v2-vib'),
      getPrayerChannelId: jest.fn().mockReturnValue('prayer-alerts-v2-vib'),
      getJournalChannelId: jest.fn().mockReturnValue('journal-reminders-v2'),
    };

    service = new NotificationReconciliationService(
      mockOccRepo as any,
      mockDefRepo as any,
      mockAdapter,
      mockChannelManager,
      { nowMs: () => currentTimeMs }
    );
  });

  it('NE-01: Terminal task (already COMPLETED before reconcile starts): no notification scheduled after reconcile', async () => {
    // Only pending occurrences are returned by repo
    mockOccRepo.findAllMaterializedPending.mockResolvedValueOnce([]);

    const result = await service.reconcile();
    expect(result.scheduled).toHaveLength(0);
    expect(mockAdapter.scheduleNotification).not.toHaveBeenCalled();
  });

  it('NE-02: Permission denied: reconcile returns without scheduling; no throw', async () => {
    mockAdapter.getPermissionStatus.mockResolvedValueOnce({
      canSchedule: false,
      canRequest: false,
      status: 'DENIED',
    });
    mockOccRepo.findAllMaterializedPending.mockResolvedValueOnce([makeOcc('occ-1', 'def-1')]);

    await expect(service.reconcile()).resolves.not.toThrow();
    expect(mockAdapter.scheduleNotification).not.toHaveBeenCalled();
  });

  it('NE-03: Permission revoked between two reconcile calls: second call handles gracefully', async () => {
    // First reconcile: permission granted
    mockOccRepo.findAllMaterializedPending.mockResolvedValueOnce([makeOcc('occ-1', 'def-1')]);
    mockDefRepo.findById.mockResolvedValueOnce(makeDef('def-1', 'Task 1'));
    await service.reconcile();
    expect(scheduledMap.size).toBe(1);

    // Second reconcile: permission revoked
    mockAdapter.getPermissionStatus.mockResolvedValueOnce({
      canSchedule: false,
      canRequest: false,
      status: 'DENIED',
    });

    await expect(service.reconcile()).resolves.not.toThrow();
  });

  it('NE-04: Empty PENDING set: reconcile cancels all existing app-owned notifications', async () => {
    // Populate an existing scheduled reminder
    scheduledMap.set('task-reminder:occ-old:default', {
      identifier: 'task-reminder:occ-old:default',
      title: 'Old Task',
      triggerAtMs: currentTimeMs + 3600000,
    });

    mockOccRepo.findAllMaterializedPending.mockResolvedValueOnce([]);
    const result = await service.reconcile();

    expect(result.cancelled).toEqual(['task-reminder:occ-old:default']);
    expect(scheduledMap.has('task-reminder:occ-old:default')).toBe(false);
  });

  it('NE-05: Concurrent reconcile calls: drain loop coalesces; no duplicate notifications scheduled', async () => {
    const occ = makeOcc('occ-1', 'def-1');
    const def = makeDef('def-1', 'Task 1');
    mockOccRepo.findAllMaterializedPending.mockResolvedValue([occ]);
    mockDefRepo.findById.mockResolvedValue(def);

    // Fire two reconcile calls concurrently
    await Promise.all([service.reconcile(), service.reconcile()]);

    // Drain loop coalesces into 1 execution pass + 1 follow-up rerun
    // Final scheduled count in OS adapter is exactly 1 (no duplicate)
    expect(scheduledMap.size).toBe(1);
    expect(scheduledMap.has('task-reminder:occ-1:default')).toBe(true);
  });

  it('NE-06: Partial scheduling failure: next reconcile re-schedules missing notifications', async () => {
    const occ1 = makeOcc('occ-1', 'def-1');
    const def1 = makeDef('def-1', 'Task 1');
    mockOccRepo.findAllMaterializedPending.mockResolvedValue([occ1]);
    mockDefRepo.findById.mockResolvedValue(def1);

    // Inject temporary failure on first schedule attempt
    mockAdapter.scheduleNotification.mockRejectedValueOnce(new Error('OS AlarmManager unavailable'));

    const failResult = await service.reconcile();
    expect(failResult.failed).toHaveLength(1);
    expect(scheduledMap.size).toBe(0);

    // Next reconcile resolves without error and successfully schedules
    const retryResult = await service.reconcile();
    expect(retryResult.scheduled).toEqual(['task-reminder:occ-1:default']);
    expect(scheduledMap.size).toBe(1);
  });

  it('NE-07: Terminal transition path requests follow-up reconcile: drain loop clears stale notification after race', async () => {
    const occ = makeOcc('occ-race-1', 'def-race-1', 'PENDING');
    const def = makeDef('def-race-1', 'Race Task');
    let currentStatus: TaskOccurrence['status'] = 'PENDING';

    mockOccRepo.findAllMaterializedPending.mockImplementation(async () => {
      if (currentStatus === 'PENDING') {
        return [occ];
      }
      return [];
    });
    mockDefRepo.findById.mockResolvedValue(def);

    // Hook up useToday with engine and notificationService
    const mockEngine = {
      completeTask: jest.fn().mockImplementation(async (id: string) => {
        currentStatus = 'COMPLETED';
        return makeOcc(id, 'def-race-1', 'COMPLETED');
      }),
    };

    const mockOrchestrator = {
      queryAndProject: jest.fn().mockResolvedValue({ currentPrayer: 'DHUHR', items: [] } as any),
      refreshToday: jest.fn().mockResolvedValue({
        viewModel: { currentPrayer: 'DHUHR', items: [] },
        runtime: { planningDayKey: '2026-09-17' },
      } as any),
    };

    const mockCoordinator = {
      fullRefresh: jest.fn().mockResolvedValue({
        status: 'READY',
        viewModel: { currentPrayer: 'DHUHR', items: [] },
        runtime: { planningDayKey: '2026-09-17' },
        horizonSync: { status: 'SUCCESS' },
      }),
    };

    const mockInputProvider = {
      getInputs: jest.fn().mockResolvedValue({
        status: 'READY',
        inputs: {
          coordinates: { latitude: 21.42, longitude: 39.82 },
          params: { timezone: 'Asia/Riyadh' },
          planningDayConfig: { mode: 'FAJR' },
        },
      }),
    };

    const { result } = await renderHook(() =>
      useToday({
        engine: mockEngine as any,
        orchestrator: mockOrchestrator as any,
        coordinator: mockCoordinator as any,
        inputProvider: mockInputProvider,
        lifecycleService: { sweepExpired: jest.fn().mockResolvedValue({ mutatedCount: 0 }) } as any,
        notificationService: service,
        enableTimer: false,
      })
    );

    // 1. Reconcile begins and snapshots occurrence as PENDING
    // Delay scheduleNotification to force race window: task completion happens BEFORE scheduling completes
    let finishFirstSchedule: () => void = () => {};
    const scheduleBlockedPromise = new Promise<void>(resolve => {
      finishFirstSchedule = resolve;
    });

    mockAdapter.scheduleNotification.mockImplementationOnce(async d => {
      await scheduleBlockedPromise;
      scheduledMap.set(d.identifier, {
        identifier: d.identifier,
        title: d.title,
        triggerAtMs: d.triggerAtMs,
      });
      return d.identifier;
    });

    const inFlightReconcile = service.reconcile();

    // 2. While in flight, task is completed through production useToday.completeTask
    // 3. Targeted cancel runs (and finds nothing yet because scheduleNotification is still blocked)
    // 4. completeTask chains best-effort follow-up reconcile request
    let completePromise: Promise<void>;
    await act(async () => {
      completePromise = result.current.completeTask('occ-race-1');
    });

    // 5. Unblock stale first schedule so Pass 1 completes (writing stale notification)
    finishFirstSchedule();
    await inFlightReconcile;

    // 6. Await completion of completeTask and its chained follow-up reconcile pass
    await act(async () => {
      await completePromise!;
      // Give async follow-up drain loop microtask a cycle to settle
      await new Promise(r => setTimeout(r, 50));
    });

    // 7. Final state in OS adapter: NO notification for occ-race-1!
    expect(scheduledMap.has('task-reminder:occ-race-1:default')).toBe(false);
    expect(scheduledMap.size).toBe(0);
  });
});
