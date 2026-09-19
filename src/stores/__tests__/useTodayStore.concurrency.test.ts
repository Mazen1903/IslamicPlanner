import { useTodayStore } from '../useTodayStore';
import type { TodayViewModel, TodayRuntimeContext } from '@/services/types';

describe('useTodayStore Concurrency (PBR-01)', () => {
  beforeEach(() => {
    // Reset store state to initial
    useTodayStore.setState({
      viewModel: null,
      runtime: null,
      status: 'idle',
      error: null,
      requestGeneration: 0,
      refreshInFlight: false,
    });
  });

  it('PBR-01: Token race: commitRefresh rejects stale token A and preserves fresh commit B', () => {
    // Simulate refresh A starting (e.g. initial refresh before crossing boundary)
    const tokenA = useTodayStore.getState().startRefresh();
    expect(useTodayStore.getState().refreshInFlight).toBe(true);
    expect(tokenA).toBe(1);

    // Simulate refresh B starting (e.g. crossing boundary or fresh user refresh while A is in flight)
    const tokenB = useTodayStore.getState().startRefresh();
    expect(useTodayStore.getState().refreshInFlight).toBe(true);
    expect(tokenB).toBe(2);

    const freshViewModel: TodayViewModel = {
      planningDayKey: '2026-09-16',
      currentPrayer: 'FAJR',
      nextPrayer: 'DHUHR',
      items: [],
      stats: { completedCount: 0, totalCount: 0 },
    } as any;

    const freshRuntime: TodayRuntimeContext = {
      planningDayKey: '2026-09-16',
    } as any;

    const staleViewModel: TodayViewModel = {
      planningDayKey: '2026-09-15',
      currentPrayer: 'ISHA',
      nextPrayer: 'FAJR',
      items: [],
      stats: { completedCount: 5, totalCount: 5 },
    } as any;

    const staleRuntime: TodayRuntimeContext = {
      planningDayKey: '2026-09-15',
    } as any;

    // Refresh B finishes first (or in order) and commits
    const commitBResult = useTodayStore.getState().commitRefresh(
      tokenB,
      { viewModel: freshViewModel, runtime: freshRuntime },
      true
    );
    expect(commitBResult).toBe(true);
    expect(useTodayStore.getState().status).toBe('ready');
    expect(useTodayStore.getState().viewModel).toBe(freshViewModel);
    expect(useTodayStore.getState().refreshInFlight).toBe(false);

    // Stale Refresh A finishes later and attempts to commit
    const commitAResult = useTodayStore.getState().commitRefresh(
      tokenA,
      { viewModel: staleViewModel, runtime: staleRuntime },
      true
    );
    expect(commitAResult).toBe(false);

    // Assertions required by PBR-01:
    // - B viewModel remains
    // - status === ready
    // - stale A cannot overwrite B
    // - refresh state reflects fresh committed generation
    const finalState = useTodayStore.getState();
    expect(finalState.viewModel).toBe(freshViewModel);
    expect(finalState.viewModel?.planningDayKey).toBe('2026-09-16');
    expect(finalState.status).toBe('ready');
    expect(finalState.refreshInFlight).toBe(false);
    expect(finalState.error).toBeNull();
    expect(finalState.requestGeneration).toBe(tokenB);
  });
});
