import { eq } from 'drizzle-orm';
import { userSettings } from '@/data/schema';
import { getDatabase, type AppDatabase } from '@/data/db';

/**
 * Read-only data-layer adapter.
 * The ONLY code permitted to read user_settings.isPremium for entitlement resolution.
 * Has NO write methods.
 */
export interface EntitlementRepositoryAPI {
  readIsPremium(tx?: any): Promise<boolean | null>;
}

export class EntitlementRepository implements EntitlementRepositoryAPI {
  async readIsPremium(tx?: any): Promise<boolean | null> {
    const db: AppDatabase = tx ?? getDatabase();
    const rows = await db
      .select({ isPremium: userSettings.isPremium })
      .from(userSettings)
      .where(eq(userSettings.id, 'default'))
      .limit(1);

    if (!rows[0]) {
      return null;
    }

    return rows[0].isPremium;
  }
}
