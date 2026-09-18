import { renderHook, act } from '@testing-library/react-native';
import { useSettingsMutation } from '../useSettingsMutation';

describe('useSettingsMutation', () => {
  let mockCoordinator: any;

  beforeEach(() => {
    mockCoordinator = {
      applyTemporalSettings: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        category: 'TEMPORAL_FULL_REFRESH',
        refreshed: true,
      }),
      applyPresentationSettings: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        category: 'PRESENTATION_ONLY',
        refreshed: false,
      }),
      setHijriGlobalAdjustment: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        category: 'HIJRI_RECURRENCE_REFRESH',
        refreshed: true,
      }),
      upsertHijriMonthOverride: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        category: 'HIJRI_RECURRENCE_REFRESH',
        refreshed: true,
      }),
      deleteHijriMonthOverride: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        category: 'HIJRI_RECURRENCE_REFRESH',
        refreshed: true,
      }),
      applySettingsChange: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        category: 'TEMPORAL_FULL_REFRESH',
        refreshed: true,
      }),
    };
  });

  it('initializes with default idle state', async () => {
    const { result } = await renderHook(() => useSettingsMutation(mockCoordinator));

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastResult).toBeNull();
  });

  it('delegates applyTemporalSettings to coordinator and tracks result', async () => {
    const { result } = await renderHook(() => useSettingsMutation(mockCoordinator));

    let res: any;
    await act(async () => {
      res = await result.current.applyTemporalSettings({ calculationMethod: 'ISNA' });
    });

    expect(mockCoordinator.applyTemporalSettings).toHaveBeenCalledWith({
      calculationMethod: 'ISNA',
    });
    expect(res).toEqual({
      status: 'SUCCESS',
      category: 'TEMPORAL_FULL_REFRESH',
      refreshed: true,
    });
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastResult).toEqual(res);
  });

  it('handles and surfaces FAILED result error', async () => {
    mockCoordinator.applyTemporalSettings.mockResolvedValue({
      status: 'FAILED',
      stage: 'VALIDATION',
      error: 'Invalid method',
    });

    const { result } = await renderHook(() => useSettingsMutation(mockCoordinator));

    await act(async () => {
      await result.current.applyTemporalSettings({ calculationMethod: 'INVALID' as any });
    });

    expect(result.current.error).toBe('Invalid method');
    expect(result.current.isSaving).toBe(false);
  });

  it('handles PERSISTED_REFRESH_FAILED state', async () => {
    mockCoordinator.setHijriGlobalAdjustment.mockResolvedValue({
      status: 'PERSISTED_REFRESH_FAILED',
      category: 'HIJRI_RECURRENCE_REFRESH',
      error: 'Planner refresh timeout',
    });

    const { result } = await renderHook(() => useSettingsMutation(mockCoordinator));

    await act(async () => {
      await result.current.setHijriGlobalAdjustment(1);
    });

    expect(result.current.error).toBe('Planner refresh timeout');
    expect(result.current.lastResult?.status).toBe('PERSISTED_REFRESH_FAILED');
  });

  it('delegates month override operations to coordinator', async () => {
    const { result } = await renderHook(() => useSettingsMutation(mockCoordinator));

    await act(async () => {
      await result.current.upsertHijriMonthOverride(1448, 9, 1);
    });
    expect(mockCoordinator.upsertHijriMonthOverride).toHaveBeenCalledWith(1448, 9, 1);

    await act(async () => {
      await result.current.deleteHijriMonthOverride(1448, 9);
    });
    expect(mockCoordinator.deleteHijriMonthOverride).toHaveBeenCalledWith(1448, 9);
  });
});
