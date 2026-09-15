import { PRAYERS, type Prayer } from '@/constants/prayers';
import type {
  SubtaskTemplate,
  OccurrenceOverrideData,
  HijriRecurrenceData,
  ReminderRule,
} from '@/domain/task/types';
import { DataIntegrityError } from '@/domain/task/errors';


function isPrayer(val: unknown): val is Prayer {
  return typeof val === 'string' && (PRAYERS as readonly string[]).includes(val);
}

// ==========================================
// Tags JSON Boundary
// ==========================================

export function parseTags(rawJson: string | null | undefined): string[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string')) {
      throw new DataIntegrityError('tags must be a JSON array of strings');
    }
    return parsed;
  } catch (err) {
    if (err instanceof DataIntegrityError) throw err;
    throw new DataIntegrityError(`Malformed tags JSON: ${rawJson}`, { cause: err });
  }
}

export function serializeTags(tags: string[] | null | undefined): string | null {
  if (!tags || tags.length === 0) return null;
  if (!Array.isArray(tags) || !tags.every(item => typeof item === 'string')) {
    throw new DataIntegrityError('tags to serialize must be an array of strings');
  }
  return JSON.stringify(tags);
}

// ==========================================
// Subtasks JSON Boundary
// ==========================================

export function parseSubtasks(rawJson: string | null | undefined): SubtaskTemplate[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) {
      throw new DataIntegrityError('subtasks must be a JSON array of SubtaskTemplate');
    }
    const seenIds = new Set<string>();
    for (const item of parsed) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof item.id !== 'string' ||
        item.id.trim() === '' ||
        typeof item.title !== 'string'
      ) {
        throw new DataIntegrityError('Invalid subtask item: must have non-empty id and string title');
      }
      if (seenIds.has(item.id)) {
        throw new DataIntegrityError(`Duplicate subtask id detected in template: ${item.id}`);
      }
      seenIds.add(item.id);
    }
    return parsed as SubtaskTemplate[];
  } catch (err) {
    if (err instanceof DataIntegrityError) throw err;
    throw new DataIntegrityError(`Malformed subtasks JSON: ${rawJson}`, { cause: err });
  }
}

export function serializeSubtasks(subtasks: SubtaskTemplate[] | null | undefined): string | null {
  if (!subtasks || subtasks.length === 0) return null;
  // Validate structure and unique IDs
  parseSubtasks(JSON.stringify(subtasks));
  return JSON.stringify(subtasks);
}

// ==========================================
// Reminder Rule JSON Boundary
// ==========================================

export function parseReminderRule(rawJson: string | null | undefined): ReminderRule | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new DataIntegrityError('reminderRule must be a JSON object');
    }
    return parsed as ReminderRule;
  } catch (err) {
    if (err instanceof DataIntegrityError) throw err;
    throw new DataIntegrityError(`Malformed reminderRule JSON: ${rawJson}`, { cause: err });
  }
}

export function serializeReminderRule(rule: ReminderRule | null | undefined): string | null {
  if (!rule) return null;
  if (typeof rule !== 'object' || Array.isArray(rule)) {
    throw new DataIntegrityError('reminderRule must be an object');
  }
  return JSON.stringify(rule);
}

// ==========================================
// Hijri Recurrence JSON Boundary
// ==========================================

export function parseHijriRecurrence(rawJson: string | null | undefined): HijriRecurrenceData | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new DataIntegrityError('hijriRecurrence must be a JSON object');
    }
    if (parsed.hijriDays !== null && (!Array.isArray(parsed.hijriDays) || !parsed.hijriDays.every((d: any) => typeof d === 'number'))) {
      throw new DataIntegrityError('hijriRecurrence.hijriDays must be an array of numbers or null');
    }
    if (parsed.hijriMonths !== null && (!Array.isArray(parsed.hijriMonths) || !parsed.hijriMonths.every((m: any) => typeof m === 'number'))) {
      throw new DataIntegrityError('hijriRecurrence.hijriMonths must be an array of numbers or null');
    }
    return parsed as HijriRecurrenceData;
  } catch (err) {
    if (err instanceof DataIntegrityError) throw err;
    throw new DataIntegrityError(`Malformed hijriRecurrence JSON: ${rawJson}`, { cause: err });
  }
}

export function serializeHijriRecurrence(data: HijriRecurrenceData | null | undefined): string | null {
  if (!data) return null;
  parseHijriRecurrence(JSON.stringify(data));
  return JSON.stringify(data);
}

// ==========================================
// Eligible Prayer Sections JSON Boundary
// ==========================================

export function parseEligiblePrayerSections(rawJson: string | null | undefined): Prayer[] | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) {
      throw new DataIntegrityError('eligiblePrayerSections must be a JSON array of Prayer');
    }
    for (const item of parsed) {
      if (!isPrayer(item)) {
        throw new DataIntegrityError(
          `Invalid prayer in eligiblePrayerSections: expected one of ${PRAYERS.join(', ')}, got ${JSON.stringify(item)}`
        );
      }
    }
    return parsed as Prayer[];
  } catch (err) {
    if (err instanceof DataIntegrityError) throw err;
    throw new DataIntegrityError(`Malformed eligiblePrayerSections JSON: ${rawJson}`, { cause: err });
  }
}

export function serializeEligiblePrayerSections(sections: Prayer[] | null | undefined): string | null {
  if (!sections || sections.length === 0) return null;
  parseEligiblePrayerSections(JSON.stringify(sections));
  return JSON.stringify(sections);
}

// ==========================================
// Occurrence Override Data JSON Boundary
// ==========================================

export function parseOverrideData(rawJson: string | null | undefined): OccurrenceOverrideData | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new DataIntegrityError('overrideData must be a JSON object');
    }
    if (parsed.completedSubtaskIds !== undefined && (!Array.isArray(parsed.completedSubtaskIds) || !parsed.completedSubtaskIds.every((id: any) => typeof id === 'string'))) {
      throw new DataIntegrityError('overrideData.completedSubtaskIds must be an array of strings');
    }
    if (parsed.title !== undefined && typeof parsed.title !== 'string') {
      throw new DataIntegrityError('overrideData.title must be a string');
    }
    if (parsed.notes !== undefined && typeof parsed.notes !== 'string') {
      throw new DataIntegrityError('overrideData.notes must be a string');
    }
    return parsed as OccurrenceOverrideData;
  } catch (err) {
    if (err instanceof DataIntegrityError) throw err;
    throw new DataIntegrityError(`Malformed overrideData JSON: ${rawJson}`, { cause: err });
  }
}

export function serializeOverrideData(data: OccurrenceOverrideData | null | undefined): string | null {
  if (!data) return null;
  parseOverrideData(JSON.stringify(data));
  return JSON.stringify(data);
}
