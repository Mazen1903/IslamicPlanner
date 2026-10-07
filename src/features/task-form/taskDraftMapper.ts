import type {
  CreateTaskParams,
  TaskDefinitionUpdatePatch,
  OccurrenceOverrideData,
  ScheduleType,
  ScheduleDataFor,
  ExactTimeData,
  PrayerRelativeData,
  PrayerWindowData,
  AnytimeTodayData,
  HijriRecurrenceData,
  ReminderRule,
} from '@/domain/task/types';
import type { FormState } from './types';
import { serializePresetToRRule } from './rruleSerializer';

/**
 * Derives startDate according to the Dual-Date Form Model:
 * - EXACT_TIME, PRAYER_RELATIVE, PRAYER_WINDOW => civilSeedDate
 * - ANYTIME_TODAY => planningDayDate
 */
export function deriveStartDateFromState(state: FormState): string {
  if (state.scheduleMode === 'ANYTIME_TODAY') {
    return state.planningDayDate;
  }
  return state.civilSeedDate;
}

/**
 * Serializes ONLY the active schedule mode draft into ScheduleData.
 * Inactive schedule values never leak into the domain payload.
 */
export function deriveScheduleDataFromState(
  state: FormState
): {
  scheduleType: ScheduleType;
  scheduleData: ScheduleDataFor<ScheduleType>;
} {
  switch (state.scheduleMode) {
    case 'EXACT_TIME': {
      const data: ExactTimeData = {
        localTime: state.exactDraft.localTime.trim(),
      };
      return {
        scheduleType: 'EXACT_TIME',
        scheduleData: data as ScheduleDataFor<'EXACT_TIME'>,
      };
    }

    case 'PRAYER_RELATIVE': {
      const data: PrayerRelativeData = {
        anchorPrayer: state.relativeDraft.prayer,
        direction: state.relativeDraft.relation,
        offsetMinutes: state.relativeDraft.offsetMinutes,
      };
      return {
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: data as ScheduleDataFor<'PRAYER_RELATIVE'>,
      };
    }

    case 'PRAYER_WINDOW': {
      const data: PrayerWindowData = {
        startPrayer: state.windowDraft.startPrayer,
        endPrayer: state.windowDraft.endPrayer,
      };
      return {
        scheduleType: 'PRAYER_WINDOW',
        scheduleData: data as ScheduleDataFor<'PRAYER_WINDOW'>,
      };
    }

    case 'ANYTIME_TODAY': {
      const data: AnytimeTodayData = {};
      return {
        scheduleType: 'ANYTIME_TODAY',
        scheduleData: data as ScheduleDataFor<'ANYTIME_TODAY'>,
      };
    }

    default:
      throw new Error(`Cannot derive schedule data for unselected scheduleMode: ${state.scheduleMode}`);
  }
}

/**
 * Derives recurrence representations.
 * Gregorian and Hijri are strictly mutually exclusive.
 */
export function deriveRecurrenceFromState(state: FormState): {
  recurrenceRule: string | null;
  hijriRecurrence: HijriRecurrenceData | null;
} {
  if (state.recurrencePreset === 'NONE') {
    return { recurrenceRule: null, hijriRecurrence: null };
  }

  if (state.recurrenceCalendar === 'HIJRI') {
    const draft = state.customHijriDraft;
    let hijriDays: number[] | null = null;
    let hijriMonths: number[] | null = null;

    if (draft.pattern === 'DAYS_OF_MONTH') {
      hijriDays = draft.selectedDays.length > 0 ? [...draft.selectedDays].sort((a, b) => a - b) : null;
    } else if (draft.pattern === 'MONTHS_OF_YEAR') {
      hijriMonths = draft.selectedMonths.length > 0 ? [...draft.selectedMonths].sort((a, b) => a - b) : null;
    } else if (draft.pattern === 'DAYS_OF_SELECTED_MONTHS') {
      hijriDays = draft.selectedDays.length > 0 ? [...draft.selectedDays].sort((a, b) => a - b) : null;
      hijriMonths = draft.selectedMonths.length > 0 ? [...draft.selectedMonths].sort((a, b) => a - b) : null;
    }

    return {
      recurrenceRule: null,
      hijriRecurrence: {
        hijriDays,
        hijriMonths,
      },
    };
  }

  // Gregorian
  const rule = serializePresetToRRule(state.recurrencePreset, state.civilSeedDate, {
    specificDays: state.specificDays,
    customGregorianDraft: state.customGregorianDraft,
  });

  return {
    recurrenceRule: rule,
    hijriRecurrence: null,
  };
}

/**
 * Derives reminder rule preserving existing unknown metadata fields on edit.
 */
