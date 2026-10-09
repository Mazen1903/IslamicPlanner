import { useEffect } from 'react';
import { useEntitlement } from '@/hooks/useEntitlement';
import { usePaywallTestStore } from '@/stores/usePaywallTestStore';
import { localEntitlementService } from '@/domain/entitlement/EntitlementService';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import {
  AVAILABLE_FONTS,
  normalizeFontId,
  setActiveFontFamily,
  useAppFontSettings,
} from '@/theme/installFontDefaults';

export const FREE_FALLBACK_FONT_ID = 'comic';

/**
 * Pure decision helper: a premium font must be reset only when entitlement is
 * positively known to be FREE. While loading, or when the entitlement is
 * unavailable (tier === null), the saved font is left untouched so paying
 * users are never downgraded by a transient failure.
 */
export function shouldResetPremiumFont(
  fontId: string,
  tier: 'FREE' | 'PREMIUM' | null,
  isLoading: boolean,
  bypassPaywall: boolean
): boolean {
  if (isLoading || bypassPaywall || tier !== 'FREE') return false;
  const option = AVAILABLE_FONTS.find((f) => f.id === normalizeFontId(fontId));
  return Boolean(option?.isPremium);
}

/**
 * Renders nothing. Falls back to the free default font (and persists it) when
 * the user's Premium entitlement has lapsed while a premium font was active.
 * Must be rendered inside the app providers.
 */
export function FontEntitlementGuard() {
  const { tier, isLoading } = useEntitlement();
  const bypassPaywall = usePaywallTestStore((s) => s.bypassPaywall);
  const { fontFamily } = useAppFontSettings();

  useEffect(() => {
    if (!shouldResetPremiumFont(fontFamily, tier, isLoading, bypassPaywall)) return;
    let cancelled = false;
    // This hook instance may hold a stale snapshot (e.g. right after a purchase
    // made elsewhere), so confirm against a fresh read before downgrading.
    localEntitlementService
      .getSnapshot()
      .then((snap) => {
        if (cancelled) return;
        const freshTier = snap.status === 'READY' ? snap.tier : null;
        if (!shouldResetPremiumFont(fontFamily, freshTier, false, bypassPaywall)) return;
        setActiveFontFamily(FREE_FALLBACK_FONT_ID);
        return userSettingsRepository.upsert({ appFontFamily: FREE_FALLBACK_FONT_ID });
      })
      .catch((err: unknown) => {
        console.warn('[FontEntitlementGuard] Failed to reset premium font:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [fontFamily, tier, isLoading, bypassPaywall]);

  return null;
}
