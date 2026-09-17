import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_PAYLOAD_VERSION,
  type DesiredNotification,
} from './types';
import { buildNotificationId } from './notificationIdentity';

/**
 * Derives the epoch timestamp (ms) for a task occurrence reminder trigger.
 *
 * Invariants:
 * 1. Only PENDING occurrences are eligible.
 * 2. TaskDefinition must have a non-null reminderRule with a numeric offsetMinutes.
 * 3. ANYTIME_TODAY has no concrete anchor; returns null.
 * 4. Anchor resolution:
 *    - EXACT_TIME: occurrence.calculatedStartTime
 *    - PRAYER_RELATIVE: occurrence.calculatedStartTime
 *    - PRAYER_WINDOW: occurrence.windowStart
 * 5. Trigger calculation: anchorMs + (offsetMinutes * 60_000).
 * 6. Past triggers (triggerAtMs <= nowMs) return null.
 */
export function deriveNotificationTrigger(
  occurrence: TaskOccurrence,
  definition: TaskDefinition,
  nowMs: number
): number | null {
  // 1. Status eligibility: PENDING only
  if (occurrence.status !== 'PENDING') {
    return null;
  }

  // 2. Reminder rule eligibility
  const reminderRule = definition.reminderRule;
  if (!reminderRule || typeof reminderRule.offsetMinutes !== 'number' || !Number.isFinite(reminderRule.offsetMinutes)) {
    return null;
  }

  // 3. Schedule type check: ANYTIME_TODAY has no reminder anchor
  if (definition.scheduleType === 'ANYTIME_TODAY') {
    return null;
  }

  // 4. Resolve anchor instant string
  let anchorIso: string | null = null;
  if (definition.scheduleType === 'EXACT_TIME' || definition.scheduleType === 'PRAYER_RELATIVE') {
    anchorIso = occurrence.calculatedStartTime;
  } else if (definition.scheduleType === 'PRAYER_WINDOW') {
    anchorIso = occurrence.windowStart;
  }

  if (!anchorIso) {
    return null;
  }

  const anchorMs = Date.parse(anchorIso);
  if (Number.isNaN(anchorMs)) {
    return null;
  }

  // 5. Calculate trigger instant: anchor + offsetMinutes
  const triggerAtMs = anchorMs + Math.round(reminderRule.offsetMinutes * 60_000);

  // 6. Past trigger check: must be strictly in the future (> nowMs)
  if (triggerAtMs <= nowMs) {
    return null;
  }

  return triggerAtMs;
}

/**
 * Derives the canonical DesiredNotification object for an eligible occurrence.
 * Returns null if not eligible or if trigger is in the past.
 */
export function deriveDesiredNotification(
  occurrence: TaskOccurrence,
  definition: TaskDefinition,
  nowMs: number
): DesiredNotification | null {
  const triggerAtMs = deriveNotificationTrigger(occurrence, definition, nowMs);
  if (triggerAtMs === null) {
    return null;
  }

  const identifier = buildNotificationId(occurrence.id);

  return {
    identifier,
    occurrenceId: occurrence.id,
    taskDefinitionId: definition.id,
    title: definition.title,
    triggerAtMs,
    channelId: NOTIFICATION_CHANNEL_ID,
    data: {
      kind: 'task-reminder',
      occurrenceId: occurrence.id,
      taskDefinitionId: definition.id,
      reminderSlot: 'default',
      triggerAtMs,
      payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
    },
  };
}
