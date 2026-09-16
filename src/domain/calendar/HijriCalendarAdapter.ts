import { gregorianToHijri, hijriToGregorian } from '@tabby_ai/hijri-converter';
import type { HijriDate } from './types';
import {
  HijriConversionError,
  HijriValidationError,
} from './errors';

/**
 * Adapter isolating the third-party @tabby_ai/hijri-converter package.
 * Zero deep imports: utilizes only public gregorianToHijri and hijriToGregorian exports.
 */
export class HijriCalendarAdapter {
  /**
   * Converts a Gregorian civil date object to a canonical HijriDate.
   */
  gregorianToHijri(year: number, month: number, day: number): HijriDate {
    try {
      const result = gregorianToHijri({ year, month, day });
      return {
        year: result.year,
        month: result.month,
        day: result.day,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes('out of range')) {
        throw new HijriConversionError(
          'OUT_OF_RANGE',
          `Gregorian date ${year}-${month}-${day} is out of supported converter range.`,
          { cause: error }
        );
      }
      throw new HijriConversionError(
        'ADAPTER_ERROR',
        `Adapter conversion failed for Gregorian date ${year}-${month}-${day}: ${msg}`,
        { cause: error }
      );
    }
  }

  /**
   * Converts a canonical HijriDate to a Gregorian civil date object.
   */
  hijriToGregorian(hijri: HijriDate): { year: number; month: number; day: number } {
    try {
      const result = hijriToGregorian({
        year: hijri.year,
        month: hijri.month,
        day: hijri.day,
      });
      return {
        year: result.year,
        month: result.month,
        day: result.day,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes('out of range')) {
        throw new HijriConversionError(
          'OUT_OF_RANGE',
          `Hijri date ${hijri.year}/${hijri.month}/${hijri.day} is out of supported converter range.`,
          { cause: error }
        );
      }
      throw new HijriConversionError(
        'ADAPTER_ERROR',
        `Adapter conversion failed for Hijri date ${hijri.year}/${hijri.month}/${hijri.day}: ${msg}`,
        { cause: error }
      );
    }
  }

  /**
   * Determines the number of days (29 or 30) in a specific Hijri month
   * using the approved public API probe (trying day 30, then day 29).
   *
   * Rejects out-of-range years and months with typed errors.
   */
  getDaysInHijriMonth(year: number, month: number): number {
    if (year < 1343 || year > 1500) {
      throw new HijriConversionError(
        'OUT_OF_RANGE',
        `Hijri year ${year} is outside supported range [1343, 1500].`
      );
    }
    if (month < 1 || month > 12) {
      throw new HijriValidationError(
        'MONTH_OUT_OF_RANGE',
        `Hijri month ${month} must be between 1 and 12.`
      );
    }

    // Public API Probe: Attempt day 30 first
    try {
      this.hijriToGregorian({ year, month, day: 30 });
      // Day 30 is valid; check for rare historical 31-day months
      try {
        this.hijriToGregorian({ year, month, day: 31 });
        return 31;
      } catch {
        return 30;
      }
    } catch {
      // Day 30 was invalid, probe day 29
      try {
        this.hijriToGregorian({ year, month, day: 29 });
        return 29;
      } catch {
        // In rare historical Umm al-Qura months, day 28 was the maximum
        try {
          this.hijriToGregorian({ year, month, day: 28 });
          return 28;
        } catch (err28) {
          // If day 28 also fails, this is an unexpected adapter error or corrupt input
          throw new HijriConversionError(
            'ADAPTER_ERROR',
            `Failed to determine month length for Hijri year ${year}, month ${month}: ${
              err28 instanceof Error ? err28.message : String(err28)
            }`,
            { cause: err28 }
          );
        }
      }
    }
  }
}
