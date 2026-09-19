import type {
  EntitlementService,
  EntitlementSnapshot,
  EntitlementTier,
  PremiumFeature,
} from './types';
import {
  EntitlementRepository,
  type EntitlementRepositoryAPI,
} from '@/data/repositories/EntitlementRepository';

export class LocalEntitlementService implements EntitlementService {
  constructor(private readonly repo: EntitlementRepositoryAPI) {}

  async getSnapshot(): Promise<EntitlementSnapshot> {
    try {
      const raw = await this.repo.readIsPremium();
      if (raw === null) {
        return { status: 'READY', tier: 'FREE', isPremium: false, source: 'LOCAL_DB' };
      }
      const tier: EntitlementTier = raw ? 'PREMIUM' : 'FREE';
      return { status: 'READY', tier, isPremium: raw, source: 'LOCAL_DB' };
    } catch (err: any) {
      return {
        status: 'UNAVAILABLE',
        reason: err?.message ?? 'Entitlement source unavailable',
      };
    }
  }

  async hasFeature(_feature: PremiumFeature): Promise<boolean> {
    const snapshot = await this.getSnapshot();
    if (snapshot.status === 'UNAVAILABLE') {
      return false; // fail-closed
    }
    return snapshot.tier === 'PREMIUM';
  }
}

export const localEntitlementService = new LocalEntitlementService(
  new EntitlementRepository()
);
