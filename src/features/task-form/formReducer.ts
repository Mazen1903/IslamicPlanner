import type { Prayer } from '@/constants/prayers';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';
import type {
  FormAction,
  FormState,
  ScheduleMode,
  ExactTimeDraft,
  PrayerRelativeDraft,
  PrayerWindowDraft,
  CustomGregorianDraft,
  CustomHijriDraft,
  EditScope,
  RecurrencePreset,
} from './types';
import { generateUuid } from '@/utils/uuid';
import { parseRecurrenceRule } from '@/domain/recurrence/rruleAdapter';
import { isoWeekday } from '@/domain/recurrence/dateUtils';

export interface CreateFormInitialParams {
  civilSeedDate: string;
  planningDayDate: string;
  launchPrayer?: Prayer;
  initialDefinition?: TaskDefinition;
  initialOccurrence?: TaskOccurrence;
  editScope?: EditScope;
}

export const DEFAULT_EXACT_DRAFT: ExactTimeDraft = {
  localTime: '09:00',
};

export const DEFAULT_RELATIVE_DRAFT: PrayerRelativeDraft = {
  prayer: 'DHUHR',
  relation: 'AFTER',
  offsetMinutes: 15,
};

export const DEFAULT_WINDOW_DRAFT: PrayerWindowDraft = {
  startPrayer: 'DHUHR',
  endPrayer: 'ASR',
};

export const DEFAULT_CUSTOM_GREGORIAN: CustomGregorianDraft = {
  frequency: 'DAILY',
  interval: 1,
  selectedWeekdays: [],
  selectedMonthDays: [],
};

export const DEFAULT_CUSTOM_HIJRI: CustomHijriDraft = {
  pattern: 'DAYS_OF_MONTH',
  selectedDays: [13, 14, 15],
  selectedMonths: [],
};

/**
 * Derives default schedule mode and draft values from a launch prayer.
 */
export function getPrayerLaunchDefaults(prayer: Prayer): {
  mode: ScheduleMode;
  relativeDraft: PrayerRelativeDraft;
  windowDraft: PrayerWindowDraft;
} {
  switch (prayer) {
    case 'FAJR':
      return {
        mode: 'PRAYER_WINDOW',
        relativeDraft: { prayer: 'FAJR', relation: 'AFTER', offsetMinutes: 0 },
        windowDraft: { startPrayer: 'FAJR', endPrayer: 'DHUHR' },
      };
    case 'DHUHR':
      return {
        mode: 'PRAYER_WINDOW',
        relativeDraft: { prayer: 'DHUHR', relation: 'AFTER', offsetMinutes: 0 },
        windowDraft: { startPrayer: 'DHUHR', endPrayer: 'ASR' },
      };
    case 'ASR':
      return {
        mode: 'PRAYER_WINDOW',
        relativeDraft: { prayer: 'ASR', relation: 'AFTER', offsetMinutes: 0 },
        windowDraft: { startPrayer: 'ASR', endPrayer: 'MAGHRIB' },
      };
    case 'MAGHRIB':
      return {
        mode: 'PRAYER_WINDOW',
        relativeDraft: { prayer: 'MAGHRIB', relation: 'AFTER', offsetMinutes: 0 },
        windowDraft: { startPrayer: 'MAGHRIB', endPrayer: 'ISHA' },
      };
    case 'ISHA':
      // Spec §11: Isha defaults to PRAYER_RELATIVE (ISHA, AFTER, 0). Never wrapping window!
      return {
        mode: 'PRAYER_RELATIVE',
        relativeDraft: { prayer: 'ISHA', relation: 'AFTER', offsetMinutes: 0 },
        windowDraft: { startPrayer: 'MAGHRIB', endPrayer: 'ISHA' },
      };
  }
}

/**
 * Creates the initial FormState for Create or Edit modes.
 */
