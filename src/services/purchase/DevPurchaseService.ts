import type {
  PurchaseService,
  SubscriptionPackage,
  PurchaseResult,
} from './types';
import {
  userSettingsRepository,
  UserSettingsRepository,
} from '@/data/repositories/UserSettingsRepository';

export const DEV_PACKAGES: SubscriptionPackage[] = [
  {
    id: 'islamic_planner_annual',
    tier: 'ANNUAL',
    title: 'Annual Plan',
    priceString: '$29.99',
    period: 'year',
    pricePerMonthString: '$2.49/mo',
    introductoryTrial: '7-day free trial',
    savingsBadge: 'Save 37%',
    isPopular: true,
  },
  {
    id: 'islamic_planner_monthly',
    tier: 'MONTHLY',
    title: 'Monthly Plan',
    priceString: '$3.99',
    period: 'month',
    pricePerMonthString: '$3.99/mo',
  },
  {
    id: 'islamic_planner_lifetime',
    tier: 'LIFETIME',
    title: 'Lifetime Access',
    priceString: '$69.99',
    period: 'one-time',
    savingsBadge: 'Best Value',
  },
];

export class DevPurchaseService implements PurchaseService {
  constructor(private readonly settingsRepo: UserSettingsRepository = userSettingsRepository) {}

  async getPackages(): Promise<SubscriptionPackage[]> {
    return DEV_PACKAGES;
  }

  async purchasePackage(packageId: string): Promise<PurchaseResult> {
    const pkg = DEV_PACKAGES.find(p => p.id === packageId);
    if (!pkg) {
      return { success: false, userCancelled: false, error: 'Package not found' };
    }

    try {
      await this.settingsRepo.upsert({ isPremium: true });
      return { success: true, isPremium: true };
    } catch (err: any) {
      return {
        success: false,
        userCancelled: false,
        error: err?.message ?? 'Failed to process purchase',
      };
    }
  }

  async restorePurchases(): Promise<PurchaseResult> {
    try {
      const record = await this.settingsRepo.get();
      const premiumActive = Boolean(record?.isPremium);
      return { success: true, isPremium: premiumActive };
    } catch (err: any) {
      return {
        success: false,
        userCancelled: false,
        error: err?.message ?? 'Failed to restore purchases',
      };
    }
  }

  async setDevPremiumOverride(enabled: boolean): Promise<void> {
    await this.settingsRepo.upsert({ isPremium: enabled });
  }

  isDevSupported(): boolean {
    return true;
  }
}

export const devPurchaseService = new DevPurchaseService();
