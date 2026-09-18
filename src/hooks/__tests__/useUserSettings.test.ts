import { renderHook, act } from '@testing-library/react-native';
import { useUserSettings } from '../useUserSettings';

describe('useUserSettings', () => {
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      get: jest.fn().mockResolvedValue({
        id: 'default',
        calculationMethod: 'MWL',
        locationMode: 'AUTO',
        themeMode: 'SYSTEM',
      }),
    };
  });

  it('loads settings on mount and updates state', async () => {
    const { result } = await renderHook(() => useUserSettings(mockRepo));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toEqual({
      id: 'default',
      calculationMethod: 'MWL',
      locationMode: 'AUTO',
      themeMode: 'SYSTEM',
    });
    expect(result.current.error).toBeNull();
  });

  it('surfaces error if loading fails', async () => {
    mockRepo.get.mockRejectedValue(new Error('Disk read failure'));

    const { result } = await renderHook(() => useUserSettings(mockRepo));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toBeNull();
    expect(result.current.error).toBe('Disk read failure');
  });

  it('reload() fetches fresh settings', async () => {
    const { result } = await renderHook(() => useUserSettings(mockRepo));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.settings?.calculationMethod).toBe('MWL');

    mockRepo.get.mockResolvedValue({
      id: 'default',
      calculationMethod: 'ISNA',
      locationMode: 'MANUAL',
      themeMode: 'DARK',
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.settings?.calculationMethod).toBe('ISNA');
    expect(result.current.settings?.themeMode).toBe('DARK');
  });
});
