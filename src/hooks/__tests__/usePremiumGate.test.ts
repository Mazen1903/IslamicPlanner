import { renderHook, act } from '@testing-library/react-native';
import { usePremiumGate } from '../usePremiumGate';
import { usePaywallTestStore } from '@/stores/usePaywallTestStore';
import type { EntitlementService } from '@/domain/entitlement/types';

describe('usePremiumGate hook', () => {
  beforeEach(() => {
    usePaywallTestStore.getState().resetForTesting();
  });

  const createMockService = (isPremium: boolean): EntitlementService => ({
    getSnapshot: jest.fn().mockResolvedValue({
      status: 'READY',
      tier: isPremium ? 'PREMIUM' : 'FREE',
      isPremium,
      source: 'LOCAL_DB',
    }),
    hasFeature: jest.fn().mockImplementation(async () => isPremium),
  });

  it('runs onAllowed immediately if feature is already entitled', async () => {
    const mockService = createMockService(true);
    const onAllowed = jest.fn();
    const { result } = await renderHook(() => usePremiumGate(mockService));

    await act(async () => {
      result.current.gate('PRIORITY', onAllowed);
    });

    expect(onAllowed).toHaveBeenCalledTimes(1);
    expect(result.current.paywallVisible).toBe(false);
  });

  it('opens paywall and records gatedFeature if feature is not entitled', async () => {
    const mockService = createMockService(false);
    const onAllowed = jest.fn();
    const { result } = await renderHook(() => usePremiumGate(mockService));

    await act(async () => {
      result.current.gate('PRIORITY', onAllowed);
    });

    expect(onAllowed).not.toHaveBeenCalled();
    expect(result.current.paywallVisible).toBe(true);
    expect(result.current.gatedFeature).toBe('PRIORITY');
  });

  it('runs onAllowed immediately without opening paywall if bypassPaywall is true', async () => {
    await act(async () => {
      await usePaywallTestStore.getState().setBypassPaywall(true);
    });

    const mockService = createMockService(false);
    const onAllowed = jest.fn();
    const { result } = await renderHook(() => usePremiumGate(mockService));

    await act(async () => {
      result.current.gate('ISLAMIC_THEMES_EXTENDED', onAllowed);
    });

    expect(onAllowed).toHaveBeenCalledTimes(1);
    expect(result.current.paywallVisible).toBe(false);
  });

  it('closePaywall hides the sheet and clears gatedFeature', async () => {
    const mockService = createMockService(false);
    const { result } = await renderHook(() => usePremiumGate(mockService));

    await act(async () => {
      result.current.openPaywall('TASK_ICONS_EXTENDED');
    });
    expect(result.current.paywallVisible).toBe(true);
    expect(result.current.gatedFeature).toBe('TASK_ICONS_EXTENDED');

    await act(async () => {
      result.current.closePaywall();
    });
    expect(result.current.paywallVisible).toBe(false);
    expect(result.current.gatedFeature).toBeNull();
  });

  it('onPurchaseSuccess reloads entitlement and triggers pending onAllowed callback', async () => {
    let premiumState = false;
    const mockService: EntitlementService = {
      getSnapshot: jest.fn().mockImplementation(async () => ({
        status: 'READY',
        tier: premiumState ? 'PREMIUM' : 'FREE',
        isPremium: premiumState,
        source: 'LOCAL_DB',
      })),
      hasFeature: jest.fn().mockImplementation(async () => premiumState),
    };

    const onAllowed = jest.fn();
    const { result } = await renderHook(() => usePremiumGate(mockService));

    await act(async () => {
      result.current.gate('ISLAMIC_THEMES_EXTENDED', onAllowed);
    });

    expect(result.current.paywallVisible).toBe(true);

    // Simulate purchase
    premiumState = true;

    await act(async () => {
      await result.current.onPurchaseSuccess();
    });

    expect(result.current.paywallVisible).toBe(false);
    expect(onAllowed).toHaveBeenCalledTimes(1);
  });
});

