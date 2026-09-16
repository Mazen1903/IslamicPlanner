import {
  deriveStartDateFromState,
  deriveScheduleDataFromState,
  deriveRecurrenceFromState,
  deriveReminderRuleFromState,
  mapStateToCreateParams,
  mapStateToUpdatePatch,
  mapStateToOverrideData,
} from '../taskDraftMapper';
import { createInitialFormState, formReducer } from '../formReducer';

describe('taskDraftMapper & Dual Date Serialization (M10)', () => {
  const civilDate = '2026-09-15';
  const planningDayKey = '2026-09-14';

  it('serializes startDate: EXACT_TIME, PRAYER_RELATIVE, PRAYER_WINDOW map to civilSeedDate', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });

    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'EXACT_TIME' });
    expect(deriveStartDateFromState(state)).toBe(civilDate);

    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'PRAYER_RELATIVE' });
    expect(deriveStartDateFromState(state)).toBe(civilDate);

    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'PRAYER_WINDOW' });
    expect(deriveStartDateFromState(state)).toBe(civilDate);
  });

  it('serializes startDate: ANYTIME_TODAY maps to planningDayDate', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'ANYTIME_TODAY' });

    expect(deriveStartDateFromState(state)).toBe(planningDayKey);
  });

  it('serializes ONLY the active schedule mode without leaking inactive drafts', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });

    // Set drafts on inactive modes
    state = formReducer(state, {
      type: 'UPDATE_EXACT_DRAFT',
      payload: { localTime: '18:00' },
    });
    state = formReducer(state, {
      type: 'UPDATE_RELATIVE_DRAFT',
      payload: { prayer: 'ASR', relation: 'AFTER', offsetMinutes: 30 },
    });
    state = formReducer(state, {
      type: 'UPDATE_WINDOW_DRAFT',
      payload: { startPrayer: 'DHUHR', endPrayer: 'ASR' },
    });

    // Active mode is PRAYER_RELATIVE
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'PRAYER_RELATIVE' });
    const relativePayload = deriveScheduleDataFromState(state);
    expect(relativePayload.scheduleType).toBe('PRAYER_RELATIVE');
    expect(relativePayload.scheduleData).toEqual({
      anchorPrayer: 'ASR',
      direction: 'AFTER',
      offsetMinutes: 30,
    });
    // Inactive fields (localTime, startPrayer, endPrayer) do NOT exist on relativePayload
    expect((relativePayload.scheduleData as any).localTime).toBeUndefined();
    expect((relativePayload.scheduleData as any).startPrayer).toBeUndefined();

    // Active mode is ANYTIME_TODAY
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'ANYTIME_TODAY' });
    const anytimePayload = deriveScheduleDataFromState(state);
    expect(anytimePayload.scheduleType).toBe('ANYTIME_TODAY');
    expect(anytimePayload.scheduleData).toEqual({});
  });

  it('enforces mutual exclusion between Gregorian and Hijri recurrence', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });

    // Gregorian DAILY
    state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'DAILY' });
    state = formReducer(state, { type: 'SET_RECURRENCE_CALENDAR', payload: 'GREGORIAN' });
    let rec = deriveRecurrenceFromState(state);
    expect(rec.recurrenceRule).toBe('FREQ=DAILY');
    expect(rec.hijriRecurrence).toBeNull();

    // Switch to Hijri Custom
    state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'CUSTOM' });
    state = formReducer(state, { type: 'SET_RECURRENCE_CALENDAR', payload: 'HIJRI' });
    state = formReducer(state, {
      type: 'UPDATE_CUSTOM_HIJRI_DRAFT',
      payload: { pattern: 'DAYS_OF_MONTH', selectedDays: [13, 14, 15], selectedMonths: [] },
    });
    rec = deriveRecurrenceFromState(state);
    expect(rec.recurrenceRule).toBeNull();
    expect(rec.hijriRecurrence).toEqual({
      hijriDays: [13, 14, 15],
      hijriMonths: null,
    });
  });

  it('preserves existing unknown reminder fields during edit', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = {
      ...state,
      existingReminderRule: { channelId: 'sound_alert_custom', customKey: 'xyz' },
      reminderMinutes: 20,
    };

    const reminder = deriveReminderRuleFromState(state);
    expect(reminder).toEqual({
      channelId: 'sound_alert_custom',
      customKey: 'xyz',
      offsetMinutes: 20,
    });
  });

  it('maps to OccurrenceOverrideData for THIS_OCCURRENCE', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Occurrence Title' });
    state = formReducer(state, { type: 'SET_NOTES', payload: 'Occurrence Notes' });
    state = formReducer(state, { type: 'ADD_SUBTASK', payload: { title: 'Subtask 1' } });
    const subtaskId = state.subtasks[0].id;
    state = formReducer(state, { type: 'TOGGLE_SUBTASK', payload: { id: subtaskId } });

    const override = mapStateToOverrideData(state);
    expect(override.title).toBe('Occurrence Title');
    expect(override.notes).toBe('Occurrence Notes');
    expect(override.completedSubtaskIds).toEqual([subtaskId]);
  });

  it('maps form state to full create params and update patch', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Comprehensive Task' });
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'EXACT_TIME' });
    state = formReducer(state, { type: 'UPDATE_EXACT_DRAFT', payload: { localTime: '14:30' } });
    state = formReducer(state, { type: 'SET_PRIORITY', payload: 'IMPORTANT' });
    state = formReducer(state, { type: 'SET_ESTIMATED_MINUTES', payload: 45 });
    state = formReducer(state, { type: 'SET_TAGS', payload: ['family', 'urgent'] });

    const createParams = mapStateToCreateParams(state);
    expect(createParams.title).toBe('Comprehensive Task');
    expect(createParams.startDate).toBe(civilDate);
    expect(createParams.scheduleType).toBe('EXACT_TIME');
    expect(createParams.scheduleData).toEqual({ localTime: '14:30' });
    expect(createParams.priority).toBe('IMPORTANT');
    expect(createParams.estimatedMinutes).toBe(45);
    expect(createParams.tags).toEqual(['family', 'urgent']);

    const updatePatch = mapStateToUpdatePatch(state);
    expect(updatePatch.title).toBe('Comprehensive Task');
    expect(updatePatch.startDate).toBe(civilDate);
    expect(updatePatch.priority).toBe('IMPORTANT');
    expect(updatePatch.estimatedMinutes).toBe(45);
  });
});
