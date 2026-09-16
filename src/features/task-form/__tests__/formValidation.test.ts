import { validateForm } from '../formValidation';
import { createInitialFormState, formReducer } from '../formReducer';

describe('formValidation (M10)', () => {
  const civilDate = '2026-09-15';
  const planningDayKey = '2026-09-15';

  it('rejects empty or whitespace title', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    let res = validateForm(state);
    expect(res.isValid).toBe(false);
    expect(res.errors.title).toBe('Title is required');

    state = formReducer(state, { type: 'SET_TITLE', payload: '   ' });
    res = validateForm(state);
    expect(res.isValid).toBe(false);
    expect(res.errors.title).toBe('Title is required');
  });

  it('validates Exact Time 24-hour HH:mm format', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Valid Title' });
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'EXACT_TIME' });

    state = formReducer(state, { type: 'UPDATE_EXACT_DRAFT', payload: { localTime: '25:00' } });
    let res = validateForm(state);
    expect(res.isValid).toBe(false);
    expect(res.errors.localTime).toBeDefined();

    state = formReducer(state, { type: 'UPDATE_EXACT_DRAFT', payload: { localTime: '14:30' } });
    res = validateForm(state);
    expect(res.isValid).toBe(true);
  });

  it('validates Prayer Relative: rejects Sunrise and negative offset', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Relative Task' });
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'PRAYER_RELATIVE' });

    // Sunrise rejected
    state = formReducer(state, {
      type: 'UPDATE_RELATIVE_DRAFT',
      payload: { prayer: 'SUNRISE' as any, relation: 'AFTER', offsetMinutes: 10 },
    });
    let res = validateForm(state);
    expect(res.isValid).toBe(false);
    expect(res.errors.prayer).toBeDefined();

    // Negative offset rejected
    state = formReducer(state, {
      type: 'UPDATE_RELATIVE_DRAFT',
      payload: { prayer: 'MAGHRIB', relation: 'AFTER', offsetMinutes: -5 },
    });
    res = validateForm(state);
    expect(res.isValid).toBe(false);
    expect(res.errors.offsetMinutes).toBeDefined();

    // Valid
    state = formReducer(state, {
      type: 'UPDATE_RELATIVE_DRAFT',
      payload: { prayer: 'MAGHRIB', relation: 'AFTER', offsetMinutes: 15 },
    });
    res = validateForm(state);
    expect(res.isValid).toBe(true);
  });

  it('validates Prayer Window: rejects identical prayers and wrapping windows in v1', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Window Task' });
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'PRAYER_WINDOW' });

    // Identical
    state = formReducer(state, {
      type: 'UPDATE_WINDOW_DRAFT',
      payload: { startPrayer: 'DHUHR', endPrayer: 'DHUHR' },
    });
    let res = validateForm(state);
    expect(res.isValid).toBe(false);
    expect(res.errors.prayerWindow).toBe('Start and end prayers cannot be the same');

    // Wrapping (e.g. Isha -> Fajr)
    state = formReducer(state, {
      type: 'UPDATE_WINDOW_DRAFT',
      payload: { startPrayer: 'ISHA', endPrayer: 'FAJR' },
    });
    res = validateForm(state);
    expect(res.isValid).toBe(false);
    expect(res.errors.prayerWindow).toBe('Prayer window cannot wrap around midnight in v1');

    // Valid non-wrapping
    state = formReducer(state, {
      type: 'UPDATE_WINDOW_DRAFT',
      payload: { startPrayer: 'FAJR', endPrayer: 'DHUHR' },
    });
    res = validateForm(state);
    expect(res.isValid).toBe(true);
  });

  it('validates Anytime Today without requiring clock time', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Anytime Task' });
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'ANYTIME_TODAY' });

    const res = validateForm(state);
    expect(res.isValid).toBe(true);
  });

  it('validates Custom Recurrence interval and days', () => {
    let state = createInitialFormState({ civilSeedDate: civilDate, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Recur Task' });
    state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'CUSTOM' });
    state = formReducer(state, { type: 'SET_RECURRENCE_CALENDAR', payload: 'GREGORIAN' });

    // Invalid interval 0
    state = formReducer(state, {
      type: 'UPDATE_CUSTOM_GREGORIAN_DRAFT',
      payload: { interval: 0 },
    });
    let res = validateForm(state);
    expect(res.isValid).toBe(false);
    expect(res.errors.interval).toBeDefined();

    // Valid interval
    state = formReducer(state, {
      type: 'UPDATE_CUSTOM_GREGORIAN_DRAFT',
      payload: { interval: 2 },
    });
    res = validateForm(state);
    expect(res.isValid).toBe(true);
  });
});