export function createInitialFormState(params: CreateFormInitialParams): FormState {
  const {
    civilSeedDate,
    planningDayDate,
    launchPrayer,
    initialDefinition,
    initialOccurrence,
    editScope,
  } = params;

  let scheduleMode: ScheduleMode = 'EXACT_TIME';
  let exactDraft: ExactTimeDraft = { ...DEFAULT_EXACT_DRAFT };
  let relativeDraft: PrayerRelativeDraft = { ...DEFAULT_RELATIVE_DRAFT };
  let windowDraft: PrayerWindowDraft = { ...DEFAULT_WINDOW_DRAFT };

  if (launchPrayer) {
    const defaults = getPrayerLaunchDefaults(launchPrayer);
    scheduleMode = defaults.mode;
    relativeDraft = defaults.relativeDraft;
    windowDraft = defaults.windowDraft;
  }

  // If initializing from an existing TaskDefinition (Edit mode)
  if (initialDefinition) {
    scheduleMode = initialDefinition.scheduleType;
    if (initialDefinition.scheduleType === 'EXACT_TIME' && initialDefinition.scheduleData) {
      const data = initialDefinition.scheduleData as any;
      if (data.localTime) exactDraft = { localTime: data.localTime };
    } else if (
      initialDefinition.scheduleType === 'PRAYER_RELATIVE' &&
      initialDefinition.scheduleData
    ) {
      const data = initialDefinition.scheduleData as any;
      const prayer = data.anchorPrayer ?? data.prayer ?? 'DHUHR';
      const relation = data.direction ?? data.relation ?? 'AFTER';
      relativeDraft = {
        prayer,
        relation,
        offsetMinutes: data.offsetMinutes ?? 0,
      };
    } else if (
      initialDefinition.scheduleType === 'PRAYER_WINDOW' &&
      initialDefinition.scheduleData
    ) {
      const data = initialDefinition.scheduleData as any;
      windowDraft = {
        startPrayer: data.startPrayer ?? 'DHUHR',
        endPrayer: data.endPrayer ?? 'ASR',
      };
    }

    // Recurrence parsing
    let recurrencePreset: RecurrencePreset = 'NONE';
    let recurrenceCalendar: 'GREGORIAN' | 'HIJRI' = 'GREGORIAN';
    let customGreg: CustomGregorianDraft = { ...DEFAULT_CUSTOM_GREGORIAN };
    let customHij: CustomHijriDraft = { ...DEFAULT_CUSTOM_HIJRI };
    let specDays = [isoWeekday(civilSeedDate)];

    if (initialDefinition.hijriRecurrence) {
      recurrenceCalendar = 'HIJRI';
      recurrencePreset = 'CUSTOM';
      const h = initialDefinition.hijriRecurrence;
      if (h.hijriDays && h.hijriMonths) {
        customHij = {
          pattern: 'DAYS_OF_SELECTED_MONTHS',
          selectedDays: [...h.hijriDays],
          selectedMonths: [...h.hijriMonths],
        };
      } else if (h.hijriDays) {
        customHij = {
          pattern: 'DAYS_OF_MONTH',
          selectedDays: [...h.hijriDays],
          selectedMonths: [],
        };
      } else if (h.hijriMonths) {
        customHij = {
          pattern: 'MONTHS_OF_YEAR',
          selectedDays: [],
          selectedMonths: [...h.hijriMonths],
        };
      }
    } else if (initialDefinition.recurrenceRule) {
      recurrenceCalendar = 'GREGORIAN';
      const ruleStr = initialDefinition.recurrenceRule;
      try {
        const parsed = parseRecurrenceRule(ruleStr);
        if (parsed.frequency === 'DAILY' && parsed.interval === 1) {
          recurrencePreset = 'DAILY';
        } else if (
          parsed.frequency === 'WEEKLY' &&
          parsed.interval === 1 &&
          parsed.byWeekday &&
          parsed.byWeekday.length === 5 &&
          [1, 2, 3, 4, 5].every((d, i) => parsed.byWeekday![i] === d)
        ) {
          recurrencePreset = 'WEEKDAYS';
        } else if (parsed.frequency === 'WEEKLY' && parsed.interval === 1 && parsed.byWeekday?.length === 1) {
          recurrencePreset = 'WEEKLY';
        } else if (parsed.frequency === 'MONTHLY' && parsed.interval === 1 && parsed.byMonthDay?.length === 1) {
          recurrencePreset = 'MONTHLY';
        } else {
          recurrencePreset = 'CUSTOM';
          customGreg = {
            frequency: parsed.frequency,
            interval: parsed.interval,
            selectedWeekdays: parsed.byWeekday ? [...parsed.byWeekday] : [],
            selectedMonthDays: parsed.byMonthDay ? [...parsed.byMonthDay] : [],
          };
        }
      } catch {
        recurrencePreset = 'CUSTOM';
      }
    }

    // Title & Notes may be overridden in initialOccurrence if editing single occurrence
    const title =
      editScope === 'THIS_OCCURRENCE' && initialOccurrence?.overrideData?.title
        ? initialOccurrence.overrideData.title
        : initialDefinition.title;

    const notes =
      editScope === 'THIS_OCCURRENCE' && initialOccurrence?.overrideData?.notes !== undefined
        ? initialOccurrence.overrideData.notes ?? ''
        : initialDefinition.notes ?? '';

    // Subtasks
    const completedSubtaskIds = new Set(
      initialOccurrence?.overrideData?.completedSubtaskIds ?? []
    );
    const subtasks = (initialDefinition.subtasks ?? []).map(st => ({
      id: st.id,
      title: st.title,
      isCompleted: completedSubtaskIds.has(st.id),
    }));

    return {
      mode: 'EDIT',
      editScope: editScope ?? null,
      initialDefinition,
      initialOccurrence: initialOccurrence ?? null,
      civilSeedDate,
      planningDayDate,
      title,
      scheduleMode,
      exactDraft,
      relativeDraft,
      windowDraft,
      recurrencePreset,
      recurrenceCalendar,
      specificDays: specDays,
      customGregorianDraft: customGreg,
      customHijriDraft: customHij,
      priority: initialDefinition.priority ?? 'NORMAL',
      estimatedMinutes: initialDefinition.estimatedMinutes ?? null,
      notes,
      subtasks,
      tags: initialDefinition.tags ? [...initialDefinition.tags] : [],
      reminderMinutes: initialDefinition.reminderRule?.offsetMinutes ?? null,
      existingReminderRule: initialDefinition.reminderRule ?? null,
      isDirty: false,
      validationErrors: {},
      savePhase: 'IDLE',
    };
  }

  // Create Mode
  return {
    mode: 'CREATE',
    editScope: null,
    initialDefinition: null,
    initialOccurrence: null,
    civilSeedDate,
    planningDayDate,
    title: '',
    scheduleMode,
    exactDraft,
    relativeDraft,
    windowDraft,
    recurrencePreset: 'NONE',
    recurrenceCalendar: 'GREGORIAN',
    specificDays: [isoWeekday(civilSeedDate)],
    customGregorianDraft: { ...DEFAULT_CUSTOM_GREGORIAN },
    customHijriDraft: { ...DEFAULT_CUSTOM_HIJRI },
    priority: 'NORMAL',
    estimatedMinutes: null,
    notes: '',
    subtasks: [],
    tags: [],
    reminderMinutes: null,
    existingReminderRule: null,
    isDirty: false,
    validationErrors: {},
    savePhase: 'IDLE',
  };
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_TITLE':
      return {
        ...state,
        title: action.payload,
        isDirty: true,
        validationErrors: { ...state.validationErrors, title: '' },
      };

    case 'SET_CIVIL_SEED_DATE':
      return {
        ...state,
        civilSeedDate: action.payload,
        isDirty: true,
      };

    case 'SET_PLANNING_DAY_DATE':
      return {
        ...state,
        planningDayDate: action.payload,
        isDirty: true,
      };

    case 'SET_SCHEDULE_MODE':
      // Switching mode preserves all mode-specific draft values
      return {
        ...state,
        scheduleMode: action.payload,
        isDirty: true,
      };

    case 'UPDATE_EXACT_DRAFT':
      return {
        ...state,
        exactDraft: { ...state.exactDraft, ...action.payload },
        isDirty: true,
      };

    case 'UPDATE_RELATIVE_DRAFT':
      return {
        ...state,
        relativeDraft: { ...state.relativeDraft, ...action.payload },
        isDirty: true,
      };

    case 'UPDATE_WINDOW_DRAFT':
      return {
        ...state,
        windowDraft: { ...state.windowDraft, ...action.payload },
        isDirty: true,
      };

    case 'SET_RECURRENCE_PRESET':
      return {
        ...state,
        recurrencePreset: action.payload,
        isDirty: true,
      };

    case 'SET_RECURRENCE_CALENDAR':
      return {
        ...state,
        recurrenceCalendar: action.payload,
        isDirty: true,
      };

    case 'SET_SPECIFIC_DAYS':
      return {
        ...state,
        specificDays: action.payload,
        isDirty: true,
      };

    case 'UPDATE_CUSTOM_GREGORIAN_DRAFT':
      return {
        ...state,
        customGregorianDraft: { ...state.customGregorianDraft, ...action.payload },
        isDirty: true,
      };

    case 'UPDATE_CUSTOM_HIJRI_DRAFT':
      return {
        ...state,
        customHijriDraft: { ...state.customHijriDraft, ...action.payload },
        isDirty: true,
      };

    case 'SET_PRIORITY':
      return {
        ...state,
        priority: action.payload,
        isDirty: true,
      };

    case 'SET_ESTIMATED_MINUTES':
      return {
        ...state,
        estimatedMinutes: action.payload,
        isDirty: true,
      };

    case 'SET_NOTES':
      return {
        ...state,
        notes: action.payload,
        isDirty: true,
      };

    case 'ADD_SUBTASK': {
      if (!action.payload.title.trim()) return state;
      const newSubtask = {
        id: generateUuid(),
        title: action.payload.title.trim(),
        isCompleted: false,
      };
      return {
        ...state,
        subtasks: [...state.subtasks, newSubtask],
        isDirty: true,
      };
    }

    case 'UPDATE_SUBTASK':
      return {
        ...state,
        subtasks: state.subtasks.map(s =>
          s.id === action.payload.id ? { ...s, title: action.payload.title } : s
        ),
        isDirty: true,
      };

    case 'TOGGLE_SUBTASK':
      return {
        ...state,
        subtasks: state.subtasks.map(s =>
          s.id === action.payload.id ? { ...s, isCompleted: !s.isCompleted } : s
        ),
        isDirty: true,
      };

    case 'REMOVE_SUBTASK':
      return {
        ...state,
        subtasks: state.subtasks.filter(s => s.id !== action.payload.id),
        isDirty: true,
      };

    case 'SET_TAGS':
      return {
        ...state,
        tags: action.payload,
        isDirty: true,
      };

    case 'SET_REMINDER_MINUTES':
      return {
        ...state,
        reminderMinutes: action.payload,
        isDirty: true,
      };

    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.payload,
      };

    case 'SET_SAVE_PHASE':
      return {
        ...state,
        savePhase: action.payload,
      };

    case 'SET_EDIT_SCOPE':
      return {
        ...state,
        editScope: action.payload,
      };

    default:
      return state;
  }
}
