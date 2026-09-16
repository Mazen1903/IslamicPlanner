import {
  addGregorianDays,
  getDaysInGregorianMonth,
  isGregorianLeapYear,
} from '../calendar/HijriService';
import type { ISOWeekday } from './types';

export { getDaysInGregorianMonth, isGregorianLeapYear };

/**
 * Validates whether a string is a canonical civil date in YYYY-MM-DD format
 * representing a real calendar date in the Gregorian calendar.
 */
export function isValidCivilDate(dateStr: unknown): dateStr is string {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  if (m < 1 || m > 12) return false;
  const maxDays = getDaysInGregorianMonth(y, m);
  return d >= 1 && d <= maxDays;
}

/**
 * Computes the ISO 8601 weekday (1=Monday, 7=Sunday) using pure calendar math.
 * Completely timezone and locale independent.
 */
export function isoWeekday(dateStr: string): ISOWeekday {
  const [yStr, mStr, dStr] = dateStr.split('-');
  let y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  // Sakamoto's algorithm (0=Sunday, 1=Monday, ..., 6=Saturday)
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y -= 1;
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7;
  return (dow === 0 ? 7 : dow) as ISOWeekday;
}

/**
 * Converts a Gregorian civil date to its Julian Day Number (JDN).
 * Pure integer arithmetic.
 */
function civilDateToJdn(dateStr: string): number {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;

  return (
    d +
    Math.floor((153 * mAdj + 2) / 5) +
    365 * yAdj +
    Math.floor(yAdj / 4) -
    Math.floor(yAdj / 100) +
    Math.floor(yAdj / 400) -
    32045
  );
}

/**
 * Signed difference in civil days between two civil dates: to - from.
 * E.g. civilDaysBetween('2026-01-01', '2026-01-02') === 1.
 */
export function civilDaysBetween(from: string, to: string): number {
  return civilDateToJdn(to) - civilDateToJdn(from);
}

/**
 * Adds (or subtracts) civil days to a YYYY-MM-DD date string.
 * Delegates to M8's pure Gregorian civil date arithmetic.
 */
export function addCivilDays(dateStr: string, days: number): string {
  return addGregorianDays(dateStr, days);
}

/**
 * Returns the Monday of the ISO week containing the given date.
 */
export function mondayOfWeek(dateStr: string): string {
  const dow = isoWeekday(dateStr);
  return addCivilDays(dateStr, 1 - dow);
}

/**
 * Returns the earliest date among all non-null, non-undefined civil date strings.
 */
export function minDate(...dates: (string | null | undefined)[]): string {
  const valid = dates.filter((d): d is string => d != null && d !== '');
  if (valid.length === 0) {
    throw new Error('minDate requires at least one valid date');
  }
  let min = valid[0];
  for (let i = 1; i < valid.length; i++) {
    if (valid[i] < min) {
      min = valid[i];
    }
  }
  return min;
}

/**
 * Returns the latest date among all non-null, non-undefined civil date strings.
 */
export function maxDate(...dates: (string | null | undefined)[]): string {
  const valid = dates.filter((d): d is string => d != null && d !== '');
  if (valid.length === 0) {
    throw new Error('maxDate requires at least one valid date');
  }
  let max = valid[0];
  for (let i = 1; i < valid.length; i++) {
    if (valid[i] > max) {
      max = valid[i];
    }
  }
  return max;
}
