import { useState, useCallback, useRef } from 'react';
import { useEntitlement } from './useEntitlement';
import { usePaywallTestStore } from '@/stores/usePaywallTestStore';
import type { EntitlementService, PremiumFeature } from '@/domain/entitlement/types';

export interface UsePremiumGateResult {
  isPremium: boolean;
  paywallVisible: boolean;
  gatedFeature: PremiumFeature | null;
  gate: (feature: PremiumFeature, onAllowed: () => void) => void;
  openPaywall: (feature?: PremiumFeature) => void;
  closePaywall: () => void;
  onPurchaseSuccess: () => void;
  reload: () => Promise<void>;
}

export function usePremiumGate(
  entitlementService?: EntitlementService
): UsePremiumGateResult {
  const { isPremium, hasFeature, reload } = useEntitlement(entitlementService);
  const bypassPaywall = usePaywallTestStore(s => s.bypassPaywall);

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [gatedFeature, setGatedFeature] = useState<PremiumFeature | null>(null);
  const pendingCallbackRef = useRef<(() => void) | null>(null);

  const gate = useCallback(
    (feature: PremiumFeature, onAllowed: () => void) => {
      if (bypassPaywall || hasFeature(feature)) {
        onAllowed();
      } else {
        pendingCallbackRef.current = onAllowed;
        setGatedFeature(feature);
        setPaywallVisible(true);
      }
    },
    [hasFeature, bypassPaywall]
  );

  const openPaywall = useCallback((feature?: PremiumFeature) => {
    if (feature) setGatedFeature(feature);
    setPaywallVisible(true);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
    setGatedFeature(null);
    pendingCallbackRef.current = null;
  }, []);

  const onPurchaseSuccess = useCallback(async () => {
    await reload();
    setPaywallVisible(false);
    const cb = pendingCallbackRef.current;
    pendingCallbackRef.current = null;
    if (cb) {
      cb();
    }
  }, [reload]);

  return {
    isPremium,
    paywallVisible,
    gatedFeature,
    gate,
    openPaywall,
    closePaywall,
    onPurchaseSuccess,
    reload,
  };
}
