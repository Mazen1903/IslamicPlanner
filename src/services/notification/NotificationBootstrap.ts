import { isRunningInExpoGo } from 'expo';
import { router } from 'expo-router';
import { getNotificationsModule } from './notificationRuntime';
import {
  NOTIFICATION_CATEGORY_TASK,
  NOTIFICATION_ACTION_SNOOZE,
  NOTIFICATION_ACTION_DONE,
  NOTIFICATION_PAYLOAD_VERSION,
  NOTIFICATION_CHANNEL_ID,
} from '@/domain/notification/types';
import { buildNotificationId } from '@/domain/notification/notificationIdentity';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { notificationSchedulerAdapter } from './NotificationSchedulerAdapter';

let handlerInitialized = false;
let subscription: { remove: () => void } | null = null;

/**
 * Handles user interaction with a delivered notification.
 */
export async function handleNotificationResponse(response: any): Promise<void> {
  try {
    const actionIdentifier = response.actionIdentifier;
    const data = response.notification?.request?.content?.data as Record<string, unknown> | undefined;
    const occurrenceId = data?.occurrenceId as string | undefined;

    if (!occurrenceId) {
      return;
    }

    if (actionIdentifier === NOTIFICATION_ACTION_SNOOZE) {
      // 1. Snooze action: schedule a reminder in 10 minutes
      const triggerAtMs = Date.now() + 10 * 60_000;
      const title = response.notification?.request?.content?.title || 'Task Reminder';
      const snoozeId = buildNotificationId(occurrenceId, 'snooze');

      await notificationSchedulerAdapter.scheduleNotification({
        identifier: snoozeId,
        occurrenceId,
        taskDefinitionId: (data?.taskDefinitionId as string) || '',
        title: `${title} (Snoozed)`,
        triggerAtMs,
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId,
          taskDefinitionId: (data?.taskDefinitionId as string) || '',
          reminderSlot: 'snooze',
          triggerAtMs,
          payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
          body: 'Snoozed task reminder · 10 min passed',
        },
      });

      // Also navigate to task detail
      setTimeout(() => {
        try {
          router.push(`/task/${occurrenceId}`);
        } catch {
          // Non-fatal if router isn't mounted yet
        }
      }, 100);
      return;
    }

    if (actionIdentifier === NOTIFICATION_ACTION_DONE) {
      // 2. Mark Done action: complete the task occurrence
      try {
        const engine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);
        await engine.completeTask(occurrenceId);
      } catch (err) {
        console.warn('[NotificationBootstrap] Failed to complete task from notification action:', err);
      }
      return;
    }

    // 3. Default tap on notification body: navigate to task detail screen
    setTimeout(() => {
      try {
        router.push(`/task/${occurrenceId}`);
      } catch {
        // Non-fatal if router isn't mounted yet
      }
    }, 100);
  } catch (err) {
    console.warn('[NotificationBootstrap] Error handling notification response:', err);
  }
}

/**
 * Initializes the global foreground notification presentation handler and action categories.
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

  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return;
  }

  // Set foreground presentation options
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Register interactive category with Snooze and Done actions
  try {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_TASK, [
      {
        identifier: NOTIFICATION_ACTION_SNOOZE,
        buttonTitle: 'Snooze 10m',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: NOTIFICATION_ACTION_DONE,
        buttonTitle: 'Mark Done',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  } catch (err) {
    console.warn('[NotificationBootstrap] Failed to register notification categories:', err);
  }

  // Register response listener for user taps / action presses
  if (subscription) {
    subscription.remove();
  }
  subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  // Check cold start response
  try {
    const coldResponse = await Notifications.getLastNotificationResponseAsync();
    if (coldResponse) {
      void handleNotificationResponse(coldResponse);
    }
  } catch {
    // Non-fatal on cold start check
  }

  handlerInitialized = true;
}

/**
 * For test resets only.
 */
export function _resetNotificationHandlerForTesting(): void {
  handlerInitialized = false;
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}
