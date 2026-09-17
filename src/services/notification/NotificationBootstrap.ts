import * as Notifications from 'expo-notifications';

let handlerInitialized = false;

/**
 * Initializes the global foreground notification presentation handler.
 * Must be called exactly once during app root startup.
 * Does NOT prompt for permissions.
 */
export function initNotificationHandler(): void {
  if (handlerInitialized) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  handlerInitialized = true;
}

/**
 * For test resets only.
 */
export function _resetNotificationHandlerForTesting(): void {
  handlerInitialized = false;
}
