import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_PAYLOAD_VERSION,
  type DesiredNotification,
  type ScheduledNotificationSnapshot,
} from './types';

export interface NotificationEqualityOptions {
  /**
   * Whether to enforce Android notification channel equality.
   * On iOS, notification channels do not exist and channel equality must NOT be enforced.
   */
  isAndroid?: boolean;
}

/**
 * Evaluates whether an existing OS-scheduled notification matches the desired representation.
 *
 * Requirements:
 * - Deterministic identifier must match.
 * - triggerAtMs must match.
 * - Title must match.
 * - Payload data must be well-formed, match occurrenceId/taskDefinitionId/slot, and have payloadVersion === 1.
 * - On Android, channelId must match 'task-reminders' if present or configured.
 * - On iOS, channelId comparison is skipped.
 * - Any mismatch, missing metadata, or malformed data indicates the current notification is STALE.
 */
export function isNotificationEquivalent(
  desired: DesiredNotification,
  current: ScheduledNotificationSnapshot,
  options: NotificationEqualityOptions = {}
): boolean {
  // 1. Identifier match
  if (current.identifier !== desired.identifier) {
    return false;
  }

  // 2. Title match
  if (current.title !== desired.title) {
    return false;
  }

  // 3. Trigger instant match
  if (current.triggerAtMs !== desired.triggerAtMs) {
    return false;
  }

  // 4. Payload data inspection
  const data = current.data;
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (data.kind !== 'task-reminder') {
    return false;
  }

  if (data.occurrenceId !== desired.occurrenceId) {
    return false;
  }

  if (data.taskDefinitionId !== desired.taskDefinitionId) {
    return false;
  }

  if (data.reminderSlot !== desired.data.reminderSlot) {
    return false;
  }

  if (data.payloadVersion !== NOTIFICATION_PAYLOAD_VERSION) {
    return false;
  }

  if (typeof data.triggerAtMs === 'number' && data.triggerAtMs !== desired.triggerAtMs) {
    return false;
  }

  // 5. Platform-aware channel equality
  if (options.isAndroid) {
    // If the snapshot captured a channelId, it must match task-reminders
    if (current.channelId && current.channelId !== NOTIFICATION_CHANNEL_ID) {
      return false;
    }
  }

  return true;
}
