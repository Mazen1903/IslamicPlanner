import { renderHook, waitFor } from '@testing-library/react-native';
import { useToday } from '../useToday';
import { useTodayStore } from '@/stores/useTodayStore';

describe('useToday Fast Path Loading', () => {
  let mockCoordinator: any;
  let mockLocationRefresh: any;
  let mockInputProvider: any;

  beforeEach(() => {
    useTodayStore.getState().reset();

    mockInputProvider = {
      getInputs: jest.fn().mockResolvedValue({
        status: 'READY',
        inputs: {
          coordinates: { latitude: 41.8781, longitude: -87.6298 },
          params: { timezone: 'America/Chicago' },
          planningDayConfig: { type: 'FAJR' },
        },
      }),
    };

    mockCoordinator = {
      fullRefresh: jest.fn().mockResolvedValue({
        status: 'READY',
        viewModel: {
          currentPrayer: 'DHUHR',
          nextPrayer: null,
          tabs: [],
        },
        runtime: { planningDayKey: '2026-09-28' },
        horizonSync: { status: 'SUCCESS' },
      }),
    };

    // Simulate slow GPS that never finishes during this test
    mockLocationRefresh = {
      resolve: jest.fn().mockReturnValue(new Promise(() => {})),
    };
  });

  it('renders viewModel immediately from committed snapshot without waiting for slow GPS', async () => {
    const { result } = await renderHook(() =>
      useToday({
        coordinator: mockCoordinator,
        locationRefreshCoordinator: mockLocationRefresh,
        inputProvider: mockInputProvider,
        enableTimer: false,
      })
    );

    // Initial mount fast-path should populate viewModel instantly without waiting for GPS
    await waitFor(() => {
      expect(result.current.viewModel).not.toBeNull();
      expect(result.current.viewModel?.currentPrayer).toBe('DHUHR');
      expect(result.current.status).toBe('ready');
    });

    // Coordinator fullRefresh was called immediately
    expect(mockCoordinator.fullRefresh).toHaveBeenCalled();
  });
});
