import type { ReminderRule } from '@/domain/task/types';

export const MAX_REMINDERS_PER_TASK = 3;
export const DEFAULT_ANYTIME_REMINDER_TIME = '09:00';

export interface NormalizedReminderRule {
  offsetsMinutes: number[];
  timeOfDay?: string;
}

/**
 * Normalizes any ReminderRule (including legacy single-offset shapes) into a canonical shape.
 * - Extracts offsets from `offsetsMinutes` array or legacy `offsetMinutes`.
 * - Validates integer numbers, deduplicates, and sorts chronologically (most negative first).
 * - Caps at MAX_REMINDERS_PER_TASK (3).
 * - Validates HH:mm timeOfDay if present.
 * - Returns null if no valid offsets and no valid timeOfDay exist.
 */
export function normalizeReminderRule(
  rule: ReminderRule | null | undefined
): NormalizedReminderRule | null {
  if (!rule || typeof rule !== 'object') {
    return null;
  }

  const rawOffsets: number[] = [];

  if (Array.isArray(rule.offsetsMinutes)) {
    for (const val of rule.offsetsMinutes) {
      if (typeof val === 'number' && Number.isFinite(val)) {
        rawOffsets.push(Math.round(val));
      }
    }
  } else if (typeof rule.offsetMinutes === 'number' && Number.isFinite(rule.offsetMinutes)) {
    rawOffsets.push(Math.round(rule.offsetMinutes));
  }

  // Deduplicate and sort chronologically (e.g. -60 before -15 before 0)
  const uniqueOffsets = Array.from(new Set(rawOffsets)).sort((a, b) => a - b);
  const cappedOffsets = uniqueOffsets.slice(0, MAX_REMINDERS_PER_TASK);

  // Validate timeOfDay (HH:mm 24-hour format)
  let validTimeOfDay: string | undefined = undefined;
  if (typeof rule.timeOfDay === 'string' && /^\d{2}:\d{2}$/.test(rule.timeOfDay.trim())) {
    const [h, m] = rule.timeOfDay.trim().split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      validTimeOfDay = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  if (cappedOffsets.length === 0 && !validTimeOfDay) {
    return null;
  }

  return {
    offsetsMinutes: cappedOffsets,
    ...(validTimeOfDay ? { timeOfDay: validTimeOfDay } : {}),
  };
}

/**
 * Formats a single offset in minutes into human-readable label.
 * Sign convention: negative = before anchor, 0 = at time of task, positive = after.
 */
export function formatReminderOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) {
    return 'At time of task';
  }

  const abs = Math.abs(offsetMinutes);
  let timeStr = '';
  if (abs === 1440) {
    timeStr = '1 day';
  } else if (abs >= 60 && abs % 60 === 0) {
    const hours = abs / 60;
    timeStr = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else {
    timeStr = `${abs} min`;
  }

  if (offsetMinutes < 0) {
    return `${timeStr} before`;
  }
  return `${timeStr} after`;
}

/**
 * Formats a short summary for display in card rows (e.g., "10 min before +1", "At 9:00 AM", or "None").
 */
export function formatReminderSummary(
  rule: ReminderRule | null | undefined,
  isAnytime = false
): string {
  const normalized = normalizeReminderRule(rule);
  if (!normalized) {
    return 'None';
  }

  if (isAnytime) {
    const time = normalized.timeOfDay || DEFAULT_ANYTIME_REMINDER_TIME;
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const displayMinute = m.toString().padStart(2, '0');
    return `At ${displayHour}:${displayMinute} ${period}`;
  }

  if (normalized.offsetsMinutes.length === 0) {
    return 'None';
  }

  const firstLabel = formatReminderOffset(normalized.offsetsMinutes[0]);
  const extraCount = normalized.offsetsMinutes.length - 1;

  if (extraCount > 0) {
    return `${firstLabel} +${extraCount}`;
  }
  return firstLabel;
}
