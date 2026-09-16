import { HijriCalendarAdapter } from './HijriCalendarAdapter';
import type {
  HijriAdjustmentConfig,
  HijriBaseMethod,
  HijriDate,
  HijriReverseResolution,
  HijriServiceConfig,
  HijriSupportedRange,
} from './types';
import { getHijriMonthKey } from './types';
import {
  HijriAdjustmentError,
  HijriConversionError,
  HijriDateError,
  HijriUnsupportedMethodError,
  HijriValidationError,
  type HijriValidationErrorCode,
} from './errors';

/**
 * Authoritative supported range for Umm al-Qura calendar conversion.
 */
export const SUPPORTED_RANGE: HijriSupportedRange = {
  gregorian: {
    min: '1924-08-01',
    max: '2077-11-16',
  },
  hijri: {
    min: { year: 1343, month: 1, day: 1 },
    max: { year: 1500, month: 12, day: 30 },
  },
} as const;

/**
 * Pure Gregorian leap-year check.
 */
export function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Pure Gregorian month-length determination.
 */
export function getDaysInGregorianMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  const days = [
    31,
    isGregorianLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return days[month - 1];
}

/**
 * Pure Gregorian civil date addition/subtraction.
 *
 * Requirements:
 * - YYYY-MM-DD input/output
 * - Integer day arithmetic
 * - Gregorian leap-year rules
 * - Month and year rollover
 * - Zero JavaScript Date timezone dependency
 */
