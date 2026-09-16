import {
  createInitialFormState,
  formReducer,
  getPrayerLaunchDefaults,
} from '../formReducer';

describe('formReducer & Dual-Date Model (M10)', () => {
  const civilToday = '2026-09-15';
  const planningDayKey = '2026-09-14'; // Pre-Fajr scenario: civil date is Sep 15, but planning day is Sep 14

  it('maintains independent civilSeedDate and planningDayDate that do not alias', () => {
    const state = createInitialFormState({
      civilSeedDate: civilToday,
      planningDayDate: planningDayKey,
    });

    expect(state.civilSeedDate).toBe(civilToday);
    expect(state.planningDayDate).toBe(planningDayKey);
    expect(state.civilSeedDate).not.toBe(state.planningDayDate);

    // Updating civil date does not modify planningDayDate
    const nextState = formReducer(state, {
      type: 'SET_CIVIL_SEED_DATE',
      payload: '2026-09-20',
    });
    expect(nextState.civilSeedDate).toBe('2026-09-20');
    expect(nextState.planningDayDate).toBe(planningDayKey);

    // Updating planningDayDate does not modify civilSeedDate
    const thirdState = formReducer(nextState, {
      type: 'SET_PLANNING_DAY_DATE',
      payload: '2026-09-19',
    });
    expect(thirdState.planningDayDate).toBe('2026-09-19');
    expect(thirdState.civilSeedDate).toBe('2026-09-20');
  });

  it('preserves mode-specific draft values when switching schedule modes', () => {
    let state = createInitialFormState({
      civilSeedDate: civilToday,
      planningDayDate: planningDayKey,
    });

    // Default is EXACT_TIME: update exact draft
    state = formReducer(state, {
      type: 'UPDATE_EXACT_DRAFT',
      payload: { localTime: '14:30' },
    });
    expect(state.exactDraft.localTime).toBe('14:30');

    // Switch to PRAYER_RELATIVE and customize
    state = formReducer(state, {
      type: 'SET_SCHEDULE_MODE',
      payload: 'PRAYER_RELATIVE',
    });
    state = formReducer(state, {
      type: 'UPDATE_RELATIVE_DRAFT',
      payload: { prayer: 'ASR', relation: 'AFTER', offsetMinutes: 45 },
    });
    expect(state.scheduleMode).toBe('PRAYER_RELATIVE');
    expect(state.relativeDraft.offsetMinutes).toBe(45);

    // Switch to PRAYER_WINDOW and customize
    state = formReducer(state, {
      type: 'SET_SCHEDULE_MODE',
      payload: 'PRAYER_WINDOW',
    });
    state = formReducer(state, {
      type: 'UPDATE_WINDOW_DRAFT',
      payload: { startPrayer: 'DHUHR', endPrayer: 'ASR' },
    });
    expect(state.scheduleMode).toBe('PRAYER_WINDOW');

    // Switch to ANYTIME_TODAY
    state = formReducer(state, {
      type: 'SET_SCHEDULE_MODE',
      payload: 'ANYTIME_TODAY',
    });
    expect(state.scheduleMode).toBe('ANYTIME_TODAY');

    // Switch back to EXACT_TIME: exact draft '14:30' was preserved!
    state = formReducer(state, {
      type: 'SET_SCHEDULE_MODE',
      payload: 'EXACT_TIME',
    });
    expect(state.exactDraft.localTime).toBe('14:30');

    // Switch back to PRAYER_RELATIVE: relative draft 45 min was preserved!
    state = formReducer(state, {
      type: 'SET_SCHEDULE_MODE',
      payload: 'PRAYER_RELATIVE',
    });
    expect(state.relativeDraft.prayer).toBe('ASR');
    expect(state.relativeDraft.offsetMinutes).toBe(45);
  });

  it('prayer-tab launch defaults match M10 spec §11', () => {
    // Fajr -> Window (Fajr -> Dhuhr)
    const fajr = getPrayerLaunchDefaults('FAJR');
    expect(fajr.mode).toBe('PRAYER_WINDOW');
    expect(fajr.windowDraft).toEqual({ startPrayer: 'FAJR', endPrayer: 'DHUHR' });

    // Dhuhr -> Window (Dhuhr -> Asr)
    const dhuhr = getPrayerLaunchDefaults('DHUHR');
    expect(dhuhr.mode).toBe('PRAYER_WINDOW');
    expect(dhuhr.windowDraft).toEqual({ startPrayer: 'DHUHR', endPrayer: 'ASR' });

    // Asr -> Window (Asr -> Maghrib)
    const asr = getPrayerLaunchDefaults('ASR');
    expect(asr.mode).toBe('PRAYER_WINDOW');
    expect(asr.windowDraft).toEqual({ startPrayer: 'ASR', endPrayer: 'MAGHRIB' });

    // Maghrib -> Window (Maghrib -> Isha)
    const maghrib = getPrayerLaunchDefaults('MAGHRIB');
    expect(maghrib.mode).toBe('PRAYER_WINDOW');
    expect(maghrib.windowDraft).toEqual({ startPrayer: 'MAGHRIB', endPrayer: 'ISHA' });

    // Isha -> Relative (ISHA AFTER 0). Never wrapping window!
    const isha = getPrayerLaunchDefaults('ISHA');
    expect(isha.mode).toBe('PRAYER_RELATIVE');
    expect(isha.relativeDraft).toEqual({
      prayer: 'ISHA',
      relation: 'AFTER',
      offsetMinutes: 0,
    });
  });

  it('tracks dirty state accurately', () => {
    const state = createInitialFormState({
      civilSeedDate: civilToday,
      planningDayDate: planningDayKey,
    });
    expect(state.isDirty).toBe(false);

    const dirtyState = formReducer(state, {
      type: 'SET_TITLE',
      payload: 'New Title',
    });
    expect(dirtyState.isDirty).toBe(true);
  });

  it('manages subtasks: add, update, toggle, remove', () => {
    let state = createInitialFormState({
      civilSeedDate: civilToday,
      planningDayDate: planningDayKey,
    });

    state = formReducer(state, {
      type: 'ADD_SUBTASK',
      payload: { title: 'First Subtask' },
    });
    expect(state.subtasks).toHaveLength(1);
    expect(state.subtasks[0].title).toBe('First Subtask');
    expect(state.subtasks[0].isCompleted).toBe(false);

    const id = state.subtasks[0].id;
    state = formReducer(state, {
      type: 'TOGGLE_SUBTASK',
      payload: { id },
    });
    expect(state.subtasks[0].isCompleted).toBe(true);

    state = formReducer(state, {
      type: 'UPDATE_SUBTASK',
      payload: { id, title: 'Updated Title' },
    });
    expect(state.subtasks[0].title).toBe('Updated Title');

    state = formReducer(state, {
      type: 'REMOVE_SUBTASK',
      payload: { id },
    });
    expect(state.subtasks).toHaveLength(0);
  });
});
