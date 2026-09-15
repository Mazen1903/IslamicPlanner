import type { Prayer } from '@/constants/prayers';
import { PRAYERS, PRAYER_ORDER } from '@/constants/prayers';
import { PlanningDayEngine, PlanningDayError } from '@/domain/planning-day';
import type { PlanningDay } from '@/domain/planning-day/types';
import type { PrayerPeriodInstance } from '@/domain/prayer/types';
import type {
  ExactTimeData,
  PrayerRelativeData,
  PrayerWindowData,
  TaskDefinition,
  TaskOccurrence,
} from '@/domain/task/types';
import {
  getEffectiveTimezone,
  resolveWallClock,
  TemporalResolutionError,
} from '@/domain/temporal';
import { isValidCivilDate } from '@/utils/dateValidation';
import type {
  ResolvedPlacement,
  SchedulingContext,
  SchedulingEngineAPI,
} from './types';
import { SchedulingResolutionError } from './types';

/**
 * Validates that an object has the shape of ExactTimeData.
 */
function validateExactTimeData(data: unknown): data is ExactTimeData {
  if (!data || typeof data !== 'object') return false;
  const { localTime } = data as Record<string, unknown>;
  return typeof localTime === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(localTime);
}

/**
 * Validates that an object has the shape of PrayerRelativeData.
 */
function validatePrayerRelativeData(data: unknown): data is PrayerRelativeData {
  if (!data || typeof data !== 'object') return false;
  const { anchorPrayer, direction, offsetMinutes } = data as Record<string, unknown>;
  return (
    typeof anchorPrayer === 'string' &&
    PRAYERS.includes(anchorPrayer as Prayer) &&
    (direction === 'BEFORE' || direction === 'AFTER') &&
    typeof offsetMinutes === 'number' &&
    Number.isInteger(offsetMinutes) &&
    offsetMinutes >= 0
  );
}

/**
 * Validates that an object has the shape of PrayerWindowData.
 */
function validatePrayerWindowData(data: unknown): data is PrayerWindowData {
  if (!data || typeof data !== 'object') return false;
  const { startPrayer, endPrayer } = data as Record<string, unknown>;
  return (
    typeof startPrayer === 'string' &&
    PRAYERS.includes(startPrayer as Prayer) &&
    typeof endPrayer === 'string' &&
    PRAYERS.includes(endPrayer as Prayer)
  );
}

/**
 * Resolves the planningDayKey for an absolute reference time using PlanningDayEngine.
 * Catches lower-level errors and adapts them to SchedulingResolutionError.
 */
function resolvePlanningDayKeyForTime(
  context: SchedulingContext,
  time: import('luxon').DateTime
): string {
  try {
    const planningDay: PlanningDay = PlanningDayEngine.resolvePlanningDayForTime(
      context.planningDayConfig,
      context.timeline,
      time
    );
    return planningDay.key;
  } catch (err) {
    if (err instanceof TemporalResolutionError) {
      if (err.code === 'INVALID_TIMEZONE') {
        throw new SchedulingResolutionError('INVALID_TEMPORAL_CONTEXT', err.message, { cause: err });
      }
      throw new SchedulingResolutionError('INSUFFICIENT_TIMELINE', err.message, { cause: err });
    }
    if (err instanceof PlanningDayError) {
      throw new SchedulingResolutionError('INSUFFICIENT_TIMELINE', err.message, { cause: err });
    }
    throw new SchedulingResolutionError(
      'INSUFFICIENT_TIMELINE',
      `Failed to resolve planning day for time ${time.toISO()}: ${(err as Error).message}`,
      { cause: err }
    );
  }
}

/**
 * Pure domain resolver that computes temporal placement for a TaskDefinition on a seed date.
 */
