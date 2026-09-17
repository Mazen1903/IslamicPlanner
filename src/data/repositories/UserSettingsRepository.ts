import { eq } from 'drizzle-orm';
import { userSettings } from '@/data/schema';
import { getDatabase, type AppDatabase } from '@/data/db';
import type { Coordinates } from '@/domain/prayer/types';

export type UserSettingsRow = typeof userSettings.$inferSelect;
export type UserSettingsPatch = Partial<Omit<typeof userSettings.$inferInsert, 'id' | 'createdAt'>>;

function getDb(tx?: any): AppDatabase {
  return tx ?? getDatabase();
}

export class UserSettingsRepository {
  /**
   * Retrieves the current user_settings row ('default' row), or null if table is empty.
   */
  async get(tx?: any): Promise<UserSettingsRow | null> {
    const db = getDb(tx);
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.id, 'default'))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Upserts the user_settings singleton row ('default').
   */
  async upsert(patch: UserSettingsPatch, tx?: any): Promise<UserSettingsRow> {
    const db = getDb(tx);
    const now = new Date().toISOString();
    const existing = await this.get(tx);

    if (existing) {
      await db
        .update(userSettings)
        .set({
          ...patch,
          updatedAt: now,
        })
        .where(eq(userSettings.id, 'default'));
    } else {
      await db.insert(userSettings).values({
        id: 'default',
        locationMode: patch.locationMode ?? 'AUTO',
        manualLatitude: patch.manualLatitude ?? null,
        manualLongitude: patch.manualLongitude ?? null,
        manualLocationName: patch.manualLocationName ?? null,
        manualTimezone: patch.manualTimezone ?? null,
        lastKnownTimezone: patch.lastKnownTimezone ?? null,
        lastAutoLatitude: patch.lastAutoLatitude ?? null,
        lastAutoLongitude: patch.lastAutoLongitude ?? null,
        calculationMethod: patch.calculationMethod ?? 'MWL',
        asrMethod: patch.asrMethod ?? 'SHAFI',
        highLatitudeRule: patch.highLatitudeRule ?? 'AUTO',
        polarCircleResolution: patch.polarCircleResolution ?? 'AQRAB_YAUM',
        prayerAdjustments:
          patch.prayerAdjustments ??
          '{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}',
        planningDayStart: patch.planningDayStart ?? 'FAJR',
        hijriBaseMethod: patch.hijriBaseMethod ?? 'UMM_AL_QURA',
        hijriGlobalAdjustment: patch.hijriGlobalAdjustment ?? 0,
        worshipSuggestionsEnabled: patch.worshipSuggestionsEnabled ?? true,
        prayerAlertsEnabled: patch.prayerAlertsEnabled ?? true,
        themeMode: patch.themeMode ?? 'SYSTEM',
        isPremium: patch.isPremium ?? false,
        onboardingCompleted: patch.onboardingCompleted ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }

    const updated = await this.get(tx);
    if (!updated) {
      throw new Error('Failed to retrieve user_settings after upsert');
    }
    return updated;
  }

  /**
   * Commits AUTO location snapshot.
   * STRICT ISOLATION: Writes ONLY last_auto_latitude, last_auto_longitude, last_known_timezone.
   * NEVER touches manual_* coordinates or location name.
   */
  async saveAutoLocation(coords: Coordinates, timezone: string, tx?: any): Promise<void> {
    await this.upsert(
      {
        locationMode: 'AUTO',
        lastAutoLatitude: coords.latitude,
        lastAutoLongitude: coords.longitude,
        lastKnownTimezone: timezone,
      },
      tx
    );
  }

  /**
   * Commits MANUAL location selection.
   * STRICT ISOLATION: Writes ONLY manual_latitude, manual_longitude, manual_location_name, manual_timezone.
   * NEVER touches last_auto_* coordinates.
   */
  async saveManualLocation(
    coords: Coordinates,
    cityName: string,
    timezone: string,
    tx?: any
  ): Promise<void> {
    await this.upsert(
      {
        locationMode: 'MANUAL',
        manualLatitude: coords.latitude,
        manualLongitude: coords.longitude,
        manualLocationName: cityName,
        manualTimezone: timezone,
      },
      tx
    );
  }

  /**
   * Updates last known timezone.
   */
  async updateLastKnownTimezone(timezone: string, tx?: any): Promise<void> {
    await this.upsert(
      {
        lastKnownTimezone: timezone,
      },
      tx
    );
  }
}

export const userSettingsRepository = new UserSettingsRepository();
