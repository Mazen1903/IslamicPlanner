import type { Prayer } from '@/constants/prayers';
import type { Coordinates, PrayerCalculationParams, PrayerTimeline } from '@/domain/prayer/types';
import type { PlanningDay, PlanningDayConfig } from '@/domain/planning-day/types';
import type { ScheduleType, OccurrenceStatus } from '@/domain/task/types';

export type { Prayer } from '@/constants/prayers';
export type { PlanningDay, PlanningDayConfig } from '@/domain/planning-day/types';
export type { PrayerTimeline, Coordinates, PrayerCalculationParams } from '@/domain/prayer/types';
export type { ScheduleType, OccurrenceStatus } from '@/domain/task/types';

/**
 * Inputs required to construct PrayerTimeline, resolve PlanningDay,
 * and materialize tasks for the Today view.
 */
export interface TodayTemporalInputs {
  coordinates: Coordinates;
  params: PrayerCalculationParams;
  planningDayConfig: PlanningDayConfig;
}

/**
 * Discriminated union for temporal input provider results.
 * When legitimate location is missing, SETUP_REQUIRED is returned.
 * No silent geo defaults (e.g. Mecca/Riyadh) are ever used in production.
 */
export type TodayTemporalInputResult =
  | { status: 'READY'; inputs: TodayTemporalInputs }
  | { status: 'SETUP_REQUIRED' };

/**
 * Interface for providing temporal inputs to TodayOrchestrator.
 */
export interface TodayTemporalInputProvider {
  getInputs(): Promise<TodayTemporalInputResult>;
}

/**
 * Presentation-layer view model for an individual task card.
 * Contains presentation-only `sortInstant` representing the effective
 * chronological instant for this occurrence inside a specific prayer tab projection.
 */
export interface TaskCardViewModel {
  occurrenceId: string;
  taskDefinitionId: string;
  title: string;
  scheduleType: ScheduleType;
  scheduleLabel: string;
  priority: 'NORMAL' | 'IMPORTANT';
  status: OccurrenceStatus;
  estimatedMinutes: number | null;
  sortInstant: string | null;
  createdAt: string;
  completedAt: string | null;
  missedAt: string | null;
  dueAt: string | null;
  expiresAt: string | null;
}

/**
 * Temporal state of a prayer tab relative to wall-clock `now`.
 * Independent from whether the tab is currently selected by the user.
 */
export type PrayerTabTemporalState = 'PAST' | 'CURRENT' | 'FUTURE';

/**
 * View model for one of the five fixed prayer tabs.
 */
export interface PrayerTabViewModel {
  prayer: Prayer;
  name: string;
  arabicName: string;
  startTime: string;
  startDateTime: string;
  temporalState: PrayerTabTemporalState;
  scheduledTasks: TaskCardViewModel[];
  missedTasks: TaskCardViewModel[];
  completedTasks: TaskCardViewModel[];
  anytimeTasks: TaskCardViewModel[];
}

/**
 * Empty state classifications for a prayer tab.
 */
export type EmptyStateType = 'NOTHING_SCHEDULED' | 'ALL_DONE' | null;

/**
 * Mid-session prayer change transition state.
 * Displayed as a banner prompting the user to view the new prayer.
 */
export interface PrayerTransitionState {
  newPrayer: Prayer;
  message: string;
}

/**
 * Immutable view model for the entire Today screen.
 * Contains no state that resets user selections.
 */
export interface TodayViewModel {
  planningDayKey: string;
  planningDay: PlanningDay;
  currentPrayer: Prayer;
  tabs: PrayerTabViewModel[];
  nextPrayer: { prayer: Prayer; time: string } | null;
}

/**
 * Explicit orchestration runtime context cached in the store.
 * Does NOT contain ephemeral UI state (selectedPrayer, nextPrayer).
 */
export interface TodayRuntimeContext {
  timeline: PrayerTimeline;
  planningDay: PlanningDay;
  planningDayConfig: PlanningDayConfig;
  refreshedAt: string;
}

/**
 * Output of a full refresh operation.
 */
export interface TodayRefreshResult {
  viewModel: TodayViewModel;
  runtime: TodayRuntimeContext;
}

/**
 * Overall Today screen store status.
 */
export type TodayStoreStatus = 'idle' | 'loading' | 'ready' | 'setup_required' | 'error';
