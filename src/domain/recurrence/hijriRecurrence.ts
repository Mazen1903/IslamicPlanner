import { HijriConversionError } from '../calendar/errors';
import type { HijriService } from '../calendar/HijriService';
import type {
  HijriAdjustmentConfig,
  HijriDate,
  HijriReverseResolution,
} from '../calendar/types';
import type { HijriRecurrenceData } from '../task/types';
import { addCivilDays } from './dateUtils';
import { RecurrenceError } from './errors';

/**
 * Validates the structure and value bounds of a HijriRecurrenceData object.
 */
export function validateHijriRule(rule: unknown): HijriRecurrenceData {
  if (!rule || typeof rule !== 'object') {
    throw new RecurrenceError(
      'INVALID_RULE',
      'Hijri recurrence data must be a non-null object'
    );
  }

  const { hijriDays, hijriMonths, description } = rule as Record<string, unknown>;

  if (hijriDays === undefined && hijriMonths === undefined) {
    throw new RecurrenceError('INVALID_RULE', 'Invalid Hijri recurrence rule shape');
  }

  // Both null -> INVALID_RULE
  if (hijriDays === null && hijriMonths === null) {
    throw new RecurrenceError(
      'INVALID_RULE',
      'Hijri recurrence cannot have both hijriDays and hijriMonths as null'
    );
  }

  let validatedDays: number[] | null = null;
  if (hijriDays !== null) {
    if (!Array.isArray(hijriDays) || hijriDays.length === 0) {
      throw new RecurrenceError(
        'INVALID_RULE',
        'hijriDays must be a non-empty array when present'
      );
    }
    for (const d of hijriDays) {
      if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 30) {
        throw new RecurrenceError(
          'INVALID_RULE',
          `Invalid hijriDay "${d}". Must be an integer in 1..30.`
        );
      }
    }
    validatedDays = Array.from(new Set(hijriDays)).sort((a, b) => a - b);
  }

  let validatedMonths: number[] | null = null;
  if (hijriMonths !== null) {
    if (!Array.isArray(hijriMonths) || hijriMonths.length === 0) {
      throw new RecurrenceError(
        'INVALID_RULE',
        'hijriMonths must be a non-empty array when present'
      );
    }
    for (const m of hijriMonths) {
      if (typeof m !== 'number' || !Number.isInteger(m) || m < 1 || m > 12) {
        throw new RecurrenceError(
          'INVALID_RULE',
          `Invalid hijriMonth "${m}". Must be an integer in 1..12.`
        );
      }
    }
    validatedMonths = Array.from(new Set(hijriMonths)).sort((a, b) => a - b);
  }

  return {
    hijriDays: validatedDays,
    hijriMonths: validatedMonths,
    ...(typeof description === 'string' ? { description } : {}),
  };
}

/**
 * Checks whether an effective Hijri date matches the recurrence selector,
 * applying the approved 30 -> 29 day clamping policy for 29-day Hijri months.
 */
export function matchesHijriSelector(
  effectiveH: HijriDate,
  rule: HijriRecurrenceData,
  hijriService: HijriService
): boolean {
  const { hijriDays, hijriMonths } = rule;

  if (hijriMonths !== null && !hijriMonths.includes(effectiveH.month)) {
    return false;
  }

  if (hijriDays === null) {
    return true;
  }

  const daysInMonth = hijriService.getDaysInMonth(effectiveH.year, effectiveH.month);
  for (const d of hijriDays) {
    const clamped = Math.min(d, daysInMonth);
    if (effectiveH.day === clamped) {
      return true;
    }
  }

  return false;
}

/**
 * Single canonical membership rule for Hijri recurrence evaluation.
 * Used by both occursOn and generateSeedDates to guarantee identical truth.
 */
export function isHijriRecurrenceMember(
  gregorianDate: string,
  hijriRule: HijriRecurrenceData,
  hijriService: HijriService,
  config: HijriAdjustmentConfig
): boolean {
  // 1. Convert candidate date to effective Hijri
  let effectiveH: HijriDate;
  try {
    effectiveH = hijriService.toEffectiveHijri(gregorianDate, config);
  } catch (err) {
    if (
      err instanceof HijriConversionError &&
      (err.code === 'OUT_OF_RANGE' || err.code === 'ADJUSTED_OUT_OF_RANGE')
    ) {
      throw new RecurrenceError(
        'OUT_OF_HIJRI_RANGE',
        `Cannot evaluate Hijri recurrence for date "${gregorianDate}": ${err.message}`,
        { cause: err }
      );
    }
    throw new RecurrenceError(
      'HIJRI_RESOLUTION_FAILED',
      err instanceof Error ? err.message : String(err),
      { cause: err }
    );
  }

  // 2. Check selector match (with clamping)
  if (!matchesHijriSelector(effectiveH, hijriRule, hijriService)) {
    return false;
  }

  // 3. Resolve canonical Gregorian preimage
  let resolution: HijriReverseResolution;
  try {
    resolution = hijriService.resolveGregorianFromEffectiveHijri(effectiveH, config);
  } catch (err) {
    if (
      err instanceof HijriConversionError &&
      (err.code === 'OUT_OF_RANGE' || err.code === 'ADJUSTED_OUT_OF_RANGE')
    ) {
      throw new RecurrenceError(
        'OUT_OF_HIJRI_RANGE',
        `Cannot evaluate Hijri recurrence resolution for date "${gregorianDate}": ${err.message}`,
        { cause: err }
      );
    }
    throw new RecurrenceError(
      'HIJRI_RESOLUTION_FAILED',
      err instanceof Error ? err.message : String(err),
      { cause: err }
    );
  }

  // 4. Resolve ambiguity according to approved policy
  switch (resolution.kind) {
    case 'UNIQUE':
      return gregorianDate === resolution.gregorianDate;

    case 'AMBIGUOUS':
      // POLICY: Earliest Gregorian candidate only
      return gregorianDate === resolution.candidates[0];

    case 'NO_MATCH':
      // POLICY: Skip (no occurrence for shifted-out date)
      return false;
  }
}

/**
 * Generates all Gregorian seed dates for a Hijri recurrence definition
 * across the specified effective civil date window.
 *
 * Fail-fast: if any candidate date inside the effective window cannot be
 * evaluated due to Hijri range limits, throws OUT_OF_HIJRI_RANGE immediately.
 */
export function generateHijriSeedDates(
  rule: HijriRecurrenceData,
  effectiveBegin: string,
  effectiveEnd: string,
  hijriService: HijriService,
  config: HijriAdjustmentConfig
): string[] {
  const dates: string[] = [];
  let curr = effectiveBegin;

  while (curr <= effectiveEnd) {
    if (isHijriRecurrenceMember(curr, rule, hijriService, config)) {
      dates.push(curr);
    }
    curr = addCivilDays(curr, 1);
  }

  return dates;
}
