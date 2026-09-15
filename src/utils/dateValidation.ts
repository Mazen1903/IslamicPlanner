import { DateTime } from 'luxon';
import { TaskValidationError } from '@/domain/task/errors';

/**
 * Checks if a string represents a valid Gregorian civil date in YYYY-MM-DD format.
 * Distinguishes formatting from actual Gregorian validity (e.g. leap years, month length).
 */
export function isValidCivilDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  // Strict format check: 4 digits, 2 digits, 2 digits
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [yStr, mStr, dStr] = value.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (day > daysInMonths[month - 1]) return false;

  // Luxon check as additional cross-verification
  const dt = DateTime.fromISO(value, { zone: 'utc' });
  if (!dt.isValid) return false;
  return dt.toISODate() === value;
}

/**
 * Asserts that a value is a valid civil date (YYYY-MM-DD), throwing TaskValidationError if not.
 */
export function assertValidCivilDate(value: unknown, fieldName: string): asserts value is string {
  if (!isValidCivilDate(value)) {
    throw new TaskValidationError(
      `Invalid civil date for ${fieldName}: ${String(value)}. Expected YYYY-MM-DD valid Gregorian date.`
    );
  }
}

/**
 * Checks if a string represents a valid absolute ISO 8601 instant.
 * Requires an explicit UTC offset ('Z' or '[+-]HH:mm').
 * Bare local timestamps (e.g. '2026-09-15T18:00:00') are rejected.
 */
export function isValidIsoInstant(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  // Must have T and either Z or explicit offset
  const isoInstantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)$/i;
  if (!isoInstantPattern.test(value)) return false;

  const dt = DateTime.fromISO(value, { setZone: true });
  return dt.isValid;
}

/**
 * Asserts that a value is a valid absolute ISO 8601 instant with Z or explicit offset.
 */
export function assertValidIsoInstant(value: unknown, fieldName: string): asserts value is string {
  if (!isValidIsoInstant(value)) {
    throw new TaskValidationError(
      `Invalid absolute timestamp for ${fieldName}: ${String(value)}. Expected ISO 8601 instant with UTC offset or 'Z'.`
    );
  }
}

/**
 * Canonicalizes an absolute ISO 8601 instant to a standard UTC ISO string (e.g. 2026-09-15T18:00:00.000Z).
 */
export function canonicalizeIsoInstant(value: string): string {
  assertValidIsoInstant(value, 'timestamp');
  const dt = DateTime.fromISO(value, { setZone: true });
  const utcIso = dt.toUTC().toISO();
  if (!utcIso) {
    throw new TaskValidationError(`Failed to canonicalize timestamp: ${value}`);
  }
  return utcIso;
}

/**
 * Checks if a string is a valid IANA timezone identifier.
 */
export function isValidIanaTimezone(zone: unknown): boolean {
  if (typeof zone !== 'string' || !zone.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Asserts that a value is a valid IANA timezone identifier.
 */
export function assertValidIanaTimezone(zone: unknown, fieldName: string = 'timezone'): asserts zone is string {
  if (!isValidIanaTimezone(zone)) {
    throw new TaskValidationError(
      `Invalid IANA timezone for ${fieldName}: ${String(zone)}.`
    );
  }
}

/**
 * Performs timezone-independent civil date arithmetic subtracting 1 day (dateStr - 1 day).
 */
export function subtractCivilDay(dateStr: string): string {
  assertValidCivilDate(dateStr, 'dateStr');
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  return d.toISOString().slice(0, 10);
}