export function resolvePlacement(
  taskDefinition: TaskDefinition,
  occurrenceSeedDate: string,
  context: SchedulingContext
): ResolvedPlacement {
  // 1. Validate occurrence seed date
  if (!isValidCivilDate(occurrenceSeedDate)) {
    throw new SchedulingResolutionError(
      'INVALID_SEED_DATE',
      `Invalid occurrence seed date "${occurrenceSeedDate}". Expected valid YYYY-MM-DD Gregorian civil date.`
    );
  }

  // 2. Extract and validate effective timeline timezone
  let effectiveTimezone: string;
  try {
    effectiveTimezone = getEffectiveTimezone(context.timeline);
  } catch (err) {
    if (err instanceof TemporalResolutionError) {
      throw new SchedulingResolutionError('INVALID_TEMPORAL_CONTEXT', err.message, { cause: err });
    }
    throw new SchedulingResolutionError(
      'INVALID_TEMPORAL_CONTEXT',
      `Cannot determine effective timezone from timeline: ${(err as Error).message}`,
      { cause: err }
    );
  }

  // 3. Dispatch by scheduleType
  switch (taskDefinition.scheduleType) {
    case 'EXACT_TIME': {
      if (!validateExactTimeData(taskDefinition.scheduleData)) {
        throw new SchedulingResolutionError(
          'INVALID_SCHEDULE_DATA',
          `Invalid ExactTimeData: localTime must be "HH:mm" (00:00 to 23:59). Found: ${JSON.stringify(
            taskDefinition.scheduleData
          )}`
        );
      }

      const { localTime } = taskDefinition.scheduleData;
      let wallClock;
      try {
        wallClock = resolveWallClock(occurrenceSeedDate, localTime, effectiveTimezone);
      } catch (err) {
        if (err instanceof TemporalResolutionError) {
          if (err.code === 'INVALID_TIME_FORMAT' || err.code === 'UNRESOLVABLE_DATETIME') {
            throw new SchedulingResolutionError('INVALID_SCHEDULE_DATA', err.message, { cause: err });
          }
          if (err.code === 'INVALID_DATE_FORMAT') {
            throw new SchedulingResolutionError('INVALID_SEED_DATE', err.message, { cause: err });
          }
          if (err.code === 'INVALID_TIMEZONE') {
            throw new SchedulingResolutionError('INVALID_TEMPORAL_CONTEXT', err.message, { cause: err });
          }
        }
        throw new SchedulingResolutionError(
          'INVALID_SCHEDULE_DATA',
          `Failed to resolve wall-clock time: ${(err as Error).message}`,
          { cause: err }
        );
      }

      const resolvedTime = wallClock.resolvedTime;

      // Find prayer period containing resolved time
      let period: PrayerPeriodInstance;
      try {
        period = context.timeline.findPeriod(resolvedTime);
      } catch (err) {
        throw new SchedulingResolutionError(
          'INSUFFICIENT_TIMELINE',
          `Resolved time ${resolvedTime.toISO()} falls outside PrayerTimeline coverage`,
          { cause: err }
        );
      }

      const planningDayKey = resolvePlanningDayKeyForTime(context, resolvedTime);

      return {
        localDate: occurrenceSeedDate,
        planningDayKey,
        calculatedStartTime: resolvedTime,
        calculatedPrayerSection: period.prayer,
        eligiblePrayerSections: null,
        wallClockResolution: wallClock.resolution,
        windowStart: null,
        windowEnd: null,
      };
    }

    case 'PRAYER_RELATIVE': {
      if (!validatePrayerRelativeData(taskDefinition.scheduleData)) {
        throw new SchedulingResolutionError(
          'INVALID_SCHEDULE_DATA',
          `Invalid PrayerRelativeData. Found: ${JSON.stringify(taskDefinition.scheduleData)}`
        );
      }

      const { anchorPrayer, direction, offsetMinutes } = taskDefinition.scheduleData;

      // Find concrete anchor period in timeline matching (anchorPrayer, occurrenceSeedDate)
      const anchorPeriod = context.timeline.periods.find(
        (p) => p.prayer === anchorPrayer && p.sourceDate === occurrenceSeedDate
      );

      if (!anchorPeriod) {
        throw new SchedulingResolutionError(
          'MISSING_PRAYER_ANCHOR',
          `Prayer anchor "${anchorPrayer}" not found in timeline for source date "${occurrenceSeedDate}".`
        );
      }

      const offset = direction === 'AFTER' ? offsetMinutes : -offsetMinutes;
      const resolvedTime = anchorPeriod.start.plus({ minutes: offset });

      // Reclassify using actual period containing resolved time
      let period: PrayerPeriodInstance;
      try {
        period = context.timeline.findPeriod(resolvedTime);
      } catch (err) {
        throw new SchedulingResolutionError(
          'INSUFFICIENT_TIMELINE',
          `Prayer-relative resolved time ${resolvedTime.toISO()} falls outside PrayerTimeline coverage`,
          { cause: err }
        );
      }

      const planningDayKey = resolvePlanningDayKeyForTime(context, resolvedTime);

      return {
        localDate: occurrenceSeedDate,
        planningDayKey,
        calculatedStartTime: resolvedTime,
        calculatedPrayerSection: period.prayer,
        eligiblePrayerSections: null,
        wallClockResolution: null,
        windowStart: null,
        windowEnd: null,
      };
    }

    case 'PRAYER_WINDOW': {
      if (!validatePrayerWindowData(taskDefinition.scheduleData)) {
        throw new SchedulingResolutionError(
          'INVALID_SCHEDULE_DATA',
          `Invalid PrayerWindowData. Found: ${JSON.stringify(taskDefinition.scheduleData)}`
        );
      }

      const { startPrayer, endPrayer } = taskDefinition.scheduleData;

      if (startPrayer === endPrayer) {
        throw new SchedulingResolutionError(
          'INVALID_PRAYER_WINDOW',
          `Prayer window cannot start and end at the same prayer "${startPrayer}".`
        );
      }

      const startIdx = PRAYER_ORDER.indexOf(startPrayer);
      const endIdx = PRAYER_ORDER.indexOf(endPrayer);

      if (endIdx < startIdx) {
        throw new SchedulingResolutionError(
          'INVALID_PRAYER_WINDOW',
          `Prayer window wrapping across days is not supported in v1 (start="${startPrayer}", end="${endPrayer}").`
        );
      }

      const startPeriod = context.timeline.periods.find(
        (p) => p.prayer === startPrayer && p.sourceDate === occurrenceSeedDate
      );
      const endPeriod = context.timeline.periods.find(
        (p) => p.prayer === endPrayer && p.sourceDate === occurrenceSeedDate
      );

      if (!startPeriod || !endPeriod) {
        throw new SchedulingResolutionError(
          'MISSING_PRAYER_ANCHOR',
          `Prayer window anchors [${startPrayer}, ${endPrayer}] not found in timeline for source date "${occurrenceSeedDate}".`
        );
      }

      const windowStart = startPeriod.start;
      const windowEnd = endPeriod.start;
      const eligiblePrayerSections = PRAYER_ORDER.slice(startIdx, endIdx);

      // Planning day key is derived from the concrete window start
      const planningDayKey = resolvePlanningDayKeyForTime(context, windowStart);

      return {
        localDate: occurrenceSeedDate,
        planningDayKey,
        calculatedStartTime: null,
        calculatedPrayerSection: null,
        eligiblePrayerSections,
        wallClockResolution: null,
        windowStart,
        windowEnd,
      };
    }

    case 'ANYTIME_TODAY': {
      return {
        localDate: occurrenceSeedDate,
        planningDayKey: occurrenceSeedDate,
        calculatedStartTime: null,
        calculatedPrayerSection: null,
        eligiblePrayerSections: null,
        wallClockResolution: null,
        windowStart: null,
        windowEnd: null,
      };
    }

    default: {
      const unsupportedType = (taskDefinition as { scheduleType?: unknown }).scheduleType;
      throw new SchedulingResolutionError(
        'UNSUPPORTED_SCHEDULE_TYPE',
        `Unsupported schedule type: "${String(unsupportedType)}".`
      );
    }
  }
}

