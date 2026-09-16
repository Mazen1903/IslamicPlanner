import type { HijriService } from '../calendar/HijriService';
import type { HijriAdjustmentConfig } from '../calendar/types';
import type { HijriRecurrenceData } from '../task/types';

/**
 * ISO 8601 weekday numbering: 1 = Monday, 7 = Sunday.
 */
export type ISOWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Supported Gregorian recurrence frequencies for M9.
 */
export type GregorianRecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

/**
 * Parsed Gregorian recurrence rule representation.
 */
export interface GregorianRecurrenceRule {
  readonly frequency: GregorianRecurrenceFrequency;
  readonly interval: number; // Positive integer >= 1
  readonly byWeekday?: readonly ISOWeekday[]; // Required for WEEKLY (1=Mon..7=Sun)
  readonly byMonthDay?: readonly number[]; // Required for MONTHLY (1..31)
}

/**
 * Calendar recurrence classification.
 */
export type RecurrenceKind = 'NON_RECURRING' | 'GREGORIAN' | 'HIJRI';

/**
 * Inclusive civil date range [start, end] with YYYY-MM-DD strings.
 */
export interface CivilDateRange {
  readonly start: string;
  readonly end: string;
}

/**
 * Context required for evaluating Hijri calendar recurrence.
 */
export interface RecurrenceContext {
  readonly hijriService: HijriService;
  readonly hijriAdjustment: HijriAdjustmentConfig;
}

export type { HijriRecurrenceData };
