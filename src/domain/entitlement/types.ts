export type EntitlementTier = 'FREE' | 'PREMIUM';

export type PremiumFeature =
  | 'PLANNING_DAY_MIDNIGHT'
  | 'PLANNING_DAY_CUSTOM'
  | 'TASK_ICONS_EXTENDED'
  | 'ISLAMIC_THEMES_EXTENDED'
  | 'PRIORITY'
  | 'TRACK_STREAK'
  | 'REMINDER_SOUNDS_EXTENDED'
  | 'REMINDER_ENHANCED'
  | 'REMINDER_CUSTOM_SOUND'
  | 'WIDGET_THEMES'
  | 'JOURNAL_PHOTOS'
  | 'JOURNAL_MOOD_TRENDS'
  | 'JOURNAL_EXPORT'
  | 'TEMPLATES_UNLIMITED'
  | 'CUSTOM_CATEGORIES'
  | 'FONTS';

export type EntitlementSnapshot =
  | { status: 'READY'; tier: EntitlementTier; isPremium: boolean; source: 'LOCAL_DB' }
  | { status: 'UNAVAILABLE'; reason: string };

export interface EntitlementService {
  /** Never throws — returns UNAVAILABLE on any read failure. */
  getSnapshot(): Promise<EntitlementSnapshot>;
  /** Returns false on UNAVAILABLE (fail-closed). Never throws. */
  hasFeature(feature: PremiumFeature): Promise<boolean>;
}
