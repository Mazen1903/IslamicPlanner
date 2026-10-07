export type PackageTier = 'MONTHLY' | 'ANNUAL' | 'LIFETIME';

export interface SubscriptionPackage {
  id: string;
  tier: PackageTier;
  title: string;
  priceString: string;
  period: string;
  pricePerMonthString?: string;
  introductoryTrial?: string;
  savingsBadge?: string;
  isPopular?: boolean;
}

export type PurchaseResult =
  | { success: true; isPremium: boolean }
  | { success: false; userCancelled: boolean; error?: string };

export interface PurchaseService {
  getPackages(): Promise<SubscriptionPackage[]>;
  purchasePackage(packageId: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult>;
  setDevPremiumOverride?(enabled: boolean): Promise<void>;
  isDevSupported(): boolean;
}
