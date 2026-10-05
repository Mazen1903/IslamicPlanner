import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import {
  initNotificationHandler,
  _resetNotificationHandlerForTesting,
} from '../NotificationBootstrap';

jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('@/domain/task/TaskEngine', () => ({
  TaskEngine: jest.fn().mockImplementation(() => ({
    completeTask: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/data/repositories/TaskDefinitionRepository', () => ({
  taskDefinitionRepository: {},
}));

jest.mock('@/data/repositories/TaskOccurrenceRepository', () => ({
  taskOccurrenceRepository: {},
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
}));

describe('NotificationBootstrap', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetNotificationHandlerForTesting();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('NG-01: skips notification initialization when running in Expo Go', async () => {
    (isRunningInExpoGo as jest.Mock).mockReturnValue(true);

    await expect(initNotificationHandler()).resolves.toBeUndefined();

    expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[notifications] Notification bootstrap skipped in Expo Go')
    );
  });

  it('NG-02: loads expo-notifications and initializes handler in native/dev builds', async () => {
    (isRunningInExpoGo as jest.Mock).mockReturnValue(false);

    await initNotificationHandler();

    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    const callArg = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0];
    expect(callArg).toBeDefined();
    expect(typeof callArg.handleNotification).toBe('function');

    const behavior = await callArg.handleNotification();
    expect(behavior).toEqual({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

  it('NG-03: outside Expo Go, repeated calls are idempotent and register handler only once', async () => {
    (isRunningInExpoGo as jest.Mock).mockReturnValue(false);

    await initNotificationHandler();
    await initNotificationHandler();
    await initNotificationHandler();

    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('NG-04: in Expo Go, repeated calls remain harmless and do not load notifications', async () => {
    (isRunningInExpoGo as jest.Mock).mockReturnValue(true);

    await initNotificationHandler();
    await initNotificationHandler();

    expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
  });

  it('registers notification categories and response listener', async () => {
    (isRunningInExpoGo as jest.Mock).mockReturnValue(false);

    await initNotificationHandler();

    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
      'task-reminder-actions',
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'ACTION_SNOOZE_10', buttonTitle: 'Snooze 10m' }),
        expect.objectContaining({ identifier: 'ACTION_MARK_DONE', buttonTitle: 'Mark Done' }),
      ])
    );
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
  });
});

