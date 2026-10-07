import type { ReminderRule, ReminderRuleV2, ReminderPrayerAnchor } from '@/domain/task/types';

export const MAX_REMINDERS_PER_TASK = 3;
export const DEFAULT_ANYTIME_REMINDER_TIME = '09:00';

export interface NormalizedReminderRule {
  offsetsMinutes: number[];
  timeOfDay?: string;
  version?: 2;
  enabled?: boolean;
  prayerAnchors?: ReminderPrayerAnchor[];
  type?: 'STANDARD' | 'ENHANCED';
  enhancedMode?: 'FULL_SCREEN' | 'PERSISTENT';
  soundId?: string;
  playbackCount?: 1 | 3 | 'LOOP';
  backgroundId?: string;
  timeSensitive?: boolean;
  nag?: { everyMinutes: number; maxTimes: number };
}

/**
 * Normalizes any ReminderRule (including legacy single-offset shapes) into a canonical shape.
 * - Extracts offsets from `offsetsMinutes` array or legacy `offsetMinutes`.
 * - Validates integer numbers, deduplicates, and sorts chronologically (most negative first).
 * - Validates HH:mm timeOfDay if present.
 * - Returns null if no valid offsets, no prayer anchors, and no valid timeOfDay exist.
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

  // Validate timeOfDay (HH:mm 24-hour format)
  let validTimeOfDay: string | undefined = undefined;
  if (typeof rule.timeOfDay === 'string' && /^\d{2}:\d{2}$/.test(rule.timeOfDay.trim())) {
    const [h, m] = rule.timeOfDay.trim().split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      validTimeOfDay = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  const hasPrayerAnchors = Array.isArray(rule.prayerAnchors) && rule.prayerAnchors.length > 0;

  if (uniqueOffsets.length === 0 && !validTimeOfDay && !hasPrayerAnchors) {
    return null;
  }

  const res: NormalizedReminderRule = {
    offsetsMinutes: uniqueOffsets,
    ...(validTimeOfDay ? { timeOfDay: validTimeOfDay } : {}),
  };

  if (hasPrayerAnchors) res.prayerAnchors = rule.prayerAnchors;
  if (rule.type) res.type = rule.type;
  if (rule.soundId) res.soundId = rule.soundId;
  if (rule.enhancedMode) res.enhancedMode = rule.enhancedMode;
  if (rule.playbackCount) res.playbackCount = rule.playbackCount;
  if (rule.backgroundId) res.backgroundId = rule.backgroundId;
  if (rule.timeSensitive !== undefined) res.timeSensitive = rule.timeSensitive;
  if (rule.nag) res.nag = rule.nag;
  if (rule.enabled !== undefined) res.enabled = rule.enabled;

  return res;
}

export function toReminderRuleV2(rule: ReminderRule | null | undefined): ReminderRuleV2 {
  const normalized = normalizeReminderRule(rule);
  return {
    version: 2,
    enabled: rule?.enabled ?? (normalized !== null),
    offsetsMinutes: normalized?.offsetsMinutes ?? [],
    prayerAnchors: rule?.prayerAnchors ?? [],
    timeOfDay: normalized?.timeOfDay,
    type: rule?.type === 'ENHANCED' ? 'ENHANCED' : 'STANDARD',
    enhancedMode: rule?.enhancedMode ?? 'FULL_SCREEN',
    soundId: rule?.soundId ?? 'default',
    playbackCount: rule?.playbackCount ?? 1,
    backgroundId: rule?.backgroundId ?? 'night_mosque',
    timeSensitive: rule?.timeSensitive ?? false,
    nag: rule?.nag,
  };
}

export function formatPrayerAnchor(prayer: string, offsetMinutes: number): string {
  const prayerName = prayer.charAt(0).toUpperCase() + prayer.slice(1).toLowerCase();
  if (offsetMinutes === 0) {
    return `At ${prayerName} Adhan`;
  }
  if (offsetMinutes < 0) {
    return `${Math.abs(offsetMinutes)}m before ${prayerName} Adhan`;
  }
  return `${offsetMinutes}m after ${prayerName} Adhan`;
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

  const totalItems = (normalized.offsetsMinutes?.length ?? 0) + (normalized.prayerAnchors?.length ?? 0);
  if (totalItems === 0) {
    return 'None';
  }

  let firstLabel = '';
  if (normalized.offsetsMinutes.length > 0) {
    firstLabel = formatReminderOffset(normalized.offsetsMinutes[0]);
  } else if (normalized.prayerAnchors && normalized.prayerAnchors.length > 0) {
    firstLabel = formatPrayerAnchor(normalized.prayerAnchors[0].prayer, normalized.prayerAnchors[0].offsetMinutes);
  }

  const extraCount = totalItems - 1;
  if (extraCount > 0) {
    return `${firstLabel} +${extraCount}`;
  }
  return firstLabel;
}
