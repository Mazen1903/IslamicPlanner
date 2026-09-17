import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  SchedulableTriggerInputTypes,
  IosAuthorizationStatus,
} from 'expo-notifications';
import type {
  DesiredNotification,
  ScheduledNotificationSnapshot,
} from '@/domain/notification/types';

export interface PermissionStatusResult {
  canSchedule: boolean;
  canRequest: boolean;
  status: string;
}

export interface NotificationSchedulerAdapterAPI {
  getPermissionStatus(): Promise<PermissionStatusResult>;
  requestPermission(): Promise<PermissionStatusResult>;
  scheduleNotification(desired: DesiredNotification): Promise<string>;
  cancelScheduledNotification(identifier: string): Promise<void>;
  getAllScheduledNotifications(): Promise<ScheduledNotificationSnapshot[]>;
}

/**
 * Normalizes an OS scheduled notification request into a ScheduledNotificationSnapshot.
 * Safely extracts triggerAtMs across Android and iOS SDK 57 trigger representations.
 */
export function normalizeScheduledNotification(
  req: Notifications.NotificationRequest
): ScheduledNotificationSnapshot {
  let triggerAtMs = 0;
  const trigger = req.trigger as any;

  // SDK 57 DATE trigger normalization:
  // 1. Check trigger.date (Date object or timestamp number)
  if (trigger && trigger.date !== undefined && trigger.date !== null) {
    if (trigger.date instanceof Date) {
      triggerAtMs = trigger.date.getTime();
    } else if (typeof trigger.date === 'number') {
      triggerAtMs = trigger.date;
    } else if (typeof trigger.date === 'string') {
      const parsed = Date.parse(trigger.date);
      if (!Number.isNaN(parsed)) {
        triggerAtMs = parsed;
      }
    }
  } else if (trigger && typeof trigger.value === 'number') {
    triggerAtMs = trigger.value;
  }

  // Fallback to triggerAtMs stored in payload data if trigger object was not parsed
  if (!triggerAtMs && req.content?.data?.triggerAtMs && typeof req.content.data.triggerAtMs === 'number') {
    triggerAtMs = req.content.data.triggerAtMs;
  }

  // Extract channelId from trigger or content
  const channelId = trigger?.channelId ?? (req.content as any)?.channelId ?? null;

  return {
    identifier: req.identifier,
    title: req.content?.title ?? null,
    triggerAtMs,
    channelId,
    data: (req.content?.data as Record<string, unknown>) ?? undefined,
  };
}

/**
 * Normalizes platform-specific PermissionResponse into PermissionStatusResult.
 */
export function normalizePermissionResponse(
  response: Notifications.NotificationPermissionsStatus
): PermissionStatusResult {
  if (Platform.OS === 'ios') {
    const iosStatus = response.ios?.status;
    switch (iosStatus) {
      case IosAuthorizationStatus.AUTHORIZED:
      case IosAuthorizationStatus.PROVISIONAL:
      case IosAuthorizationStatus.EPHEMERAL:
        return { canSchedule: true, canRequest: false, status: 'AUTHORIZED' };
      case IosAuthorizationStatus.DENIED:
        return { canSchedule: false, canRequest: false, status: 'DENIED' };
      case IosAuthorizationStatus.NOT_DETERMINED:
      default:
        return { canSchedule: false, canRequest: true, status: 'NOT_DETERMINED' };
    }
  }

  // Android & others
  if (response.granted) {
    return { canSchedule: true, canRequest: false, status: 'AUTHORIZED' };
  }

  if (response.status === 'denied') {
    return { canSchedule: false, canRequest: response.canAskAgain, status: 'DENIED' };
  }

  return { canSchedule: false, canRequest: true, status: 'NOT_DETERMINED' };
}

export class NotificationSchedulerAdapter implements NotificationSchedulerAdapterAPI {
  async getPermissionStatus(): Promise<PermissionStatusResult> {
    try {
      const response = await Notifications.getPermissionsAsync();
      return normalizePermissionResponse(response);
    } catch {
      return { canSchedule: false, canRequest: false, status: 'DENIED' };
    }
  }

  async requestPermission(): Promise<PermissionStatusResult> {
    try {
      const response = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowSound: true,
          allowBadge: false,
        },
      });
      return normalizePermissionResponse(response);
    } catch {
      return { canSchedule: false, canRequest: false, status: 'DENIED' };
    }
  }

  async scheduleNotification(desired: DesiredNotification): Promise<string> {
    const trigger: Notifications.DateTriggerInput = {
      type: SchedulableTriggerInputTypes.DATE,
      date: desired.triggerAtMs,
      channelId: desired.channelId,
    };

    return await Notifications.scheduleNotificationAsync({
      identifier: desired.identifier,
      content: {
        title: desired.title,
        sound: 'default',
        data: desired.data,
      },
      trigger,
    });
  }

  async cancelScheduledNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // Cancellation on missing/already fired notification is idempotent
    }
  }

  async getAllScheduledNotifications(): Promise<ScheduledNotificationSnapshot[]> {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    return requests.map(normalizeScheduledNotification);
  }
}

export const notificationSchedulerAdapter = new NotificationSchedulerAdapter();
