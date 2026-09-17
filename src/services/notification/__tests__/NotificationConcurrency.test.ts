import { NotificationReconciliationService } from '../NotificationReconciliationService';
import type { NotificationSchedulerAdapterAPI } from '../NotificationSchedulerAdapter';
import type { NotificationChannelManagerAPI } from '../NotificationChannelManager';
import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';

describe('NotificationReconciliationService Concurrency (Shared Drain)', () => {
  let mockOccRepo: any;
  let mockDefRepo: any;
  let mockAdapter: jest.Mocked<NotificationSchedulerAdapterAPI>;
  let mockChannelManager: jest.Mocked<NotificationChannelManagerAPI>;
  let clockTimeMs: number;
  let service: NotificationReconciliationService;

  const makeDef = (id: string, title: string): TaskDefinition => ({
    id,
    title,
    description: null,
    startDate: '2026-09-17',
    source: 'USER',
    worshipItemKey: null,
    scheduleType: 'EXACT_TIME',
    scheduleData: { localTime: '14:30' },
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

  const makeOcc = (id: string, defId: string, startTime = '2026-09-17T14:30:00.000Z'): TaskOccurrence => ({
    id,
    taskDefinitionId: defId,
    seriesId: `series-${defId}`,
    localDate: '2026-09-17',
    planningDayKey: '2026-09-17',
    timezone: 'UTC',
    calculatedStartTime: startTime,
    calculatedPrayerSection: 'DHUHR',
    eligiblePrayerSections: ['DHUHR'],
    wallClockResolution: 'NORMAL',
    windowStart: null,
    windowEnd: null,
    status: 'PENDING',
    completedAt: null,
    missedAt: null,
    overrideData: null,
  });

  beforeEach(() => {
    clockTimeMs = Date.parse('2026-09-17T12:00:00.000Z');

    mockOccRepo = {
      findAllMaterializedPending: jest.fn(),
    };

    mockDefRepo = {
      findById: jest.fn(),
    };

    mockAdapter = {
      getPermissionStatus: jest.fn().mockResolvedValue({ canSchedule: true, canRequest: false, status: 'AUTHORIZED' }),
      requestPermission: jest.fn().mockResolvedValue({ canSchedule: true, status: 'AUTHORIZED' }),
      scheduleNotification: jest.fn().mockImplementation(async d => d.identifier),
      cancelScheduledNotification: jest.fn().mockResolvedValue(undefined),
      getAllScheduledNotifications: jest.fn().mockResolvedValue([]),
    };

    mockChannelManager = {
      ensureChannel: jest.fn().mockResolvedValue(undefined),
    };

    service = new NotificationReconciliationService(
      mockOccRepo as any,
      mockDefRepo as any,
      mockAdapter,
      mockChannelManager,
      { nowMs: () => clockTimeMs }
    );
  });

  it('coalesces requests B and C during active pass A into a single rerun with latest state', async () => {
    let passCount = 0;
    let resolvePass1: () => void;
    const pass1Gate = new Promise<void>(res => {
      resolvePass1 = res;
    });

    mockOccRepo.findAllMaterializedPending!.mockImplementation(async () => {
      passCount++;
      if (passCount === 1) {
        // First pass hangs until B and C are requested
        await pass1Gate;
        return [makeOcc('occ-1', 'def-1')];
      }
      // Second pass sees updated state for B + C
      return [makeOcc('occ-1', 'def-1'), makeOcc('occ-2', 'def-2')];
    });

    mockDefRepo.findById!.mockImplementation(async (id: string) => makeDef(id, `Task ${id}`));

    // Caller A starts reconciliation
    const promiseA = service.reconcile();

    // Callers B and C request reconciliation while pass A is in-flight
    const promiseB = service.reconcile();
    const promiseC = service.reconcile();

    // Advance clock before release
    clockTimeMs += 5000;

    // Release pass 1
    resolvePass1!();

    // All callers A, B, C await completion
    const [resA, resB, resC] = await Promise.all([promiseA, promiseB, promiseC]);

    // Exactly 2 execution passes occur (pass 1, then one rerun for B+C)
    expect(passCount).toBe(2);

    // All callers resolve to the result of the final drain pass
    expect(resA).toBe(resC);
    expect(resB).toBe(resC);
    expect(resC.scheduled).toContain('task-reminder:occ-2:default');
  });

  it('ensures execution passes never overlap concurrently', async () => {
    let activePasses = 0;
    let maxConcurrentPasses = 0;

    mockOccRepo.findAllMaterializedPending!.mockImplementation(async () => {
      activePasses++;
      maxConcurrentPasses = Math.max(maxConcurrentPasses, activePasses);
      await new Promise(r => setTimeout(r, 10));
      activePasses--;
      return [];
    });

    const p1 = service.reconcile();
    const p2 = service.reconcile();
    const p3 = service.reconcile();

    await Promise.all([p1, p2, p3]);

    expect(maxConcurrentPasses).toBe(1);
    expect(activePasses).toBe(0);
  });

  it('resets drainPromise in finally block when executeReconcile throws an unexpected error (Safeguard 5)', async () => {
    // Pass 1 rejects unexpectedly
    jest.spyOn(service as any, 'executeReconcile').mockRejectedValueOnce(new Error('Fatal unhandled exception'));

    // Pass 1 should reject
    await expect(service.reconcile()).rejects.toThrow('Fatal unhandled exception');

    // Service must NOT remain wedged; subsequent reconcile call must start a fresh new drain
    mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([makeOcc('occ-recovery', 'def-recovery')]);
    mockDefRepo.findById!.mockResolvedValueOnce(makeDef('def-recovery', 'Recovery Task'));

    const recoveryResult = await service.reconcile();
    expect(recoveryResult.scheduled).toEqual(['task-reminder:occ-recovery:default']);
  });
});
