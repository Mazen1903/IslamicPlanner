import { NOTIFICATION_ID_PREFIX, NOTIFICATION_DEFAULT_SLOT } from './types';

/**
 * Builds the canonical deterministic notification identifier for a task occurrence reminder.
 * Pattern: `task-reminder:{occurrenceId}:{slot}`
 */
export function buildNotificationId(
  occurrenceId: string,
  slot: string = NOTIFICATION_DEFAULT_SLOT
): string {
  if (!occurrenceId || typeof occurrenceId !== 'string') {
    throw new Error('occurrenceId must be a non-empty string');
  }
  return `${NOTIFICATION_ID_PREFIX}${occurrenceId}:${slot}`;
}

/**
 * Parses a deterministic notification identifier. Returns occurrenceId and slot, or null if invalid.
 */
export function parseNotificationId(
  id: string
): { occurrenceId: string; slot: string } | null {
  if (!id || typeof id !== 'string' || !id.startsWith(NOTIFICATION_ID_PREFIX)) {
    return null;
  }
  const remainder = id.slice(NOTIFICATION_ID_PREFIX.length);
  const colonIndex = remainder.lastIndexOf(':');
  if (colonIndex <= 0 || colonIndex === remainder.length - 1) {
    return null;
  }
  const occurrenceId = remainder.slice(0, colonIndex);
  const slot = remainder.slice(colonIndex + 1);
  return { occurrenceId, slot };
}

/**
 * Returns true if the identifier begins with the app-owned task-reminder prefix.
 */
export function isAppOwnedNotificationId(id: string): boolean {
  return typeof id === 'string' && id.startsWith(NOTIFICATION_ID_PREFIX);
}
