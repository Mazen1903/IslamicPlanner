import { devPurchaseService } from './DevPurchaseService';
import type { PurchaseService } from './types';

export * from './types';
export * from './DevPurchaseService';
export * from './RevenueCatPurchaseService';

/** Default purchase service singleton */
export const purchaseService: PurchaseService = devPurchaseService;
