import { Platform } from 'react-native';
import { getNotificationsModule, notificationsAvailable } from './notificationRuntime';
import type { TaskPriority } from '@/domain/task/types';

export const CHANNELS = {
  TASK_REMINDER_VIB: 'task-reminders-v2-vib',
  TASK_REMINDER_NOVIB: 'task-reminders-v2-novib',
  TASK_URGENT_VIB: 'task-reminders-urgent-v2-vib',
  TASK_URGENT_NOVIB: 'task-reminders-urgent-v2-novib',
  PRAYER_ALERT_VIB: 'prayer-alerts-v2-vib',
  PRAYER_ALERT_NOVIB: 'prayer-alerts-v2-novib',
  JOURNAL: 'journal-reminders-v2',
} as const;

export interface NotificationChannelManagerAPI {
  ensureChannel(): Promise<void>;
  getTaskChannelId(priority?: TaskPriority, vibrationEnabled?: boolean): string;
  getPrayerChannelId(vibrationEnabled?: boolean): string;
  getJournalChannelId(): string;
}

export class NotificationChannelManager implements NotificationChannelManagerAPI {
  private channelsCreated = false;

  getTaskChannelId(priority: TaskPriority = 'NORMAL', vibrationEnabled = true): string {
    if (priority === 'IMPORTANT') {
      return vibrationEnabled ? CHANNELS.TASK_URGENT_VIB : CHANNELS.TASK_URGENT_NOVIB;
    }
    return vibrationEnabled ? CHANNELS.TASK_REMINDER_VIB : CHANNELS.TASK_REMINDER_NOVIB;
  }

  getPrayerChannelId(vibrationEnabled = true): string {
    return vibrationEnabled ? CHANNELS.PRAYER_ALERT_VIB : CHANNELS.PRAYER_ALERT_NOVIB;
  }

  getJournalChannelId(): string {
    return CHANNELS.JOURNAL;
  }

  /**
   * Idempotently ensures all versioned notification channels exist on Android.
   * Cleans up legacy channels.
   */
  async ensureChannel(): Promise<void> {
    if (Platform.OS !== 'android' || !notificationsAvailable()) {
      return;
    }

    if (this.channelsCreated) {
      return;
    }

    try {
      const notifications = await getNotificationsModule();
      if (!notifications) {
        return;
      }

      const defaultImportance = (notifications.AndroidImportance?.DEFAULT ?? 3) as any;
      const highImportance = (notifications.AndroidImportance?.HIGH ?? 4) as any;

      // 1. Clean up legacy unversioned channels
      try {
        await notifications.deleteNotificationChannelAsync('task-reminders');
      } catch {
        // Idempotent
      }

      // 2. Task Reminders (Normal Priority)
      await notifications.setNotificationChannelAsync(CHANNELS.TASK_REMINDER_VIB, {
        name: 'Task Reminders',
        importance: defaultImportance,
        showBadge: false,
        enableVibrate: true,
      });

      await notifications.setNotificationChannelAsync(CHANNELS.TASK_REMINDER_NOVIB, {
        name: 'Task Reminders (Silent/No Vibrate)',
        importance: defaultImportance,
        showBadge: false,
        enableVibrate: false,
      });

      // 3. Urgent Task Reminders (Important Priority)
      await notifications.setNotificationChannelAsync(CHANNELS.TASK_URGENT_VIB, {
        name: 'Urgent Task Reminders',
        importance: highImportance,
        showBadge: true,
        enableVibrate: true,
      });

      await notifications.setNotificationChannelAsync(CHANNELS.TASK_URGENT_NOVIB, {
        name: 'Urgent Task Reminders (No Vibrate)',
        importance: highImportance,
        showBadge: true,
        enableVibrate: false,
      });

      // 4. Prayer Alerts
      await notifications.setNotificationChannelAsync(CHANNELS.PRAYER_ALERT_VIB, {
        name: 'Prayer Alerts',
        importance: highImportance,
        showBadge: true,
        enableVibrate: true,
      });

      await notifications.setNotificationChannelAsync(CHANNELS.PRAYER_ALERT_NOVIB, {
        name: 'Prayer Alerts (No Vibrate)',
        importance: highImportance,
        showBadge: true,
        enableVibrate: false,
      });

      // 5. Daily Journal
      await notifications.setNotificationChannelAsync(CHANNELS.JOURNAL, {
        name: 'Daily Reflection & Journal',
        importance: defaultImportance,
        showBadge: false,
        enableVibrate: true,
      });

      this.channelsCreated = true;
    } catch (err) {
      console.warn('[NotificationChannelManager] Failed to create channels:', err);
    }
  }
}

export const notificationChannelManager = new NotificationChannelManager();
