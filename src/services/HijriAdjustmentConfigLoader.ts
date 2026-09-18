import { getDatabase, type AppDatabase } from '@/data/db';
import { userSettings, hijriMonthOverrides } from '@/data/schema';
import { eq } from 'drizzle-orm';
import {
  getHijriMonthKey,
  type HijriAdjustmentConfig,
} from '@/domain/calendar/types';

export class HijriAdjustmentLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HijriAdjustmentLoadError';
  }
}

/**
 * Loads the effective user Hijri adjustment configuration from database settings
 * and month overrides.
 *
 * Invariants:
 * - Valid absence: no settings row or empty overrides table returns { globalAdjustment: 0 }
 * - DB / query failure: throws HijriAdjustmentLoadError (does NOT silently return 0)
 */
export async function loadUserHijriAdjustmentConfig(
  customDb?: AppDatabase
): Promise<HijriAdjustmentConfig> {
  try {
    const db = customDb ?? getDatabase();
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
  } catch (err: any) {
    if (err instanceof HijriAdjustmentLoadError) throw err;
    throw new HijriAdjustmentLoadError(
      `Failed to load user Hijri adjustment config: ${err?.message ?? String(err)}`,
      { cause: err }
    );
  }
}
