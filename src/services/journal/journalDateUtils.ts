import { DateTime } from 'luxon';
import { getDatabase } from '@/data/db';
import { userSettings, hijriMonthOverrides } from '@/data/schema';
import { eq } from 'drizzle-orm';
import {
  getHijriMonthKey,
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

/**
 * Loads the effective user Hijri adjustment configuration from database settings
 * and month overrides.
 */
export async function loadUserHijriAdjustmentConfig(): Promise<HijriAdjustmentConfig> {
  try {
    const db = getDatabase();
    const settingsRows = db
      .select({ hijriGlobalAdjustment: userSettings.hijriGlobalAdjustment })
      .from(userSettings)
      .where(eq(userSettings.id, 'default'))
      .limit(1)
      .all();

    const settings = settingsRows[0];
    const overrides = db.select().from(hijriMonthOverrides).all();
    const monthOverrides = new Map<string, number>();

    for (const ov of overrides) {
      monthOverrides.set(
        getHijriMonthKey(ov.hijriYear, ov.hijriMonth),
        ov.adjustmentDays
      );
    }

    return {
      globalAdjustment: settings?.hijriGlobalAdjustment ?? 0,
      monthOverrides: monthOverrides.size > 0 ? monthOverrides : undefined,
    };
  } catch {
    return { globalAdjustment: 0 };
  }
}
