import { EntitlementRepository } from '../EntitlementRepository';
import { UserSettingsRepository } from '../UserSettingsRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';

describe('EntitlementRepository', () => {
  let entitlementRepo: EntitlementRepository;
  let userSettingsRepo: UserSettingsRepository;

  beforeEach(() => {
    createTestDatabase();
    entitlementRepo = new EntitlementRepository();
    userSettingsRepo = new UserSettingsRepository();
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('returns null when user_settings row is absent (fresh install)', async () => {
    const isPremium = await entitlementRepo.readIsPremium();
    expect(isPremium).toBeNull();
  });

  it('returns false when user_settings row exists with default isPremium=false', async () => {
    await userSettingsRepo.upsert({ calculationMethod: 'MWL' });

    const isPremium = await entitlementRepo.readIsPremium();
    expect(isPremium).toBe(false);
  });

  it('returns true when user_settings row exists with isPremium=true', async () => {
    await userSettingsRepo.upsert({ calculationMethod: 'MWL', isPremium: true });

    const isPremium = await entitlementRepo.readIsPremium();
    expect(isPremium).toBe(true);
  });

  it('has no write methods on the repository instance or prototype', () => {
    const forbiddenMethodNames = [
      'setPremium',
      'upgrade',
      'purchase',
      'commitPurchase',
      'restore',
      'write',
      'upsert',
      'update',
      'delete',
    ];

    for (const name of forbiddenMethodNames) {
      expect((entitlementRepo as any)[name]).toBeUndefined();
      expect((EntitlementRepository.prototype as any)[name]).toBeUndefined();
    }
  });

  it('propagates database error when query fails', async () => {
    const mockFaultyDb = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('DB read error')),
          }),
        }),
      }),
    };

    await expect(entitlementRepo.readIsPremium(mockFaultyDb)).rejects.toThrow('DB read error');
  });
});
