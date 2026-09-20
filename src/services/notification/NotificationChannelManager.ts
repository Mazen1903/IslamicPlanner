import { Platform } from 'react-native';
import { getNotificationsModule, notificationsAvailable } from './notificationRuntime';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
} from '@/domain/notification/types';

export interface NotificationChannelManagerAPI {
  ensureChannel(): Promise<void>;
}

export class NotificationChannelManager implements NotificationChannelManagerAPI {
  private channelCreated = false;

  /**
   * Idempotently ensures the single app-owned Android notification channel exists.
   * Only executes on Android outside Expo Go; no-op on other platforms or in Expo Go.
   */
  async ensureChannel(): Promise<void> {
    if (Platform.OS !== 'android' || !notificationsAvailable()) {
      return;
    }

    if (this.channelCreated) {
      return;
    }

    try {
      const notifications = await getNotificationsModule();
      if (!notifications) {
        return;
      }

      const importance = (notifications.AndroidImportance?.DEFAULT ?? 5) as any;
      await notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: NOTIFICATION_CHANNEL_NAME,
        importance,
        showBadge: false,
        enableVibrate: true,
      });
      this.channelCreated = true;
    } catch (err) {
      // Channel creation failure shouldn't crash callers; next attempt will retry
      console.warn('[NotificationChannelManager] Failed to create channel:', err);
    }
  }
}

export const notificationChannelManager = new NotificationChannelManager();
