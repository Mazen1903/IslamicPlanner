export type EntitlementTier = 'FREE' | 'PREMIUM';

export type PremiumFeature =
  | 'PLANNING_DAY_MIDNIGHT'
  | 'PLANNING_DAY_CUSTOM';

export type EntitlementSnapshot =
  | { status: 'READY'; tier: EntitlementTier; isPremium: boolean; source: 'LOCAL_DB' }
  | { status: 'UNAVAILABLE'; reason: string };

export interface EntitlementService {
  /** Never throws — returns UNAVAILABLE on any read failure. */
  getSnapshot(): Promise<EntitlementSnapshot>;
  /** Returns false on UNAVAILABLE (fail-closed). Never throws. */
  hasFeature(feature: PremiumFeature): Promise<boolean>;
}
