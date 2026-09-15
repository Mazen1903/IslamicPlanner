import {
  isValidCivilDate,
  assertValidCivilDate,
  isValidIsoInstant,
  assertValidIsoInstant,
  canonicalizeIsoInstant,
  isValidIanaTimezone,
  assertValidIanaTimezone,
  subtractCivilDay,
} from '../dateValidation';
import { TaskValidationError } from '@/domain/task/errors';

describe('dateValidation', () => {
  describe('isValidCivilDate', () => {
    it('accepts valid Gregorian civil dates', () => {
      expect(isValidCivilDate('2026-01-31')).toBe(true);
      expect(isValidCivilDate('2028-02-29')).toBe(true); // leap year
      expect(isValidCivilDate('2026-12-31')).toBe(true);
      expect(isValidCivilDate('2000-02-29')).toBe(true); // leap year (400-year rule)
    });

    it('rejects impossible dates and formatting errors', () => {
      expect(isValidCivilDate('2026-02-29')).toBe(false); // 2026 not leap year
      expect(isValidCivilDate('2026-02-30')).toBe(false);
      expect(isValidCivilDate('2026-02-31')).toBe(false);
      expect(isValidCivilDate('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidCivilDate('2026-00-10')).toBe(false); // Month 0
      expect(isValidCivilDate('2026-13-01')).toBe(false); // Month 13
      expect(isValidCivilDate('2026-01-00')).toBe(false); // Day 0
      expect(isValidCivilDate('2026-1-01')).toBe(false); // Missing digit
      expect(isValidCivilDate('text')).toBe(false);
      expect(isValidCivilDate('')).toBe(false);
      expect(isValidCivilDate(null)).toBe(false);
      expect(isValidCivilDate(undefined)).toBe(false);
      expect(isValidCivilDate(12345)).toBe(false);
      expect(isValidCivilDate('1900-02-29')).toBe(false); // 1900 not leap year (century rule)
    });

    it('assertValidCivilDate throws TaskValidationError on invalid date', () => {
      expect(() => assertValidCivilDate('2026-02-29', 'startDate')).toThrow(TaskValidationError);
      expect(() => assertValidCivilDate('2026-01-15', 'startDate')).not.toThrow();
    });
  });

  describe('subtractCivilDay', () => {
    it('handles regular day decrement', () => {
      expect(subtractCivilDay('2026-05-15')).toBe('2026-05-14');
    });

    it('handles month-end transition in non-leap year (March to February)', () => {
      expect(subtractCivilDay('2026-03-01')).toBe('2026-02-28');
    });

    it('handles month-end transition in leap year (March to February 29)', () => {
      expect(subtractCivilDay('2028-03-01')).toBe('2028-02-29');
    });

    it('handles year-end transition (January 1 to December 31)', () => {
      expect(subtractCivilDay('2026-01-01')).toBe('2025-12-31');
    });

    it('throws on invalid civil date', () => {
      expect(() => subtractCivilDay('2026-02-29')).toThrow(TaskValidationError);
    });
  });

  describe('isValidIsoInstant', () => {
    it('accepts valid absolute ISO 8601 instants with Z or offset', () => {
      expect(isValidIsoInstant('2026-09-15T18:00:00Z')).toBe(true);
      expect(isValidIsoInstant('2026-09-15T18:00:00.123Z')).toBe(true);
      expect(isValidIsoInstant('2026-09-15T18:00:00+03:00')).toBe(true);
      expect(isValidIsoInstant('2026-09-15T18:00:00-05:00')).toBe(true);
      expect(isValidIsoInstant('2026-09-15T18:00:00.000+00:00')).toBe(true);
    });

    it('rejects bare local timestamps without UTC offset or Z', () => {
      expect(isValidIsoInstant('2026-09-15T18:00:00')).toBe(false);
      expect(isValidIsoInstant('2026-09-15 18:00:00')).toBe(false);
      expect(isValidIsoInstant('2026-09-15')).toBe(false);
    });

    it('rejects invalid or impossible date-times', () => {
      expect(isValidIsoInstant('2026-02-30T18:00:00Z')).toBe(false);
      expect(isValidIsoInstant('not-a-timestamp')).toBe(false);
      expect(isValidIsoInstant('')).toBe(false);
      expect(isValidIsoInstant(null)).toBe(false);
    });

    it('assertValidIsoInstant throws on invalid instant', () => {
      expect(() => assertValidIsoInstant('2026-09-15T18:00:00', 'completedAt')).toThrow(TaskValidationError);
      expect(() => assertValidIsoInstant('2026-09-15T18:00:00Z', 'completedAt')).not.toThrow();
    });

    it('canonicalizeIsoInstant produces UTC ISO string', () => {
      const canonical = canonicalizeIsoInstant('2026-09-15T18:00:00+03:00');
      expect(canonical).toBe('2026-09-15T15:00:00.000Z');
    });
  });

  describe('isValidIanaTimezone', () => {
    it('accepts valid IANA timezones', () => {
      expect(isValidIanaTimezone('America/Chicago')).toBe(true);
      expect(isValidIanaTimezone('Asia/Riyadh')).toBe(true);
      expect(isValidIanaTimezone('Europe/London')).toBe(true);
      expect(isValidIanaTimezone('UTC')).toBe(true);
    });

    it('rejects invalid timezone strings', () => {
      expect(isValidIanaTimezone('Texas')).toBe(false);
      expect(isValidIanaTimezone('GMT-ish')).toBe(false);
      expect(isValidIanaTimezone('not-a-zone')).toBe(false);
      expect(isValidIanaTimezone('')).toBe(false);
      expect(isValidIanaTimezone('   ')).toBe(false);
      expect(isValidIanaTimezone(null)).toBe(false);
      expect(isValidIanaTimezone(undefined)).toBe(false);
    });

    it('assertValidIanaTimezone throws on invalid timezone', () => {
      expect(() => assertValidIanaTimezone('Texas', 'timezone')).toThrow(TaskValidationError);
      expect(() => assertValidIanaTimezone('Asia/Riyadh', 'timezone')).not.toThrow();
    });
  });
});