/**
 * Re-evaluates placement for an existing occurrence against its TaskDefinition.
 * Enforces occurrence identity and non-terminal status guards.
 */
export function recalculateOccurrencePlacement(
  occurrence: TaskOccurrence,
  taskDefinition: TaskDefinition,
  context: SchedulingContext
): ResolvedPlacement {
  if (
    occurrence.taskDefinitionId !== taskDefinition.id ||
    occurrence.seriesId !== taskDefinition.seriesId
  ) {
    throw new SchedulingResolutionError(
      'OCCURRENCE_DEFINITION_MISMATCH',
      `Occurrence ${occurrence.id} (defId=${occurrence.taskDefinitionId}, seriesId=${occurrence.seriesId}) does not match TaskDefinition (id=${taskDefinition.id}, seriesId=${taskDefinition.seriesId}).`
    );
  }

  if (
    occurrence.status === 'COMPLETED' ||
    occurrence.status === 'MISSED' ||
    occurrence.status === 'CANCELLED'
  ) {
    throw new SchedulingResolutionError(
      'TERMINAL_OCCURRENCE',
      `Cannot recalculate placement for terminal occurrence ${occurrence.id} with status "${occurrence.status}".`
    );
  }

  return resolvePlacement(taskDefinition, occurrence.localDate, context);
}

/**
 * SchedulingEngine facade implementing SchedulingEngineAPI.
 */
export const SchedulingEngine: SchedulingEngineAPI = {
  resolvePlacement,
  recalculateOccurrencePlacement,
};
