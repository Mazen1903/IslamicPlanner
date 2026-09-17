import * as Notifications from 'expo-notifications';
import {
  initNotificationHandler,
  _resetNotificationHandlerForTesting,
} from '../NotificationBootstrap';

jest.mock('expo-notifications', () => {
  return {
    setNotificationHandler: jest.fn(),
  };
});

describe('NotificationBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetNotificationHandlerForTesting();
  });

  it('registers foreground notification handler once', async () => {
    initNotificationHandler();
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

  it('does not register multiple times when called repeatedly', () => {
    initNotificationHandler();
    initNotificationHandler();
    initNotificationHandler();

    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});