export function addGregorianDays(dateStr: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new HijriValidationError(
      'INVALID_DATE_FORMAT',
      `Invalid Gregorian date format "${dateStr}". Expected YYYY-MM-DD.`
    );
  }

  const [yStr, mStr, dStr] = dateStr.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10);
  let d = parseInt(dStr, 10);

  const maxDays = getDaysInGregorianMonth(y, m);
  if (m < 1 || m > 12 || d < 1 || d > maxDays) {
    throw new HijriValidationError(
      'INVALID_DATE_FORMAT',
      `Invalid Gregorian calendar date "${dateStr}".`
    );
  }

  if (days === 0) return dateStr;

  if (days > 0) {
    let remaining = days;
    while (remaining > 0) {
      const daysInCurrentMonth = getDaysInGregorianMonth(y, m);
      const daysAvailable = daysInCurrentMonth - d;
      if (remaining <= daysAvailable) {
        d += remaining;
        remaining = 0;
      } else {
        remaining -= daysAvailable + 1;
        d = 1;
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }
  } else {
    let remaining = -days;
    while (remaining > 0) {
      if (remaining < d) {
        d -= remaining;
        remaining = 0;
      } else {
        remaining -= d;
        m -= 1;
        if (m < 1) {
          m = 12;
          y -= 1;
        }
        d = getDaysInGregorianMonth(y, m);
      }
    }
  }

  const yyyy = String(y).padStart(4, '0');
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Authoritative domain service for Hijri calendar operations.
 */
export class HijriService {
  private readonly adapter: HijriCalendarAdapter;
  readonly baseMethod: HijriBaseMethod;

  constructor(config?: HijriServiceConfig, adapter?: HijriCalendarAdapter) {
    const method = config?.baseMethod ?? 'UMM_AL_QURA';
    if (method === 'CALCULATED') {
      throw new HijriUnsupportedMethodError(
        'CALCULATED',
        'The CALCULATED Hijri base method is not yet implemented. Use UMM_AL_QURA (default).'
      );
    }
    this.baseMethod = method;
    this.adapter = adapter ?? new HijriCalendarAdapter();
  }

  /**
   * Returns the supported date range for this converter instance.
   */
  getSupportedRange(): HijriSupportedRange {
    return SUPPORTED_RANGE;
  }

  /**
   * Converts a Gregorian civil date string (YYYY-MM-DD) to a canonical HijriDate.
   *
   * Validation pipeline:
   * 1. YYYY-MM-DD syntax check
   * 2. Gregorian calendar structural validity (month, days in month, leap year)
   * 3. Converter supported range check
   * 4. Adapter conversion
   */
  toHijri(gregorianDate: string): HijriDate {
    if (typeof gregorianDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(gregorianDate)) {
      throw new HijriValidationError(
        'INVALID_DATE_FORMAT',
        `Invalid Gregorian date format "${gregorianDate}". Expected YYYY-MM-DD.`
      );
    }

    const [yStr, mStr, dStr] = gregorianDate.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);

    const maxDays = getDaysInGregorianMonth(y, m);
    if (m < 1 || m > 12 || d < 1 || d > maxDays) {
      throw new HijriValidationError(
        'INVALID_DATE_FORMAT',
        `Invalid Gregorian calendar date "${gregorianDate}".`
      );
    }

    if (
      gregorianDate < SUPPORTED_RANGE.gregorian.min ||
      gregorianDate > SUPPORTED_RANGE.gregorian.max
    ) {
      throw new HijriConversionError(
        'OUT_OF_RANGE',
        `Gregorian date "${gregorianDate}" is outside supported range [${SUPPORTED_RANGE.gregorian.min}, ${SUPPORTED_RANGE.gregorian.max}].`
      );
    }

    return this.adapter.gregorianToHijri(y, m, d);
  }

  /**
   * Converts a canonical HijriDate to a Gregorian civil date string (YYYY-MM-DD).
   *
   * Validation pipeline:
   * 1. Structural check (integer year, month, day)
   * 2. Month bounds (1..12)
   * 3. Year range check (1343..1500)
   * 4. Day bounds check (1..30 and exact month length from adapter)
   * 5. Adapter conversion and output range validation
   */
  toGregorian(hijri: HijriDate): string {
    if (
      typeof hijri !== 'object' ||
      hijri === null ||
      typeof hijri.year !== 'number' ||
      !Number.isInteger(hijri.year) ||
      typeof hijri.month !== 'number' ||
      !Number.isInteger(hijri.month) ||
      typeof hijri.day !== 'number' ||
      !Number.isInteger(hijri.day)
    ) {
      throw new HijriValidationError(
        'INVALID_STRUCTURE',
        `HijriDate must be an object with integer year, month, and day fields.`
      );
    }

    if (hijri.month < 1 || hijri.month > 12) {
      throw new HijriValidationError(
        'MONTH_OUT_OF_RANGE',
        `Hijri month ${hijri.month} must be between 1 and 12.`
      );
    }

    if (
      hijri.year < SUPPORTED_RANGE.hijri.min.year ||
      hijri.year > SUPPORTED_RANGE.hijri.max.year
    ) {
      throw new HijriConversionError(
        'OUT_OF_RANGE',
        `Hijri year ${hijri.year} is outside supported range [${SUPPORTED_RANGE.hijri.min.year}, ${SUPPORTED_RANGE.hijri.max.year}].`
      );
    }

    if (hijri.day < 1 || hijri.day > 31) {
      throw new HijriValidationError(
        'DAY_OUT_OF_RANGE',
        `Hijri day ${hijri.day} must be between 1 and 31.`
      );
    }

    const daysInMonth = this.adapter.getDaysInHijriMonth(hijri.year, hijri.month);
    if (hijri.day > daysInMonth) {
      throw new HijriValidationError(
        'DAY_OUT_OF_RANGE',
        `Day ${hijri.day} exceeds month length ${daysInMonth} for Hijri month ${hijri.year}/${hijri.month}.`
      );
    }

    const res = this.adapter.hijriToGregorian(hijri);
    const yyyy = String(res.year).padStart(4, '0');
    const mm = String(res.month).padStart(2, '0');
    const dd = String(res.day).padStart(2, '0');
    const gStr = `${yyyy}-${mm}-${dd}`;

    if (
      gStr < SUPPORTED_RANGE.gregorian.min ||
      gStr > SUPPORTED_RANGE.gregorian.max
    ) {
      throw new HijriConversionError(
        'OUT_OF_RANGE',
        `Converted Gregorian date "${gStr}" is outside supported range [${SUPPORTED_RANGE.gregorian.min}, ${SUPPORTED_RANGE.gregorian.max}].`
      );
    }

    return gStr;
  }

  /**
   * Returns the number of days (29 or 30) in a given Hijri month.
   */
  getDaysInMonth(year: number, month: number): number {
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      throw new HijriValidationError(
        'INVALID_STRUCTURE',
        'Year and month must be integers.'
      );
    }
    if (
      year < SUPPORTED_RANGE.hijri.min.year ||
      year > SUPPORTED_RANGE.hijri.max.year
    ) {
      throw new HijriConversionError(
        'OUT_OF_RANGE',
        `Hijri year ${year} is outside supported range [${SUPPORTED_RANGE.hijri.min.year}, ${SUPPORTED_RANGE.hijri.max.year}].`
      );
    }
    if (month < 1 || month > 12) {
      throw new HijriValidationError(
        'MONTH_OUT_OF_RANGE',
        `Hijri month ${month} must be between 1 and 12.`
      );
    }
    return this.adapter.getDaysInHijriMonth(year, month);
  }

  /**
   * Validates a Hijri date.
   * Returns null if valid, or a HijriValidationErrorCode on failure.
   */
  validate(hijri: unknown): HijriValidationErrorCode | null {
    if (
      typeof hijri !== 'object' ||
      hijri === null ||
      !('year' in hijri) ||
      !('month' in hijri) ||
      !('day' in hijri)
    ) {
      return 'INVALID_STRUCTURE';
    }

    const h = hijri as { year: unknown; month: unknown; day: unknown };
    if (
      typeof h.year !== 'number' ||
      !Number.isInteger(h.year) ||
      typeof h.month !== 'number' ||
      !Number.isInteger(h.month) ||
      typeof h.day !== 'number' ||
      !Number.isInteger(h.day)
    ) {
      return 'INVALID_STRUCTURE';
    }

    if (
      h.year < SUPPORTED_RANGE.hijri.min.year ||
      h.year > SUPPORTED_RANGE.hijri.max.year
    ) {
      return 'YEAR_OUT_OF_RANGE';
    }

    if (h.month < 1 || h.month > 12) {
      return 'MONTH_OUT_OF_RANGE';
    }

    if (h.day < 1 || h.day > 31) {
      return 'DAY_OUT_OF_RANGE';
    }

    try {
      const daysInMonth = this.adapter.getDaysInHijriMonth(h.year, h.month);
      if (h.day > daysInMonth) {
        return 'DAY_OUT_OF_RANGE';
      }
    } catch (err) {
      if (err instanceof HijriDateError) {
        if (err instanceof HijriConversionError && err.code === 'OUT_OF_RANGE') {
          return 'YEAR_OUT_OF_RANGE';
        }
        if (err instanceof HijriValidationError && err.code === 'MONTH_OUT_OF_RANGE') {
          return 'MONTH_OUT_OF_RANGE';
        }
      }
      return 'INVALID_HIJRI_DATE';
    }

    return null;
  }

  /**
   * Returns true if the provided Hijri date is valid.
   */
  isValid(hijri: unknown): boolean {
    return this.validate(hijri) === null;
  }

  /**
   * Validates the adjustment configuration per ADR-005 and ADR-018.
   */
  validateAdjustmentConfig(config?: HijriAdjustmentConfig): void {
    if (!config) return;

    if (config.globalAdjustment !== undefined) {
      if (
        typeof config.globalAdjustment !== 'number' ||
        !Number.isInteger(config.globalAdjustment) ||
        config.globalAdjustment < -2 ||
        config.globalAdjustment > 2
      ) {
        throw new HijriAdjustmentError(
          'INVALID_GLOBAL_ADJUSTMENT',
          `globalAdjustment must be an integer between -2 and +2. Received: ${config.globalAdjustment}`
        );
      }
    }

    if (config.monthOverrides !== undefined) {
      if (!(config.monthOverrides instanceof Map)) {
        throw new HijriAdjustmentError(
          'INVALID_OVERRIDE',
          'monthOverrides must be a Map instance.'
        );
      }
      for (const [key, adj] of config.monthOverrides.entries()) {
        if (!/^\d{4}-\d{1,2}$/.test(key)) {
          throw new HijriAdjustmentError(
            'INVALID_OVERRIDE',
            `Invalid override key "${key}". Expected format "YYYY-M" or "YYYY-MM".`
          );
        }
        if (
          typeof adj !== 'number' ||
          !Number.isInteger(adj) ||
          adj < -2 ||
          adj > 2
        ) {
          throw new HijriAdjustmentError(
            'INVALID_OVERRIDE',
            `Override adjustment for "${key}" must be an integer between -2 and +2. Received: ${adj}`
          );
        }
      }
    }
  }

  /**
   * Converts a Gregorian civil date to an effective HijriDate considering adjustments.
   *
   * Binding formula:
   * effectiveHijri(G, adj) = baseHijri(G + adj)
   *
   * Algorithm:
   * 1. baseH = toHijri(G)
   * 2. Determine adjustment using BASE Hijri year/month:
   *    override for baseH.year/baseH.month if present, otherwise global adjustment.
   * 3. Override replaces global (does not stack).
   * 4. shiftedG = addGregorianDays(G, effectiveAdjustment)
   * 5. If shiftedG leaves supported converter range:
   *    throw HijriConversionError('ADJUSTED_OUT_OF_RANGE')
   * 6. return toHijri(shiftedG)
   */
  toEffectiveHijri(
    gregorianDate: string,
    config?: HijriAdjustmentConfig
  ): HijriDate {
    this.validateAdjustmentConfig(config);

    const baseH = this.toHijri(gregorianDate);
    const key = getHijriMonthKey(baseH.year, baseH.month);

    let effectiveAdjustment = config?.globalAdjustment ?? 0;
    if (config?.monthOverrides && config.monthOverrides.has(key)) {
      effectiveAdjustment = config.monthOverrides.get(key)!;
    }

    if (effectiveAdjustment === 0) {
      return baseH;
    }

    const shiftedG = addGregorianDays(gregorianDate, effectiveAdjustment);

    if (
      shiftedG < SUPPORTED_RANGE.gregorian.min ||
      shiftedG > SUPPORTED_RANGE.gregorian.max
    ) {
      throw new HijriConversionError(
        'ADJUSTED_OUT_OF_RANGE',
        `Applying adjustment of ${effectiveAdjustment} days to "${gregorianDate}" resulted in "${shiftedG}", which is outside supported range [${SUPPORTED_RANGE.gregorian.min}, ${SUPPORTED_RANGE.gregorian.max}].`
      );
    }

    return this.toHijri(shiftedG);
  }

  /**
   * Resolves the Gregorian civil date(s) corresponding to an effective Hijri date.
   *
   * Algorithm:
   * 1. B = base toGregorian(targetHijri)
   * 2. Candidates are EXACTLY: [B-2, B-1, B, B+1, B+2]
   * 3. Filter out candidates outside supported Gregorian range.
   * 4. For each valid candidate G:
   *    if toEffectiveHijri(G, config) === targetHijri -> match.
   * 5. Return UNIQUE (1 match), AMBIGUOUS (2+ matches sorted ascending), or NO_MATCH (0 matches).
   */
  resolveGregorianFromEffectiveHijri(
    targetHijri: HijriDate,
    config?: HijriAdjustmentConfig
  ): HijriReverseResolution {
    this.validateAdjustmentConfig(config);

    const validationCode = this.validate(targetHijri);
    if (validationCode !== null) {
      throw new HijriValidationError(
        validationCode,
        `Cannot resolve Gregorian date for invalid target Hijri date (${validationCode}): ${JSON.stringify(
          targetHijri
        )}`
      );
    }

    const baseG = this.toGregorian(targetHijri);
    const offsets = [-2, -1, 0, 1, 2];
    const candidates = offsets.map((offset) => addGregorianDays(baseG, offset));

    const matches: string[] = [];

    for (const candidateG of candidates) {
      if (
        candidateG < SUPPORTED_RANGE.gregorian.min ||
        candidateG > SUPPORTED_RANGE.gregorian.max
      ) {
        continue;
      }

      try {
        const effectiveH = this.toEffectiveHijri(candidateG, config);
        if (
          effectiveH.year === targetHijri.year &&
          effectiveH.month === targetHijri.month &&
          effectiveH.day === targetHijri.day
        ) {
          matches.push(candidateG);
        }
      } catch (err) {
        if (
          err instanceof HijriConversionError &&
          err.code === 'ADJUSTED_OUT_OF_RANGE'
        ) {
          continue;
        }
        throw err;
      }
    }

    matches.sort();

    if (matches.length === 0) {
      return { kind: 'NO_MATCH' };
    }
    if (matches.length === 1) {
      return { kind: 'UNIQUE', gregorianDate: matches[0] };
    }
    return { kind: 'AMBIGUOUS', candidates: matches };
  }
}
