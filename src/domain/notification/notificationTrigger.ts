import { DateTime } from 'luxon';
import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_PAYLOAD_VERSION,
  NOTIFICATION_DEFAULT_SLOT,
  type DesiredNotification,
} from './types';
import { buildNotificationId } from './notificationIdentity';
import {
  normalizeReminderRule,
  DEFAULT_ANYTIME_REMINDER_TIME,
  formatReminderOffset,
} from './reminderRule';

/**
 * Builds a rich notification body text.
 * e.g. "Starts in 10 min · 1:45 PM", "Starting now · 2:00 PM", or "Scheduled for today".
 */
export function buildNotificationBody(
  occurrence: TaskOccurrence,
  definition: TaskDefinition,
  offsetMinutes?: number
): string {
  let relativePart = 'Scheduled for today';

  if (typeof offsetMinutes === 'number') {
    if (offsetMinutes < 0) {
      const abs = Math.abs(offsetMinutes);
      if (abs === 1440) {
        relativePart = 'Starts in 1 day';
      } else if (abs >= 60 && abs % 60 === 0) {
        const h = abs / 60;
        relativePart = `Starts in ${h} ${h === 1 ? 'hour' : 'hours'}`;
      } else {
        relativePart = `Starts in ${abs} min`;
      }
    } else if (offsetMinutes === 0) {
      relativePart = 'Starting now';
    } else {
      relativePart = `Due in ${offsetMinutes} min`;
    }
  }

  // Format start time if available
  const startTimeIso = occurrence.calculatedStartTime || occurrence.windowStart;
  if (startTimeIso) {
    try {
      const dt = occurrence.timezone
        ? DateTime.fromISO(startTimeIso, { zone: occurrence.timezone })
        : DateTime.fromISO(startTimeIso);
      if (dt.isValid) {
        const formattedTime = dt.toFormat('h:mm a');
        return `${relativePart} · ${formattedTime}`;
      }
    } catch {
      // Fallback to relative part
    }
  }

  return relativePart;
}

export interface DerivedTriggerSlot {
  slot: string;
  triggerAtMs: number;
  offsetMinutes?: number;
}

/**
 * Derives all upcoming trigger slots (ms) for a task occurrence reminder.
 * Returns empty array if not eligible or if all triggers are in the past.
 */
export function deriveNotificationTriggers(
  occurrence: TaskOccurrence,
  definition: TaskDefinition,
  nowMs: number
): DerivedTriggerSlot[] {
  // 1. Status eligibility: PENDING only
  if (occurrence.status !== 'PENDING') {
    return [];
  }

  // 2. Reminder rule normalization
  const normalized = normalizeReminderRule(definition.reminderRule);
  if (!normalized) {
    return [];
  }

  // 3. ANYTIME_TODAY handling
  if (definition.scheduleType === 'ANYTIME_TODAY') {
    if (!normalized.timeOfDay) {
      return [];
    }
    const timeOfDay = normalized.timeOfDay;
    let anchorMs: number | null = null;

    try {
      const dt = DateTime.fromISO(`${occurrence.localDate}T${timeOfDay}:00`, {
        zone: occurrence.timezone || 'UTC',
      });
      if (dt.isValid) {
        anchorMs = dt.toMillis();
      }
    } catch {
      // Ignore parse failure
    }

    if (!anchorMs || Number.isNaN(anchorMs)) {
      anchorMs = Date.parse(`${occurrence.localDate}T${timeOfDay}:00Z`);
    }

    if (Number.isNaN(anchorMs) || anchorMs <= nowMs) {
      return [];
    }

    return [{ slot: NOTIFICATION_DEFAULT_SLOT, triggerAtMs: anchorMs }];
  }

  // 4. Resolve anchor instant string for timed tasks
  let anchorIso: string | null = null;
  if (definition.scheduleType === 'EXACT_TIME' || definition.scheduleType === 'PRAYER_RELATIVE') {
    anchorIso = occurrence.calculatedStartTime;
  } else if (definition.scheduleType === 'PRAYER_WINDOW') {
    anchorIso = occurrence.windowStart;
  }

  if (!anchorIso) {
    return [];
  }

  const anchorMs = Date.parse(anchorIso);
  if (Number.isNaN(anchorMs)) {
    return [];
  }

  const results: DerivedTriggerSlot[] = [];

  normalized.offsetsMinutes.forEach((offset, idx) => {
    // Math: anchor + offset (offset is negative for "before", 0 for "at time")
    const triggerAtMs = anchorMs + Math.round(offset * 60_000);
    if (triggerAtMs > nowMs) {
      const slot = normalized.offsetsMinutes.length === 1 ? NOTIFICATION_DEFAULT_SLOT : `r${idx}`;
      results.push({
        slot,
        triggerAtMs,
        offsetMinutes: offset,
      });
    }
  });

  return results;
}

/**
 * Derives the single primary/earliest upcoming trigger timestamp (ms) for backward compatibility.
 * Returns null if not eligible or if all triggers are in the past.
 */
export function deriveNotificationTrigger(
  occurrence: TaskOccurrence,
  definition: TaskDefinition,
  nowMs: number
): number | null {
  const triggers = deriveNotificationTriggers(occurrence, definition, nowMs);
  if (triggers.length === 0) {
    return null;
  }
  // Return earliest upcoming trigger
  return triggers[0].triggerAtMs;
}

/**
 * Derives all canonical DesiredNotification objects for an eligible occurrence.
 */
export function deriveDesiredNotifications(
  occurrence: TaskOccurrence,
  definition: TaskDefinition,
  nowMs: number,
  channelId = NOTIFICATION_CHANNEL_ID
): DesiredNotification[] {
  const triggers = deriveNotificationTriggers(occurrence, definition, nowMs);
  if (triggers.length === 0) {
    return [];
  }

  return triggers.map(({ slot, triggerAtMs, offsetMinutes }) => {
    const identifier = buildNotificationId(occurrence.id, slot);
    return {
      identifier,
      occurrenceId: occurrence.id,
      taskDefinitionId: definition.id,
      title: definition.title,
      triggerAtMs,
      channelId,
      data: {
        kind: 'task-reminder',
        occurrenceId: occurrence.id,
        taskDefinitionId: definition.id,
        reminderSlot: slot,
        triggerAtMs,
        payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
        body: buildNotificationBody(occurrence, definition, offsetMinutes),
      },
    };
  });
}

/**
 * Derives the single canonical DesiredNotification object for an eligible occurrence (earliest slot).
 * Returns null if not eligible or if trigger is in the past.
 */
export function deriveDesiredNotification(
  occurrence: TaskOccurrence,
  definition: TaskDefinition,
  nowMs: number
): DesiredNotification | null {
  const all = deriveDesiredNotifications(occurrence, definition, nowMs);
  return all.length > 0 ? all[0] : null;
}

