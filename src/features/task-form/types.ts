import type { Prayer } from '@/constants/prayers';
import type { TaskPriority, TaskDefinition, TaskOccurrence, ReminderRule } from '@/domain/task/types';
import type { ISOWeekday } from '@/domain/recurrence/types';

export type ScheduleMode = 'EXACT_TIME' | 'PRAYER_RELATIVE' | 'PRAYER_WINDOW' | 'ANYTIME_TODAY';

export interface ExactTimeDraft {
  localTime: string; // 'HH:mm'
}

export interface PrayerRelativeDraft {
  prayer: Prayer;
  relation: 'BEFORE' | 'AFTER';
  offsetMinutes: number;
}

export interface PrayerWindowDraft {
  startPrayer: Prayer;
  endPrayer: Prayer;
}

export type RecurrencePreset =
  | 'NONE'
  | 'DAILY'
  | 'WEEKDAYS'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'SPECIFIC_DAYS'
  | 'CUSTOM';

export type RecurrenceCalendar = 'GREGORIAN' | 'HIJRI';

export type CustomGregorianFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface CustomGregorianDraft {
  frequency: CustomGregorianFrequency;
  interval: number; // >= 1
  selectedWeekdays: ISOWeekday[]; // 1=MO to 7=SU
  selectedMonthDays: number[]; // 1..31
}

export type HijriPattern = 'DAYS_OF_MONTH' | 'MONTHS_OF_YEAR' | 'DAYS_OF_SELECTED_MONTHS';

export interface CustomHijriDraft {
  pattern: HijriPattern;
  selectedDays: number[]; // 1..30
  selectedMonths: number[]; // 1..12
}

export interface SubtaskDraft {
  id: string; // UUID
  title: string;
  isCompleted?: boolean;
}

export type EditScope = 'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'ALL_OCCURRENCES';

export type SavePhase = 'IDLE' | 'SUBMITTING' | 'COMMITTED' | 'SUCCESS' | 'PARTIAL_SUCCESS';

export interface FormState {
  mode: 'CREATE' | 'EDIT';
  editScope: EditScope | null;

  // Identity for edit
  initialDefinition: TaskDefinition | null;
  initialOccurrence: TaskOccurrence | null;

  // Dual date model
  civilSeedDate: string; // YYYY-MM-DD
  planningDayDate: string; // YYYY-MM-DD

  // Core fields
  title: string;
  scheduleMode: ScheduleMode;

  // Preserved mode-specific drafts
  exactDraft: ExactTimeDraft;
  relativeDraft: PrayerRelativeDraft;
  windowDraft: PrayerWindowDraft;

  // Recurrence
  recurrencePreset: RecurrencePreset;
  recurrenceCalendar: RecurrenceCalendar;
  specificDays: ISOWeekday[]; // For SPECIFIC_DAYS preset
  customGregorianDraft: CustomGregorianDraft;
  customHijriDraft: CustomHijriDraft;

  // More options
  priority: TaskPriority;
  estimatedMinutes: number | null;
  notes: string;
  subtasks: SubtaskDraft[];
  tags: string[];
  reminderMinutes: number | null;
  existingReminderRule: ReminderRule | null;

  // Form meta
  isDirty: boolean;
  validationErrors: Record<string, string>;
  savePhase: SavePhase;
}

export type FormAction =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_CIVIL_SEED_DATE'; payload: string }
  | { type: 'SET_PLANNING_DAY_DATE'; payload: string }
  | { type: 'SET_SCHEDULE_MODE'; payload: ScheduleMode }
  | { type: 'UPDATE_EXACT_DRAFT'; payload: Partial<ExactTimeDraft> }
  | { type: 'UPDATE_RELATIVE_DRAFT'; payload: Partial<PrayerRelativeDraft> }
  | { type: 'UPDATE_WINDOW_DRAFT'; payload: Partial<PrayerWindowDraft> }
  | { type: 'SET_RECURRENCE_PRESET'; payload: RecurrencePreset }
  | { type: 'SET_RECURRENCE_CALENDAR'; payload: RecurrenceCalendar }
  | { type: 'SET_SPECIFIC_DAYS'; payload: ISOWeekday[] }
  | { type: 'UPDATE_CUSTOM_GREGORIAN_DRAFT'; payload: Partial<CustomGregorianDraft> }
  | { type: 'UPDATE_CUSTOM_HIJRI_DRAFT'; payload: Partial<CustomHijriDraft> }
  | { type: 'SET_PRIORITY'; payload: TaskPriority }
  | { type: 'SET_ESTIMATED_MINUTES'; payload: number | null }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'ADD_SUBTASK'; payload: { title: string } }
  | { type: 'UPDATE_SUBTASK'; payload: { id: string; title: string } }
  | { type: 'TOGGLE_SUBTASK'; payload: { id: string } }
  | { type: 'REMOVE_SUBTASK'; payload: { id: string } }
  | { type: 'SET_TAGS'; payload: string[] }
  | { type: 'SET_REMINDER_MINUTES'; payload: number | null }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string> }
  | { type: 'SET_SAVE_PHASE'; payload: SavePhase }
  | { type: 'SET_EDIT_SCOPE'; payload: EditScope };

export type SyncStage = 'DISCOVERY' | 'RECURRENCE' | 'CONTEXT' | 'DELETE' | 'MATERIALIZE';

export interface SyncIssue {
  stage: SyncStage;
  seriesId?: string;
  seedDate?: string;
  code?: string;
  message: string;
}

export interface SyncCounts {
  created: number;
  retained: number;
  deleted: number;
}

export type OrchestratorResult =
  | {
      status: 'SAVED_AND_SYNCED';
      definitionId: string;
      seriesId: string;
      scope?: EditScope;
      sync: SyncCounts;
    }
  | {
      status: 'SAVED_SYNC_INCOMPLETE';
      definitionId: string;
      seriesId: string;
      scope?: EditScope;
      sync: SyncCounts;
      issues: SyncIssue[];
    };

export interface HorizonSyncResult {
  seriesProcessed: number;
  created: number;
  retained: number;
  deleted: number;
  issues: SyncIssue[];
}

export interface SchedulePreviewResult {
  status: 'READY' | 'CONTEXT_UNAVAILABLE' | 'INVALID';
  primaryLabel?: string;
  secondaryLabel?: string;
  reason?: string;
}
