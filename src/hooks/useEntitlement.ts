import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  EntitlementService,
  EntitlementSnapshot,
  EntitlementTier,
  PremiumFeature,
} from '@/domain/entitlement/types';
import { localEntitlementService } from '@/domain/entitlement/EntitlementService';

export interface UseEntitlementResult {
  isLoading: boolean;
  isPremium: boolean;
  tier: EntitlementTier | null;
  hasFeature: (feature: PremiumFeature) => boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useEntitlement(
  service: EntitlementService = localEntitlementService
): UseEntitlementResult {
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const snap = await service.getSnapshot();
      if (!isMountedRef.current) return;
      setSnapshot(snap);
      if (snap.status === 'UNAVAILABLE') {
        setError(snap.reason);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err?.message ?? 'Failed to load entitlement');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [service]);

  useEffect(() => {
    isMountedRef.current = true;
    let active = true;

    service
      .getSnapshot()
      .then(snap => {
        if (active && isMountedRef.current) {
          setSnapshot(snap);
          if (snap.status === 'UNAVAILABLE') {
            setError(snap.reason);
          }
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (active && isMountedRef.current) {
          setError(err?.message ?? 'Failed to load entitlement');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      isMountedRef.current = false;
    };
  }, [service]);

  const isPremium = snapshot?.status === 'READY' ? snapshot.isPremium : false;
  const tier = snapshot?.status === 'READY' ? snapshot.tier : null;

  const hasFeature = useCallback(
    (_feature: PremiumFeature): boolean => {
      if (!snapshot || snapshot.status === 'UNAVAILABLE') {
        return false;
      }
      return snapshot.tier === 'PREMIUM';
    },
    [snapshot]
  );

  return {
    isLoading,
    isPremium,
    tier,
    hasFeature,
    error,
    reload: loadSnapshot,
  };
}
