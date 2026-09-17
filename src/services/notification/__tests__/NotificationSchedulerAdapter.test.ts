import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  NotificationSchedulerAdapter,
  normalizeScheduledNotification,
  normalizePermissionResponse,
} from '../NotificationSchedulerAdapter';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_DEFAULT_SLOT,
  NOTIFICATION_PAYLOAD_VERSION,
  type DesiredNotification,
} from '@/domain/notification/types';
import { isNotificationEquivalent } from '@/domain/notification/notificationEquality';

jest.mock('expo-notifications', () => {
  return {
    SchedulableTriggerInputTypes: {
      DATE: 'date',
    },
    IosAuthorizationStatus: {
      NOT_DETERMINED: 0,
      DENIED: 1,
      AUTHORIZED: 2,
      PROVISIONAL: 3,
      EPHEMERAL: 4,
    },
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    cancelScheduledNotificationAsync: jest.fn(),
    getAllScheduledNotificationsAsync: jest.fn(),
  };
});

describe('NotificationSchedulerAdapter', () => {
  let adapter: NotificationSchedulerAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new NotificationSchedulerAdapter();
  });

  describe('Permission Normalization', () => {
    describe('iOS', () => {
      beforeEach(() => {
        (Platform as any).OS = 'ios';
      });

      it('normalizes AUTHORIZED status to canSchedule: true', () => {
        const response: any = {
          granted: true,
          status: 'granted',
          canAskAgain: false,
          expires: 'never',
          ios: { status: Notifications.IosAuthorizationStatus.AUTHORIZED },
        };
        const result = normalizePermissionResponse(response);
        expect(result).toEqual({ canSchedule: true, canRequest: false, status: 'AUTHORIZED' });
      });

      it('normalizes PROVISIONAL status to canSchedule: true', () => {
        const response: any = {
          granted: true,
          status: 'granted',
          canAskAgain: false,
          expires: 'never',
          ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL },
        };
        const result = normalizePermissionResponse(response);
        expect(result).toEqual({ canSchedule: true, canRequest: false, status: 'AUTHORIZED' });
      });

      it('normalizes EPHEMERAL status to canSchedule: true', () => {
        const response: any = {
          granted: true,
          status: 'granted',
          canAskAgain: false,
          expires: 'never',
          ios: { status: Notifications.IosAuthorizationStatus.EPHEMERAL },
        };
        const result = normalizePermissionResponse(response);
        expect(result).toEqual({ canSchedule: true, canRequest: false, status: 'AUTHORIZED' });
      });

      it('normalizes DENIED status to canSchedule: false, canRequest: false', () => {
        const response: any = {
          granted: false,
          status: 'denied',
          canAskAgain: false,
          expires: 'never',
          ios: { status: Notifications.IosAuthorizationStatus.DENIED },
        };
        const result = normalizePermissionResponse(response);
        expect(result).toEqual({ canSchedule: false, canRequest: false, status: 'DENIED' });
      });

      it('normalizes NOT_DETERMINED status to canSchedule: false, canRequest: true', () => {
        const response: any = {
          granted: false,
          status: 'undetermined',
          canAskAgain: true,
          expires: 'never',
          ios: { status: Notifications.IosAuthorizationStatus.NOT_DETERMINED },
        };
        const result = normalizePermissionResponse(response);
        expect(result).toEqual({ canSchedule: false, canRequest: true, status: 'NOT_DETERMINED' });
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        (Platform as any).OS = 'android';
      });

      it('normalizes granted: true to canSchedule: true', () => {
        const response: any = {
          granted: true,
          status: 'granted',
          canAskAgain: false,
          expires: 'never',
        };
        const result = normalizePermissionResponse(response);
        expect(result).toEqual({ canSchedule: true, canRequest: false, status: 'AUTHORIZED' });
      });

      it('normalizes status: undetermined to canSchedule: false, canRequest: true', () => {
        const response: any = {
          granted: false,
          status: 'undetermined',
          canAskAgain: true,
          expires: 'never',
        };
        const result = normalizePermissionResponse(response);
        expect(result).toEqual({ canSchedule: false, canRequest: true, status: 'NOT_DETERMINED' });
      });

      it('normalizes status: denied to canSchedule: false', () => {
        const response: any = {
          granted: false,
          status: 'denied',
          canAskAgain: false,
          expires: 'never',
        };
        const result = normalizePermissionResponse(response);
        expect(result).toEqual({ canSchedule: false, canRequest: false, status: 'DENIED' });
      });
    });
  });

  describe('Trigger Normalization & Round-Trip (Safeguard 4)', () => {
    it('normalizes Date instance trigger to numeric triggerAtMs', () => {
      const date = new Date(1789640000000);
      const req: any = {
        identifier: 'task-reminder:occ-1:default',
        content: { title: 'Test Task', data: { kind: 'task-reminder' } },
        trigger: { type: 'date', date, channelId: NOTIFICATION_CHANNEL_ID },
      };

      const snapshot = normalizeScheduledNotification(req);
      expect(snapshot.triggerAtMs).toBe(1789640000000);
      expect(snapshot.channelId).toBe(NOTIFICATION_CHANNEL_ID);
    });

    it('normalizes numeric timestamp trigger to numeric triggerAtMs', () => {
      const req: any = {
        identifier: 'task-reminder:occ-1:default',
        content: { title: 'Test Task', data: { kind: 'task-reminder' } },
        trigger: { type: 'date', date: 1789640000000, channelId: NOTIFICATION_CHANNEL_ID },
      };

      const snapshot = normalizeScheduledNotification(req);
      expect(snapshot.triggerAtMs).toBe(1789640000000);
    });

    it('normalizes trigger.value when trigger.date is not present', () => {
      const req: any = {
        identifier: 'task-reminder:occ-1:default',
        content: { title: 'Test Task', data: { kind: 'task-reminder' } },
        trigger: { type: 'date', value: 1789640000000 },
      };

      const snapshot = normalizeScheduledNotification(req);
      expect(snapshot.triggerAtMs).toBe(1789640000000);
    });

    it('round-trip: scheduled desired DATE trigger normalizes to equivalent snapshot', () => {
      const desired: DesiredNotification = {
        identifier: 'task-reminder:occ-10:default',
        occurrenceId: 'occ-10',
        taskDefinitionId: 'def-10',
        title: 'Asr Task',
        triggerAtMs: 1789645000000,
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId: 'occ-10',
          taskDefinitionId: 'def-10',
          reminderSlot: NOTIFICATION_DEFAULT_SLOT,
          triggerAtMs: 1789645000000,
          payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
        },
      };

      // Mock Expo scheduled request returned by SDK 57
      const returnedRequest: any = {
        identifier: desired.identifier,
        content: {
          title: desired.title,
          sound: 'default',
          data: desired.data,
        },
        trigger: {
          type: 'date',
          date: desired.triggerAtMs,
          channelId: desired.channelId,
        },
      };

      const normalized = normalizeScheduledNotification(returnedRequest);
      const isEquivalent = isNotificationEquivalent(desired, normalized, { isAndroid: true });
      expect(isEquivalent).toBe(true);
    });
  });

  describe('API Operations', () => {
    it('schedules notification with canonical DATE trigger and task-reminders channel', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('task-reminder:occ-1:default');

      const desired: DesiredNotification = {
        identifier: 'task-reminder:occ-1:default',
        occurrenceId: 'occ-1',
        taskDefinitionId: 'def-1',
        title: 'Morning Dhikr',
        triggerAtMs: 1789640000000,
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId: 'occ-1',
          taskDefinitionId: 'def-1',
          reminderSlot: NOTIFICATION_DEFAULT_SLOT,
          triggerAtMs: 1789640000000,
          payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
        },
      };

      const result = await adapter.scheduleNotification(desired);
      expect(result).toBe('task-reminder:occ-1:default');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        identifier: desired.identifier,
        content: {
          title: desired.title,
          sound: 'default',
          data: desired.data,
        },
        trigger: {
          type: 'date',
          date: desired.triggerAtMs,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });
    });

    it('cancels scheduled notification safely and idempotently', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);
      await expect(adapter.cancelScheduledNotification('task-reminder:occ-1:default')).resolves.toBeUndefined();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('task-reminder:occ-1:default');
    });

    it('swallows error when canceling missing notification', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(new Error('Notification not found'));
      await expect(adapter.cancelScheduledNotification('missing-id')).resolves.toBeUndefined();
    });

    it('retrieves and normalizes all scheduled notifications', async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
        {
          identifier: 'task-reminder:occ-1:default',
          content: { title: 'Task 1', data: { kind: 'task-reminder', triggerAtMs: 1789640000000 } },
          trigger: { type: 'date', date: 1789640000000, channelId: NOTIFICATION_CHANNEL_ID },
        },
        {
          identifier: 'other-app:123',
          content: { title: 'Other app' },
          trigger: { type: 'date', date: 1789650000000 },
        },
      ]);

      const snapshots = await adapter.getAllScheduledNotifications();
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].identifier).toBe('task-reminder:occ-1:default');
      expect(snapshots[0].triggerAtMs).toBe(1789640000000);
      expect(snapshots[1].identifier).toBe('other-app:123');
    });
  });
});
