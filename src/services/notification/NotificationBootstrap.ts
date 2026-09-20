import { isRunningInExpoGo } from 'expo';

let handlerInitialized = false;

/**
 * Initializes the global foreground notification presentation handler.
 * Must be called exactly once during app root startup.
 * Does NOT prompt for permissions.
 */
export async function initNotificationHandler(): Promise<void> {
  if (handlerInitialized) {
    return;
  }

  if (isRunningInExpoGo()) {
    if (__DEV__) {
      console.warn(
        '[notifications] Notification bootstrap skipped in Expo Go. ' +
          'Use a development build to test notifications.',
      );
    }

    return;
  }

  let Notifications: typeof import('expo-notifications');
  try {
    Notifications = await import('expo-notifications');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
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
