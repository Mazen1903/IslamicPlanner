import { PRAYERS, type Prayer } from '@/constants/prayers';
import type {
  ScheduleType,
  ScheduleDataFor,
  ExactTimeData,
  PrayerRelativeData,
  PrayerWindowData,
  AnytimeTodayData,
} from '@/domain/task/types';
import { DataIntegrityError } from '@/domain/task/errors';

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isPrayer(val: unknown): val is Prayer {
  return typeof val === 'string' && (PRAYERS as readonly string[]).includes(val);
}

/**
 * Validates and parses raw scheduleData JSON for a given scheduleType.
 * Throws DataIntegrityError on invalid JSON or malformed structure.
 * Ignores any extraneous "type" key to satisfy SD-06.
 */
export function parseScheduleData<T extends ScheduleType>(
  scheduleType: T,
  rawJson: string
): ScheduleDataFor<T> {
  if (typeof rawJson !== 'string') {
    throw new DataIntegrityError(`scheduleData must be a JSON string, received ${typeof rawJson}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    throw new DataIntegrityError(
      `Invalid JSON in scheduleData for ${scheduleType}: ${rawJson}`,
      { cause: err }
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new DataIntegrityError(
      `scheduleData payload must be a JSON object, received ${Array.isArray(parsed) ? 'array' : typeof parsed}`
    );
  }

  switch (scheduleType) {
    case 'EXACT_TIME': {
      if (typeof parsed.localTime !== 'string' || !TIME_REGEX.test(parsed.localTime)) {
        throw new DataIntegrityError(
          `Invalid localTime in EXACT_TIME scheduleData: expected HH:mm (00:00-23:59), got ${JSON.stringify(parsed.localTime)}`
        );
      }
      const data: ExactTimeData = { localTime: parsed.localTime };
      return data as ScheduleDataFor<T>;
    }

    case 'PRAYER_RELATIVE': {
      if (!isPrayer(parsed.anchorPrayer)) {
        throw new DataIntegrityError(
          `Invalid anchorPrayer in PRAYER_RELATIVE scheduleData: expected one of ${PRAYERS.join(', ')}, got ${JSON.stringify(parsed.anchorPrayer)}`
        );
      }
      if (parsed.direction !== 'BEFORE' && parsed.direction !== 'AFTER') {
        throw new DataIntegrityError(
          `Invalid direction in PRAYER_RELATIVE scheduleData: expected 'BEFORE' or 'AFTER', got ${JSON.stringify(parsed.direction)}`
        );
      }
      if (
        typeof parsed.offsetMinutes !== 'number' ||
        !Number.isInteger(parsed.offsetMinutes) ||
        parsed.offsetMinutes < 0
      ) {
        throw new DataIntegrityError(
          `Invalid offsetMinutes in PRAYER_RELATIVE scheduleData: expected non-negative integer, got ${JSON.stringify(parsed.offsetMinutes)}`
        );
      }
      const data: PrayerRelativeData = {
        anchorPrayer: parsed.anchorPrayer,
        direction: parsed.direction,
        offsetMinutes: parsed.offsetMinutes,
      };
      return data as ScheduleDataFor<T>;
    }

    case 'PRAYER_WINDOW': {
      if (!isPrayer(parsed.startPrayer)) {
        throw new DataIntegrityError(
          `Invalid startPrayer in PRAYER_WINDOW scheduleData: expected one of ${PRAYERS.join(', ')}, got ${JSON.stringify(parsed.startPrayer)}`
        );
      }
      if (!isPrayer(parsed.endPrayer)) {
        throw new DataIntegrityError(
          `Invalid endPrayer in PRAYER_WINDOW scheduleData: expected one of ${PRAYERS.join(', ')}, got ${JSON.stringify(parsed.endPrayer)}`
        );
      }
      const data: PrayerWindowData = {
        startPrayer: parsed.startPrayer,
        endPrayer: parsed.endPrayer,
      };
      return data as ScheduleDataFor<T>;
    }

    case 'ANYTIME_TODAY': {
      const data: AnytimeTodayData = {};
      return data as ScheduleDataFor<T>;
    }

    default:
      throw new DataIntegrityError(`Unknown scheduleType: ${scheduleType}`);
  }
}

/**
 * Validates and serializes typed scheduleData into JSON string.
 * Strips any redundant "type" property to satisfy ADR-020.
 */
export function serializeScheduleData<T extends ScheduleType>(
  scheduleType: T,
  data: ScheduleDataFor<T>
): string {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new DataIntegrityError(`scheduleData to serialize must be an object`);
  }

  // Deep copy / strip any unwanted "type" property
  const cleaned: Record<string, unknown> = { ...data };
  delete cleaned.type;

  // Validate before serialization
  parseScheduleData(scheduleType, JSON.stringify(cleaned));

  return JSON.stringify(cleaned);
}
