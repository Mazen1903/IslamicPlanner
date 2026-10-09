import { create } from 'zustand';
import { userSettingsRepository } from '@/data/repositories/UserSettingsRepository';

export interface PlannerUiSections {
  previousExpanded: boolean;
  todayExpanded: boolean;
  upcomingExpanded: boolean;
  completedExpanded: boolean;
  anytimeExpanded: boolean;
}

export interface PlannerUiStoreState extends PlannerUiSections {
  isHydrated: boolean;
  highlightedOccurrenceId: string | null;
  setHighlightedOccurrenceId: (id: string | null) => void;
  hydrate: () => Promise<void>;
  togglePrevious: () => void;
  toggleToday: () => void;
  toggleUpcoming: () => void;
  toggleCompleted: () => void;
  toggleAnytime: () => void;
  setSectionExpanded: (section: keyof PlannerUiSections, expanded: boolean) => void;
  resetToDefaults: () => void;
}

export const DEFAULT_PLANNER_UI_SECTIONS: PlannerUiSections = {
  previousExpanded: false,
  todayExpanded: true,
  upcomingExpanded: true,
  completedExpanded: false,
  anytimeExpanded: true,
};

let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function persistState(state: PlannerUiSections) {
  if (persistDebounceTimer) {
    clearTimeout(persistDebounceTimer);
  }
  persistDebounceTimer = setTimeout(async () => {
    try {
      await userSettingsRepository.upsert({
        plannerUiState: JSON.stringify(state),
      });
    } catch {
      // Non-fatal if persistence fails in offline or testing environments
    }
  }, 400);
}

export const usePlannerUiStore = create<PlannerUiStoreState>((set, get) => ({
  ...DEFAULT_PLANNER_UI_SECTIONS,
  isHydrated: false,
  highlightedOccurrenceId: null,

  setHighlightedOccurrenceId: (id: string | null) => {
    set({ highlightedOccurrenceId: id });
  },

  hydrate: async () => {
    try {
      const row = await userSettingsRepository.get();
      if (row?.plannerUiState) {
        const parsed = JSON.parse(row.plannerUiState);
        set({
          previousExpanded: typeof parsed.previousExpanded === 'boolean' ? parsed.previousExpanded : DEFAULT_PLANNER_UI_SECTIONS.previousExpanded,
          todayExpanded: typeof parsed.todayExpanded === 'boolean' ? parsed.todayExpanded : DEFAULT_PLANNER_UI_SECTIONS.todayExpanded,
          upcomingExpanded: typeof parsed.upcomingExpanded === 'boolean' ? parsed.upcomingExpanded : DEFAULT_PLANNER_UI_SECTIONS.upcomingExpanded,
          completedExpanded: typeof parsed.completedExpanded === 'boolean' ? parsed.completedExpanded : DEFAULT_PLANNER_UI_SECTIONS.completedExpanded,
          anytimeExpanded: typeof parsed.anytimeExpanded === 'boolean' ? parsed.anytimeExpanded : DEFAULT_PLANNER_UI_SECTIONS.anytimeExpanded,
          isHydrated: true,
        });
        return;
      }
    } catch {
      // Fallback to defaults
    }
    set({ isHydrated: true });
  },

  togglePrevious: () => {
    const next = !get().previousExpanded;
    set({ previousExpanded: next });
    persistState({
      previousExpanded: next,
      todayExpanded: get().todayExpanded,
      upcomingExpanded: get().upcomingExpanded,
      completedExpanded: get().completedExpanded,
      anytimeExpanded: get().anytimeExpanded,
    });
  },

  toggleToday: () => {
    const next = !get().todayExpanded;
    set({ todayExpanded: next });
    persistState({
      previousExpanded: get().previousExpanded,
      todayExpanded: next,
      upcomingExpanded: get().upcomingExpanded,
      completedExpanded: get().completedExpanded,
      anytimeExpanded: get().anytimeExpanded,
    });
  },

  toggleUpcoming: () => {
    const next = !get().upcomingExpanded;
    set({ upcomingExpanded: next });
    persistState({
      previousExpanded: get().previousExpanded,
      todayExpanded: get().todayExpanded,
      upcomingExpanded: next,
      completedExpanded: get().completedExpanded,
      anytimeExpanded: get().anytimeExpanded,
    });
  },

  toggleCompleted: () => {
    const next = !get().completedExpanded;
    set({ completedExpanded: next });
    persistState({
      previousExpanded: get().previousExpanded,
      todayExpanded: get().todayExpanded,
      upcomingExpanded: get().upcomingExpanded,
      completedExpanded: next,
      anytimeExpanded: get().anytimeExpanded,
    });
  },

  toggleAnytime: () => {
    const next = !get().anytimeExpanded;
    set({ anytimeExpanded: next });
    persistState({
      previousExpanded: get().previousExpanded,
      todayExpanded: get().todayExpanded,
      upcomingExpanded: get().upcomingExpanded,
      completedExpanded: get().completedExpanded,
      anytimeExpanded: next,
    });
  },

  setSectionExpanded: (section, expanded) => {
    set({ [section]: expanded });
    const curr = get();
    persistState({
      previousExpanded: curr.previousExpanded,
      todayExpanded: curr.todayExpanded,
      upcomingExpanded: curr.upcomingExpanded,
      completedExpanded: curr.completedExpanded,
      anytimeExpanded: curr.anytimeExpanded,
      [section]: expanded,
    });
  },

  resetToDefaults: () => {
    set({ ...DEFAULT_PLANNER_UI_SECTIONS, isHydrated: true });
  },
}));
