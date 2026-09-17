import { NotificationReconciliationService } from '../NotificationReconciliationService';
import type { NotificationSchedulerAdapterAPI } from '../NotificationSchedulerAdapter';
import type { NotificationChannelManagerAPI } from '../NotificationChannelManager';
import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_DEFAULT_SLOT,
  NOTIFICATION_PAYLOAD_VERSION,
  type ScheduledNotificationSnapshot,
} from '@/domain/notification/types';

describe('NotificationReconciliationService', () => {
  let mockOccRepo: any;
  let mockDefRepo: any;
  let mockAdapter: jest.Mocked<NotificationSchedulerAdapterAPI>;
  let mockChannelManager: jest.Mocked<NotificationChannelManagerAPI>;
  let currentTimeMs: number;
  let service: NotificationReconciliationService;

  const makeDef = (id: string, title: string, scheduleType = 'EXACT_TIME', offsetMinutes = 0): TaskDefinition => ({
    id,
    title,
    description: null,
    startDate: '2026-09-17',
    source: 'USER',
    worshipItemKey: null,
    scheduleType: scheduleType as any,
    scheduleData: { localTime: '14:30' } as any,
    recurrenceRule: null,
    hijriRecurrence: null,
    recurrenceEnd: null,
    seriesId: `series-${id}`,
    seriesVersion: 1,
    effectiveFromDate: null,
    effectiveToDate: null,
    reminderRule: { offsetMinutes },
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
    startTime = '2026-09-17T14:30:00.000Z',
    status: TaskOccurrence['status'] = 'PENDING'
  ): TaskOccurrence => ({
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
    status,
    completedAt: null,
    missedAt: null,
    overrideData: null,
  });

  beforeEach(() => {
    currentTimeMs = Date.parse('2026-09-17T12:00:00.000Z');

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
      { nowMs: () => currentTimeMs }
    );
  });

  describe('Fresh Repository Queries & Data Ownership', () => {
    it('queries repositories at execution time without caller passing state', async () => {
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([makeOcc('occ-1', 'def-1')]);
      mockDefRepo.findById!.mockResolvedValueOnce(makeDef('def-1', 'Task 1'));

      const result = await service.reconcile();

      expect(mockOccRepo.findAllMaterializedPending).toHaveBeenCalledTimes(1);
      expect(mockDefRepo.findById).toHaveBeenCalledWith('def-1');
      expect(result.scheduled).toEqual(['task-reminder:occ-1:default']);
      expect(mockAdapter.scheduleNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('Diffing & Reconciliation Invariants', () => {
    it('schedules desired notification on first reconcile', async () => {
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([makeOcc('occ-1', 'def-1')]);
      mockDefRepo.findById!.mockResolvedValueOnce(makeDef('def-1', 'Task 1'));
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([]);

      const result = await service.reconcile();

      expect(result.scheduled).toEqual(['task-reminder:occ-1:default']);
      expect(result.unchanged).toHaveLength(0);
      expect(result.cancelled).toHaveLength(0);
    });

    it('leaves identical scheduled notification unchanged without duplicate scheduling', async () => {
      const occ = makeOcc('occ-1', 'def-1');
      const def = makeDef('def-1', 'Task 1');
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([occ]);
      mockDefRepo.findById!.mockResolvedValueOnce(def);

      const triggerAtMs = Date.parse(occ.calculatedStartTime!);
      const existingSnapshot: ScheduledNotificationSnapshot = {
        identifier: 'task-reminder:occ-1:default',
        title: 'Task 1',
        triggerAtMs,
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId: 'occ-1',
          taskDefinitionId: 'def-1',
          reminderSlot: NOTIFICATION_DEFAULT_SLOT,
          triggerAtMs,
          payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
        },
      };
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([existingSnapshot]);

      const result = await service.reconcile();

      expect(result.unchanged).toEqual(['task-reminder:occ-1:default']);
      expect(result.scheduled).toHaveLength(0);
      expect(result.cancelled).toHaveLength(0);
      expect(mockAdapter.scheduleNotification).not.toHaveBeenCalled();
    });

    it('recreates missing desired notification when OS scheduled list is empty', async () => {
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([makeOcc('occ-1', 'def-1')]);
      mockDefRepo.findById!.mockResolvedValueOnce(makeDef('def-1', 'Task 1'));
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([]);

      const result = await service.reconcile();

      expect(result.scheduled).toEqual(['task-reminder:occ-1:default']);
      expect(mockAdapter.scheduleNotification).toHaveBeenCalledTimes(1);
    });

    it('cancels stale OS notification that no longer has an eligible task', async () => {
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([]);
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([
        {
          identifier: 'task-reminder:occ-stale:default',
          title: 'Stale Task',
          triggerAtMs: currentTimeMs + 10000,
        },
        {
          identifier: 'other-app:do-not-touch',
          title: 'Unrelated App',
          triggerAtMs: currentTimeMs + 10000,
        },
      ]);

      const result = await service.reconcile();

      expect(result.cancelled).toEqual(['task-reminder:occ-stale:default']);
      expect(mockAdapter.cancelScheduledNotification).toHaveBeenCalledWith('task-reminder:occ-stale:default');
      expect(mockAdapter.cancelScheduledNotification).not.toHaveBeenCalledWith('other-app:do-not-touch');
    });

    it('cancels old and schedules new when trigger instant changes', async () => {
      const occ = makeOcc('occ-1', 'def-1', '2026-09-17T15:00:00.000Z');
      const def = makeDef('def-1', 'Task 1');
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([occ]);
      mockDefRepo.findById!.mockResolvedValueOnce(def);

      const oldSnapshot: ScheduledNotificationSnapshot = {
        identifier: 'task-reminder:occ-1:default',
        title: 'Task 1',
        triggerAtMs: Date.parse('2026-09-17T14:30:00.000Z'), // different time
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId: 'occ-1',
          taskDefinitionId: 'def-1',
          reminderSlot: NOTIFICATION_DEFAULT_SLOT,
          triggerAtMs: Date.parse('2026-09-17T14:30:00.000Z'),
          payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
        },
      };
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([oldSnapshot]);

      const result = await service.reconcile();

      expect(mockAdapter.cancelScheduledNotification).toHaveBeenCalledWith('task-reminder:occ-1:default');
      expect(mockAdapter.scheduleNotification).toHaveBeenCalledTimes(1);
      expect(result.scheduled).toEqual(['task-reminder:occ-1:default']);
    });

    it('replaces notification when title changes even if trigger is identical', async () => {
      const occ = makeOcc('occ-1', 'def-1');
      const def = makeDef('def-1', 'New Updated Title');
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([occ]);
      mockDefRepo.findById!.mockResolvedValueOnce(def);

      const triggerAtMs = Date.parse(occ.calculatedStartTime!);
      const oldSnapshot: ScheduledNotificationSnapshot = {
        identifier: 'task-reminder:occ-1:default',
        title: 'Old Title',
        triggerAtMs,
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId: 'occ-1',
          taskDefinitionId: 'def-1',
          reminderSlot: NOTIFICATION_DEFAULT_SLOT,
          triggerAtMs,
          payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
        },
      };
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([oldSnapshot]);

      const result = await service.reconcile();

      expect(mockAdapter.cancelScheduledNotification).toHaveBeenCalledWith('task-reminder:occ-1:default');
      expect(mockAdapter.scheduleNotification).toHaveBeenCalledTimes(1);
      expect(result.scheduled).toEqual(['task-reminder:occ-1:default']);
    });

    it('replaces notification when payloadVersion is stale', async () => {
      const occ = makeOcc('occ-1', 'def-1');
      const def = makeDef('def-1', 'Task 1');
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([occ]);
      mockDefRepo.findById!.mockResolvedValueOnce(def);

      const triggerAtMs = Date.parse(occ.calculatedStartTime!);
      const oldSnapshot: ScheduledNotificationSnapshot = {
        identifier: 'task-reminder:occ-1:default',
        title: 'Task 1',
        triggerAtMs,
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId: 'occ-1',
          taskDefinitionId: 'def-1',
          reminderSlot: NOTIFICATION_DEFAULT_SLOT,
          triggerAtMs,
          payloadVersion: 0 as any, // stale version
        },
      };
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([oldSnapshot]);

      const result = await service.reconcile();

      expect(mockAdapter.cancelScheduledNotification).toHaveBeenCalledWith('task-reminder:occ-1:default');
      expect(mockAdapter.scheduleNotification).toHaveBeenCalledTimes(1);
      expect(result.scheduled).toEqual(['task-reminder:occ-1:default']);
    });

    it('prevents replacement schedule if cancellation of old request fails', async () => {
      const occ = makeOcc('occ-1', 'def-1', '2026-09-17T15:00:00.000Z');
      const def = makeDef('def-1', 'Task 1');
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([occ]);
      mockDefRepo.findById!.mockResolvedValueOnce(def);

      const oldSnapshot: ScheduledNotificationSnapshot = {
        identifier: 'task-reminder:occ-1:default',
        title: 'Task 1',
        triggerAtMs: Date.parse('2026-09-17T14:30:00.000Z'),
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId: 'occ-1',
          taskDefinitionId: 'def-1',
          reminderSlot: NOTIFICATION_DEFAULT_SLOT,
          triggerAtMs: Date.parse('2026-09-17T14:30:00.000Z'),
          payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
        },
      };
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([oldSnapshot]);
      mockAdapter.cancelScheduledNotification.mockRejectedValueOnce(new Error('OS cancel failed'));

      const result = await service.reconcile();

      expect(mockAdapter.scheduleNotification).not.toHaveBeenCalled();
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toMatchObject({
        identifier: 'task-reminder:occ-1:default',
        action: 'CANCEL',
      });
    });

    it('recovers on next reconcile pass if schedule operation failed previously', async () => {
      const occ = makeOcc('occ-1', 'def-1');
      const def = makeDef('def-1', 'Task 1');
      mockOccRepo.findAllMaterializedPending!.mockResolvedValue([occ]);
      mockDefRepo.findById!.mockResolvedValue(def);
      mockAdapter.getAllScheduledNotifications.mockResolvedValue([]);

      // Pass 1: schedule fails
      mockAdapter.scheduleNotification.mockRejectedValueOnce(new Error('OS schedule failed'));
      const res1 = await service.reconcile();
      expect(res1.failed).toHaveLength(1);
      expect(res1.scheduled).toHaveLength(0);

      // Pass 2: schedule succeeds
      mockAdapter.scheduleNotification.mockResolvedValueOnce('task-reminder:occ-1:default');
      const res2 = await service.reconcile();
      expect(res2.failed).toHaveLength(0);
      expect(res2.scheduled).toEqual(['task-reminder:occ-1:default']);
    });
  });

  describe('Permission States', () => {
    it('cancels app-owned notifications and skips scheduling when permission is not allowed', async () => {
      mockAdapter.getPermissionStatus.mockResolvedValueOnce({
        canSchedule: false,
        canRequest: true,
        status: 'DENIED',
      });

      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([
        {
          identifier: 'task-reminder:occ-1:default',
          title: 'Task 1',
          triggerAtMs: currentTimeMs + 10000,
        },
        {
          identifier: 'other-app:notif',
          title: 'Other',
          triggerAtMs: currentTimeMs + 10000,
        },
      ]);

      const result = await service.reconcile();

      expect(result.cancelled).toEqual(['task-reminder:occ-1:default']);
      expect(mockAdapter.cancelScheduledNotification).toHaveBeenCalledWith('task-reminder:occ-1:default');
      expect(mockAdapter.cancelScheduledNotification).not.toHaveBeenCalledWith('other-app:notif');
      expect(mockOccRepo.findAllMaterializedPending).not.toHaveBeenCalled();
      expect(mockAdapter.scheduleNotification).not.toHaveBeenCalled();
    });

    it('rebuilds desired reminders when permission is re-granted', async () => {
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([makeOcc('occ-1', 'def-1')]);
      mockDefRepo.findById!.mockResolvedValueOnce(makeDef('def-1', 'Task 1'));
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([]);

      // Permission now granted
      mockAdapter.getPermissionStatus.mockResolvedValueOnce({
        canSchedule: true,
        canRequest: false,
        status: 'AUTHORIZED',
      });

      const result = await service.reconcile();
      expect(result.scheduled).toEqual(['task-reminder:occ-1:default']);
    });
  });

  describe('Status Invariants', () => {
    it('does not schedule COMPLETED occurrences', async () => {
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([]);
      const result = await service.reconcile();
      expect(result.scheduled).toHaveLength(0);
    });
  });

  describe('Schedule Types & ANYTIME_TODAY', () => {
    it('ignores legacy ANYTIME_TODAY definition that has reminderRule', async () => {
      const anytimeOcc = makeOcc('occ-anytime', 'def-anytime');
      const anytimeDef = makeDef('def-anytime', 'Anytime Task', 'ANYTIME_TODAY', 15);
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([anytimeOcc]);
      mockDefRepo.findById!.mockResolvedValueOnce(anytimeDef);

      const result = await service.reconcile();
      expect(result.scheduled).toHaveLength(0);
      expect(result.skippedPast).toHaveLength(0);
      expect(mockAdapter.scheduleNotification).not.toHaveBeenCalled();
    });

    it('records skippedPast for occurrences whose trigger is in the past', async () => {
      const pastOcc = makeOcc('occ-past', 'def-past', '2026-09-17T11:00:00.000Z');
      const pastDef = makeDef('def-past', 'Past Task', 'EXACT_TIME', 0);
      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce([pastOcc]);
      mockDefRepo.findById!.mockResolvedValueOnce(pastDef);

      const result = await service.reconcile();
      expect(result.skippedPast).toEqual(['task-reminder:occ-past:default']);
      expect(result.scheduled).toHaveLength(0);
    });
  });

  describe('Bounded 48-Reminder Capacity', () => {
    it('schedules exactly 48 reminders when 48 are eligible', async () => {
      const occurrences: TaskOccurrence[] = [];
      const definitions = new Map<string, TaskDefinition>();

      for (let i = 0; i < 48; i++) {
        const time = new Date(currentTimeMs + (i + 1) * 60_000).toISOString();
        occurrences.push(makeOcc(`occ-${i}`, `def-${i}`, time));
        definitions.set(`def-${i}`, makeDef(`def-${i}`, `Task ${i}`));
      }

      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce(occurrences);
      mockDefRepo.findById!.mockImplementation(async (id: string) => definitions.get(id) ?? null);
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([]);

      const result = await service.reconcile();

      expect(result.scheduled).toHaveLength(48);
      expect(result.skippedCapacity).toHaveLength(0);
    });

    it('caps at earliest 48 when 50 are eligible and marks 2 as skippedCapacity', async () => {
      const occurrences: TaskOccurrence[] = [];
      const definitions = new Map<string, TaskDefinition>();

      for (let i = 0; i < 50; i++) {
        // Reverse order so sorting earliest-first is tested
        const time = new Date(currentTimeMs + (50 - i) * 60_000).toISOString();
        occurrences.push(makeOcc(`occ-${i}`, `def-${i}`, time));
        definitions.set(`def-${i}`, makeDef(`def-${i}`, `Task ${i}`));
      }

      mockOccRepo.findAllMaterializedPending!.mockResolvedValueOnce(occurrences);
      mockDefRepo.findById!.mockImplementation(async (id: string) => definitions.get(id) ?? null);
      mockAdapter.getAllScheduledNotifications.mockResolvedValueOnce([]);

      const result = await service.reconcile();

      expect(result.scheduled).toHaveLength(48);
      expect(result.skippedCapacity).toHaveLength(2);
    });
  });

  describe('Targeted Cancellation (cancelOccurrenceReminder)', () => {
    it('cancels specific occurrence reminder by deterministic ID', async () => {
      await service.cancelOccurrenceReminder('occ-complete-1');
      expect(mockAdapter.cancelScheduledNotification).toHaveBeenCalledWith('task-reminder:occ-complete-1:default');
    });

    it('does not throw when canceling non-existent or failed reminder (idempotent)', async () => {
      mockAdapter.cancelScheduledNotification.mockRejectedValueOnce(new Error('Notification not found'));
      await expect(service.cancelOccurrenceReminder('occ-missing')).resolves.toBeUndefined();
    });
  });
});
