import { DevPurchaseService, DEV_PACKAGES } from '../DevPurchaseService';
import { RevenueCatPurchaseService } from '../RevenueCatPurchaseService';
import type { UserSettingsRepository } from '@/data/repositories/UserSettingsRepository';

describe('PurchaseService', () => {
  let mockSettingsRepo: jest.Mocked<UserSettingsRepository>;
  let devService: DevPurchaseService;
  let revenueCatService: RevenueCatPurchaseService;

  beforeEach(() => {
    mockSettingsRepo = {
      get: jest.fn().mockResolvedValue({ isPremium: false } as any),
      upsert: jest.fn().mockImplementation(async patch => patch as any),
    } as unknown as jest.Mocked<UserSettingsRepository>;

    devService = new DevPurchaseService(mockSettingsRepo);
    revenueCatService = new RevenueCatPurchaseService(devService);
  });

  describe('DevPurchaseService', () => {
    it('returns standard subscription packages with annual plan marked popular', async () => {
      const packages = await devService.getPackages();
      expect(packages).toHaveLength(3);
      const annual = packages.find(p => p.tier === 'ANNUAL');
      expect(annual).toBeDefined();
      expect(annual?.isPopular).toBe(true);
      expect(annual?.introductoryTrial).toContain('7-day free trial');
    });

    it('purchasing annual package sets isPremium to true in repository', async () => {
      const res = await devService.purchasePackage('islamic_planner_annual');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.isPremium).toBe(true);
      }
      expect(mockSettingsRepo.upsert).toHaveBeenCalledWith({ isPremium: true });
    });

    it('returns error if packageId is invalid', async () => {
      const res = await devService.purchasePackage('unknown_package');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe('Package not found');
      }
    });

    it('restoring purchases returns active state from repository', async () => {
      mockSettingsRepo.get.mockResolvedValueOnce({ isPremium: true } as any);
      const res = await devService.restorePurchases();
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.isPremium).toBe(true);
      }
    });

    it('allows dev override to toggle premium on and off', async () => {
      await devService.setDevPremiumOverride(true);
      expect(mockSettingsRepo.upsert).toHaveBeenCalledWith({ isPremium: true });

      await devService.setDevPremiumOverride(false);
      expect(mockSettingsRepo.upsert).toHaveBeenCalledWith({ isPremium: false });
    });
  });

  describe('RevenueCatPurchaseService fallback', () => {
    it('delegates getPackages, purchase, and restore to underlying fallback', async () => {
      const packages = await revenueCatService.getPackages();
      expect(packages).toEqual(DEV_PACKAGES);

      const purchaseRes = await revenueCatService.purchasePackage('islamic_planner_annual');
      expect(purchaseRes.success).toBe(true);

      const restoreRes = await revenueCatService.restorePurchases();
      expect(restoreRes.success).toBe(true);
    });
  });
});
