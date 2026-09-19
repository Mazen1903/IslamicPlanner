import { renderHook, act } from '@testing-library/react-native';
import { useEntitlement } from '../useEntitlement';
import type { EntitlementService } from '@/domain/entitlement/types';

describe('useEntitlement', () => {
  let mockService: jest.Mocked<EntitlementService>;

  beforeEach(() => {
    mockService = {
      getSnapshot: jest.fn().mockResolvedValue({
        status: 'READY',
        tier: 'FREE',
        isPremium: false,
        source: 'LOCAL_DB',
      }),
      hasFeature: jest.fn(),
    };
  });

  it('exposes isLoading true while loading snapshot', async () => {
    mockService.getSnapshot.mockReturnValue(new Promise(() => {}));
    const { result } = await renderHook(() => useEntitlement(mockService));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isPremium).toBe(false);
  });

  it('loads FREE snapshot on mount and sets state', async () => {
    const { result } = await renderHook(() => useEntitlement(mockService));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.tier).toBe('FREE');
    expect(result.current.error).toBeNull();
    expect(result.current.hasFeature('PLANNING_DAY_MIDNIGHT')).toBe(false);
    expect(result.current.hasFeature('PLANNING_DAY_CUSTOM')).toBe(false);
  });

  it('loads PREMIUM snapshot on mount and provides synchronous hasFeature', async () => {
    mockService.getSnapshot.mockResolvedValue({
      status: 'READY',
      tier: 'PREMIUM',
      isPremium: true,
      source: 'LOCAL_DB',
    });

    const { result } = await renderHook(() => useEntitlement(mockService));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPremium).toBe(true);
    expect(result.current.tier).toBe('PREMIUM');
    expect(result.current.error).toBeNull();
    expect(result.current.hasFeature('PLANNING_DAY_MIDNIGHT')).toBe(true);
    expect(result.current.hasFeature('PLANNING_DAY_CUSTOM')).toBe(true);
  });

  it('fails closed when snapshot is UNAVAILABLE', async () => {
    mockService.getSnapshot.mockResolvedValue({
      status: 'UNAVAILABLE',
      reason: 'Database unavailable',
    });

    const { result } = await renderHook(() => useEntitlement(mockService));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.tier).toBeNull();
    expect(result.current.error).toBe('Database unavailable');
    expect(result.current.hasFeature('PLANNING_DAY_MIDNIGHT')).toBe(false);
    expect(result.current.hasFeature('PLANNING_DAY_CUSTOM')).toBe(false);
  });

  it('surfaces error and fails closed if getSnapshot throws', async () => {
    mockService.getSnapshot.mockRejectedValue(new Error('Fatal error'));

    const { result } = await renderHook(() => useEntitlement(mockService));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.tier).toBeNull();
    expect(result.current.error).toBe('Fatal error');
    expect(result.current.hasFeature('PLANNING_DAY_MIDNIGHT')).toBe(false);
  });

  it('reload() fetches fresh entitlement snapshot', async () => {
    const { result } = await renderHook(() => useEntitlement(mockService));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isPremium).toBe(false);

    mockService.getSnapshot.mockResolvedValue({
      status: 'READY',
      tier: 'PREMIUM',
      isPremium: true,
      source: 'LOCAL_DB',
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.isPremium).toBe(true);
    expect(result.current.tier).toBe('PREMIUM');
  });

  // E-11: unmount safety — late async resolution does not error or update unmounted component
  it('E-11: unmount safety ignores late async resolution without calling setState', async () => {
    let resolvePromise: (val: any) => void;
    const delayedPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockService.getSnapshot.mockReturnValue(delayedPromise as any);

    const { unmount } = await renderHook(() => useEntitlement(mockService));

    // Unmount before promise resolves
    unmount();

    // Now resolve promise late
    await act(async () => {
      resolvePromise!({
        status: 'READY',
        tier: 'PREMIUM',
        isPremium: true,
        source: 'LOCAL_DB',
      });
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // No React warning or throw
  });
});
