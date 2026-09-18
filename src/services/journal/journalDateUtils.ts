import { DateTime } from 'luxon';
import {
  type HijriAdjustmentConfig,
  type HijriMonthNumber,
  HIJRI_MONTH_NAMES,
} from '@/domain/calendar/types';
import { HijriService } from '@/domain/calendar/HijriService';

const defaultHijriService = new HijriService();

/**
 * Formats a civil date (YYYY-MM-DD) into primary Gregorian display:
 * Example: "Monday, 16 Sep 2026"
 */
export function formatGregorianJournalDate(civilDate: string): string {
  const dt = DateTime.fromISO(civilDate);
  if (!dt.isValid) return civilDate;
  return dt.toFormat('cccc, d LLL yyyy');
}

/**
 * Formats a civil date (YYYY-MM-DD) into secondary Hijri display
 * applying the effective user Hijri adjustments:
 * Example: "18 Rabi al-Awwal 1448 AH"
 */
export function formatHijriJournalDate(
  civilDate: string,
  adjustment?: HijriAdjustmentConfig,
  hijriService: HijriService = defaultHijriService
): string {
  try {
    const hijri = hijriService.toEffectiveHijri(civilDate, adjustment);
    const monthName =
      HIJRI_MONTH_NAMES[hijri.month as HijriMonthNumber] ??
      `Month ${hijri.month}`;
    return `${hijri.day} ${monthName} ${hijri.year} AH`;
  } catch {
    return '';
  }
}

export {
  loadUserHijriAdjustmentConfig,
  HijriAdjustmentLoadError,
} from '@/services/HijriAdjustmentConfigLoader';
