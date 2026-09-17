import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
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
   * Only executes on Android; no-op on other platforms.
   */
  async ensureChannel(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    if (this.channelCreated) {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: NOTIFICATION_CHANNEL_NAME,
        importance: AndroidImportance.DEFAULT,
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
