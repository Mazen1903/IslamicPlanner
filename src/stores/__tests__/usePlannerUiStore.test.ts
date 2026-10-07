import { usePlannerUiStore } from '../usePlannerUiStore';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';

jest.mock('@/data/repositories/UserSettingsRepository', () => ({
  userSettingsRepository: {
    get: jest.fn(),
    upsert: jest.fn(),
  },
}));

describe('usePlannerUiStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlannerUiStore.getState().resetToDefaults();
  });

  it('initializes with default section states', () => {
    const state = usePlannerUiStore.getState();
    expect(state.previousExpanded).toBe(false);
    expect(state.todayExpanded).toBe(true);
    expect(state.upcomingExpanded).toBe(true);
    expect(state.completedExpanded).toBe(false);
    expect(state.anytimeExpanded).toBe(true);
  });

  it('hydrates section states from userSettingsRepository when present', async () => {
    (userSettingsRepository.get as jest.Mock).mockResolvedValueOnce({
      plannerUiState: JSON.stringify({
        previousExpanded: true,
        todayExpanded: false,
        upcomingExpanded: true,
        completedExpanded: true,
        anytimeExpanded: false,
      }),
    });

    await usePlannerUiStore.getState().hydrate();

    const state = usePlannerUiStore.getState();
    expect(state.previousExpanded).toBe(true);
    expect(state.todayExpanded).toBe(false);
    expect(state.upcomingExpanded).toBe(true);
    expect(state.completedExpanded).toBe(true);
    expect(state.anytimeExpanded).toBe(false);
    expect(state.isHydrated).toBe(true);
  });

  it('toggles today expanded and updates memory state immediately', () => {
    expect(usePlannerUiStore.getState().todayExpanded).toBe(true);
    usePlannerUiStore.getState().toggleToday();
    expect(usePlannerUiStore.getState().todayExpanded).toBe(false);
    usePlannerUiStore.getState().toggleToday();
    expect(usePlannerUiStore.getState().todayExpanded).toBe(true);
  });

  it('toggles previous, upcoming, completed, anytime states', () => {
    usePlannerUiStore.getState().togglePrevious();
    expect(usePlannerUiStore.getState().previousExpanded).toBe(true);

    usePlannerUiStore.getState().toggleUpcoming();
    expect(usePlannerUiStore.getState().upcomingExpanded).toBe(false);

    usePlannerUiStore.getState().toggleCompleted();
    expect(usePlannerUiStore.getState().completedExpanded).toBe(true);

    usePlannerUiStore.getState().toggleAnytime();
    expect(usePlannerUiStore.getState().anytimeExpanded).toBe(false);
  });
});
