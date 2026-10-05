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
      HIGH: 4,
    },
    setNotificationChannelAsync: jest.fn(),
    deleteNotificationChannelAsync: jest.fn(),
  };
});

describe('NotificationChannelManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetNotificationRuntimeForTesting();
    (isRunningInExpoGo as jest.Mock).mockReturnValue(false);
  });

  it('creates 7 versioned channels with appropriate importance on Android', async () => {
    (Platform as any).OS = 'android';
    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue({});
    (Notifications.deleteNotificationChannelAsync as jest.Mock).mockResolvedValue({});

    const manager = new NotificationChannelManager();
    await manager.ensureChannel();

    expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('task-reminders');
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(7);
  });

  it('is idempotent and creates channels at most once', async () => {
    (Platform as any).OS = 'android';
    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue({});
    (Notifications.deleteNotificationChannelAsync as jest.Mock).mockResolvedValue({});

    const manager = new NotificationChannelManager();
    await manager.ensureChannel();
    await manager.ensureChannel();
    await manager.ensureChannel();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(7);
  });

  it('resolves channel IDs based on priority and vibration settings', () => {
    const manager = new NotificationChannelManager();
    expect(manager.getTaskChannelId('NORMAL', true)).toBe('task-reminders-v2-vib');
    expect(manager.getTaskChannelId('NORMAL', false)).toBe('task-reminders-v2-novib');
    expect(manager.getTaskChannelId('IMPORTANT', true)).toBe('task-reminders-urgent-v2-vib');
    expect(manager.getTaskChannelId('IMPORTANT', false)).toBe('task-reminders-urgent-v2-novib');

    expect(manager.getPrayerChannelId(true)).toBe('prayer-alerts-v2-vib');
    expect(manager.getPrayerChannelId(false)).toBe('prayer-alerts-v2-novib');

    expect(manager.getJournalChannelId()).toBe('journal-reminders-v2');
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
