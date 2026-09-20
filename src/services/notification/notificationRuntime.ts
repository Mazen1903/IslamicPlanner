import { isRunningInExpoGo } from 'expo';
import type * as NotificationsType from 'expo-notifications';

export type NotificationsModule = typeof NotificationsType;

let cachedModule: NotificationsModule | null = null;
let modulePromise: Promise<NotificationsModule | null> | null = null;

/**
 * Returns true if notification APIs are available on the current platform/runtime.
 * In Expo Go, notifications are removed/unsupported in SDK 53+.
 */
export function notificationsAvailable(): boolean {
  return !isRunningInExpoGo();
}

/**
 * Safely and lazily retrieves the expo-notifications module outside Expo Go.
 * In Expo Go, always returns null without evaluating the expo-notifications native module.
 */
export async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isRunningInExpoGo()) {
    return null;
  }

  if (cachedModule) {
    return cachedModule;
  }

  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        let mod: any;
        const isJest = typeof jest !== 'undefined' || process.env.NODE_ENV === 'test';
        if (isJest) {
          try {
            mod = await import('expo-notifications');
          } catch {
            // CommonJS Jest fallback without --experimental-vm-modules
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            mod = require('expo-notifications');
          }
        } else {
          mod = await import('expo-notifications');
        }
        cachedModule = mod as NotificationsModule;
        return cachedModule;
      } catch (err) {
        cachedModule = null;
        throw err;
      } finally {
        modulePromise = null;
      }
    })();
  }

  return modulePromise;
}

/**
 * Testing reset only.
 */
export function _resetNotificationRuntimeForTesting(): void {
  cachedModule = null;
  modulePromise = null;
}