export function deriveReminderRuleFromState(state: FormState): ReminderRule | null {
  if (state.reminderEnabled === false) {
    return null;
  }

  const base: Record<string, unknown> = state.existingReminderRule ? { ...state.existingReminderRule } : {};
  const offsets = state.reminders && state.reminders.length > 0
    ? state.reminders
    : (typeof state.reminderMinutes === 'number' ? [state.reminderMinutes] : []);
  const prayerAnchors = state.reminderPrayerAnchors && state.reminderPrayerAnchors.length > 0
    ? state.reminderPrayerAnchors
    : undefined;

  if (state.scheduleMode === 'ANYTIME_TODAY') {
    if (offsets.length === 0 && !state.reminderTimeOfDay && !prayerAnchors) {
      return null;
    }
    if (offsets.length > 0) {
      base.offsetsMinutes = offsets;
      base.offsetMinutes = offsets[0];
    }
    base.timeOfDay = state.reminderTimeOfDay || '09:00';
  } else {
    if (offsets.length === 0 && !prayerAnchors) {
      return null;
    }
    if (state.reminders && state.reminders.length > 0) {
      base.offsetsMinutes = offsets;
    }
    base.offsetMinutes = offsets[0];
    delete base.timeOfDay;
  }

  if (prayerAnchors) {
    base.prayerAnchors = prayerAnchors;
  }

  // Attach v2 metadata if customized
  if (state.reminderSoundId && state.reminderSoundId !== 'default') {
    base.soundId = state.reminderSoundId;
  }
  if (state.reminderCustomSoundUri) {
    base.customSoundUri = state.reminderCustomSoundUri;
  }
  if (state.reminderType === 'ENHANCED') {
    base.type = 'ENHANCED';
    base.enhancedMode = state.reminderEnhancedMode;
    base.playbackCount = state.reminderPlaybackCount;
    base.backgroundId = state.reminderBackgroundId;
  }
  if (state.reminderTimeSensitive) {
    base.timeSensitive = true;
  }
  if (state.reminderNag) {
    base.nag = { everyMinutes: 5, maxTimes: 3 };
  }

  return base as ReminderRule;
}

/**
 * Maps FormState to CreateTaskParams.
 */
export function mapStateToCreateParams(state: FormState): CreateTaskParams {
  const startDate = deriveStartDateFromState(state);
  const { scheduleType, scheduleData } = deriveScheduleDataFromState(state);
  const { recurrenceRule, hijriRecurrence } = deriveRecurrenceFromState(state);
  const reminderRule = deriveReminderRuleFromState(state);

  return {
    title: state.title.trim(),
    startDate,
    scheduleType,
    scheduleData,
    recurrenceRule,
    hijriRecurrence,
    priority: state.priority,
    estimatedMinutes: state.estimatedMinutes,
    notes: state.notes.trim() ? state.notes.trim() : null,
    tags: state.tags,
    subtasks: state.subtasks.map(s => ({ id: s.id, title: s.title.trim() })),
    reminderRule,
    streakEnabled: state.streakEnabled,
  };
}

/**
 * Maps FormState to TaskDefinitionUpdatePatch for "All occurrences" / entire series edit.
 */
export function mapStateToUpdatePatch(state: FormState): TaskDefinitionUpdatePatch {
  const startDate = deriveStartDateFromState(state);
  const { scheduleType, scheduleData } = deriveScheduleDataFromState(state);
  const { recurrenceRule, hijriRecurrence } = deriveRecurrenceFromState(state);
  const reminderRule = deriveReminderRuleFromState(state);

  return {
    title: state.title.trim(),
    startDate,
    scheduleType,
    scheduleData,
    recurrenceRule,
    hijriRecurrence,
    priority: state.priority,
    estimatedMinutes: state.estimatedMinutes,
    notes: state.notes.trim() ? state.notes.trim() : null,
    tags: state.tags,
    subtasks: state.subtasks.map(s => ({ id: s.id, title: s.title.trim() })),
    reminderRule,
  };
}

/**
 * Maps FormState to OccurrenceOverrideData for "This occurrence" edit.
 * Supports ONLY title, notes, and subtask completion per M4 contract.
 */
export function mapStateToOverrideData(state: FormState): OccurrenceOverrideData {
  const completedSubtaskIds = state.subtasks
    .filter(s => s.isCompleted)
    .map(s => s.id);

  return {
    title: state.title.trim(),
    notes: state.notes.trim() ? state.notes.trim() : undefined,
    completedSubtaskIds: completedSubtaskIds.length > 0 ? completedSubtaskIds : undefined,
  };
}
