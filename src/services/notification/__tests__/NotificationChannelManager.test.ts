import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import { NotificationChannelManager } from '../NotificationChannelManager';
import { _resetNotificationRuntimeForTesting } from '../notificationRuntime';
import { NOTIFICATION_CHANNEL_ID, NOTIFICATION_CHANNEL_NAME } from '@/domain/notification/types';

jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn(),
}));

jest.mock('expo-notifications', () => {
  return {
    AndroidImportance: {
      DEFAULT: 3,
    },
    setNotificationChannelAsync: jest.fn(),
  };
});

describe('NotificationChannelManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetNotificationRuntimeForTesting();
    (isRunningInExpoGo as jest.Mock).mockReturnValue(false);
  });

  it('creates task-reminders channel with DEFAULT importance on Android', async () => {
    (Platform as any).OS = 'android';
    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue({});

    const manager = new NotificationChannelManager();
    await manager.ensureChannel();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      NOTIFICATION_CHANNEL_ID,
      expect.objectContaining({
        name: NOTIFICATION_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.DEFAULT,
        showBadge: false,
      })
    );
  });

  it('is idempotent and creates channel at most once', async () => {
    (Platform as any).OS = 'android';
    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue({});

    const manager = new NotificationChannelManager();
    await manager.ensureChannel();
    await manager.ensureChannel();
    await manager.ensureChannel();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
  });

  it('is a no-op on iOS', async () => {
    (Platform as any).OS = 'ios';

    const manager = new NotificationChannelManager();
    await manager.ensureChannel();

    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('NG-09: skips channel creation when running in Expo Go', async () => {
    (isRunningInExpoGo as jest.Mock).mockReturnValue(true);
    (Platform as any).OS = 'android';

    const manager = new NotificationChannelManager();
    await manager.ensureChannel();

    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
