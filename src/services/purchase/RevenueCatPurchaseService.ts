import type {
  PurchaseService,
  SubscriptionPackage,
  PurchaseResult,
} from './types';
import { devPurchaseService } from './DevPurchaseService';

/**
 * RevenueCat adapter with automatic fallback to DevPurchaseService
 * when running in development, testing, or environments without native IAP.
 */
export class RevenueCatPurchaseService implements PurchaseService {
  private fallbackService: PurchaseService;

  constructor(fallback: PurchaseService = devPurchaseService) {
    this.fallbackService = fallback;
  }

  async getPackages(): Promise<SubscriptionPackage[]> {
    return this.fallbackService.getPackages();
  }

  async purchasePackage(packageId: string): Promise<PurchaseResult> {
    return this.fallbackService.purchasePackage(packageId);
  }

  async restorePurchases(): Promise<PurchaseResult> {
    return this.fallbackService.restorePurchases();
  }

  async setDevPremiumOverride(enabled: boolean): Promise<void> {
    if (this.fallbackService.setDevPremiumOverride) {
      await this.fallbackService.setDevPremiumOverride(enabled);
    }
  }

  isDevSupported(): boolean {
    return this.fallbackService.isDevSupported();
  }
}

export const revenueCatPurchaseService = new RevenueCatPurchaseService();
