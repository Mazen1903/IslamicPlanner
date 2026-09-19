import { renderHook, act } from '@testing-library/react-native';
import { usePlanningDayMutation } from '../usePlanningDayMutation';
import type { PlanningDayMutationCoordinator } from '@/services/PlanningDayMutationCoordinator';

describe('usePlanningDayMutation', () => {
  let mockCoordinator: jest.Mocked<PlanningDayMutationCoordinator>;

  beforeEach(() => {
    mockCoordinator = {
      setPlanningDayStart: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        refreshed: true,
      }),
    } as any;
  });

  it('delegates setPlanningDayStart directly to coordinator and manages isSaving state', async () => {
    const { result } = await renderHook(() => usePlanningDayMutation(mockCoordinator));

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();

    let res: any;
    await act(async () => {
      res = await result.current.setPlanningDayStart('FAJR');
    });

    expect(mockCoordinator.setPlanningDayStart).toHaveBeenCalledWith('FAJR');
    expect(res).toEqual({ status: 'SUCCESS', refreshed: true });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('captures error when coordinator returns FAILED result', async () => {
    mockCoordinator.setPlanningDayStart.mockResolvedValue({
      status: 'FAILED',
      stage: 'AUTHORIZATION',
      reason: 'PREMIUM_REQUIRED',
      error: 'Premium entitlement required.',
    });

    const { result } = await renderHook(() => usePlanningDayMutation(mockCoordinator));

    let res: any;
    await act(async () => {
      res = await result.current.setPlanningDayStart('MIDNIGHT');
    });

    expect(res.status).toBe('FAILED');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBe('Premium entitlement required.');
  });

  it('captures error when coordinator returns PERSISTED_REFRESH_FAILED', async () => {
    mockCoordinator.setPlanningDayStart.mockResolvedValue({
      status: 'PERSISTED_REFRESH_FAILED',
      error: 'Refresh failed.',
    });

    const { result } = await renderHook(() => usePlanningDayMutation(mockCoordinator));

    let res: any;
    await act(async () => {
      res = await result.current.setPlanningDayStart('FAJR');
    });

    expect(res.status).toBe('PERSISTED_REFRESH_FAILED');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBe('Refresh failed.');
  });

  it('handles unexpected coordinator exceptions safely', async () => {
    mockCoordinator.setPlanningDayStart.mockRejectedValue(new Error('Unexpected crash'));

    const { result } = await renderHook(() => usePlanningDayMutation(mockCoordinator));

    let res: any;
    await act(async () => {
      res = await result.current.setPlanningDayStart('FAJR');
    });

    expect(res.status).toBe('FAILED');
    expect(result.current.error).toBe('Unexpected crash');
    expect(result.current.isSaving).toBe(false);
  });

  it('unmount safety: ignores completion after unmount', async () => {
    let resolvePromise: (val: any) => void;
    const delayedPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockCoordinator.setPlanningDayStart.mockReturnValue(delayedPromise as any);

    const { result, unmount } = await renderHook(() => usePlanningDayMutation(mockCoordinator));

    let mutatePromise: Promise<any>;
    act(() => {
      mutatePromise = result.current.setPlanningDayStart('FAJR');
    });

    unmount();

    await act(async () => {
      resolvePromise!({ status: 'SUCCESS', refreshed: true });
      await mutatePromise;
    });

    // No React warnings on unmounted component
  });
});
