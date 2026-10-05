import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskDetailsCard } from '../TaskDetailsCard';
import { createInitialFormState, formReducer } from '@/features/task-form/formReducer';

describe('TaskDetailsCard', () => {
  const civilToday = '2026-09-24';
  const planningDayKey = '2026-09-24';

  it('renders all rows collapsed with default summaries', async () => {
    const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    const dispatch = jest.fn();

    const { getByTestId, getByText, queryByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    expect(getByTestId('task-details-card')).toBeTruthy();
    expect(getByTestId('details-row-reminder')).toBeTruthy();
    expect(getByTestId('details-row-repeat')).toBeTruthy();
    expect(getByTestId('priority-normal')).toBeTruthy();
    expect(getByTestId('track-streak-switch')).toBeTruthy();
    expect(getByTestId('details-row-notes')).toBeTruthy();

    // Summaries
    expect(getByText('Reminder')).toBeTruthy();
    expect(getByText('None')).toBeTruthy();
    expect(getByText('Repeat')).toBeTruthy();
    expect(getByText("Doesn't repeat")).toBeTruthy();
    expect(getByText('Add extra details')).toBeTruthy();

    // Drawers start collapsed
    expect(queryByTestId('reminder-presets-row')).toBeNull();
    expect(queryByTestId('repeat-preset-daily')).toBeNull();
    expect(queryByTestId('task-notes-input')).toBeNull();
  });

  it('opens ReminderSheet bottom modal when Reminder row is tapped', async () => {
    const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    const dispatch = jest.fn();

    const { getByTestId, queryByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    // ReminderSheet modal initially closed
    expect(queryByTestId('reminder-sheet')).toBeNull();

    // Tap reminder row -> opens modal
    await fireEvent.press(getByTestId('details-row-reminder'));
    expect(getByTestId('reminder-sheet')).toBeTruthy();
  });

  it('supports reminders for ANYTIME_TODAY scheduleMode without disabling', async () => {
    let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'ANYTIME_TODAY' });
    const dispatch = jest.fn();

    const { getByTestId, queryByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    // Reminder row is accessible and opens ReminderSheet
    expect(queryByTestId('reminder-sheet')).toBeNull();
    await fireEvent.press(getByTestId('details-row-reminder'));
    expect(getByTestId('reminder-sheet')).toBeTruthy();
  });

  it('supports Repeat preset selection, specific days toggling, and custom modal', async () => {
    let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'SPECIFIC_DAYS' });
    const dispatch = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    // Expand Repeat
    await fireEvent.press(getByTestId('details-row-repeat'));

    // Specific days controls should be visible
    expect(getByTestId('specific-days-controls')).toBeTruthy();
    await fireEvent.press(getByTestId('weekday-toggle-1'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SPECIFIC_DAYS',
      payload: expect.arrayContaining([1]),
    });

    // Tap Daily chip
    await fireEvent.press(getByTestId('repeat-preset-daily'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_RECURRENCE_PRESET',
      payload: 'DAILY',
    });
  });

  it('opens CustomRecurrenceModal when Custom preset is selected', async () => {
    let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'CUSTOM' });
    const dispatch = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    // Expand repeat
    await fireEvent.press(getByTestId('details-row-repeat'));
    expect(getByTestId('open-custom-recurrence-modal')).toBeTruthy();

    await fireEvent.press(getByTestId('open-custom-recurrence-modal'));
    await waitFor(() => {
      expect(getByTestId('custom-recurrence-modal')).toBeTruthy();
    });
  });

  it('toggles Priority between Normal and Important', async () => {
    const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    const dispatch = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    await fireEvent.press(getByTestId('priority-normal'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_PRIORITY',
      payload: 'IMPORTANT',
    });
  });

  it('handles Track Streak with Alert confirmation when repeat is NONE', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    const dispatch = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    await fireEvent(getByTestId('track-streak-switch'), 'valueChange', true);
    expect(alertSpy).toHaveBeenCalledWith(
      'Enable Daily Repeat?',
      expect.stringContaining('Streak tracking requires a repeating schedule'),
      expect.any(Array)
    );

    alertSpy.mockRestore();
  });

  it('toggles Track Streak directly when repeat is set', async () => {
    let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'DAILY' });
    const dispatch = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    await fireEvent(getByTestId('track-streak-switch'), 'valueChange', true);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_STREAK_ENABLED',
      payload: true,
    });
  });

  it('expands Notes row and updates text', async () => {
    const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    const dispatch = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    await fireEvent.press(getByTestId('details-row-notes'));
    const input = getByTestId('task-notes-input');
    await fireEvent.changeText(input, 'Remember to bring books');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_NOTES',
      payload: 'Remember to bring books',
    });
  });

  it('renders signature LottiePriorityBadge and LottieFlameIcon assets', async () => {
    let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
    state = formReducer(state, { type: 'SET_PRIORITY', payload: 'IMPORTANT' });
    state = formReducer(state, { type: 'SET_STREAK_ENABLED', payload: true });
    const dispatch = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskDetailsCard state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    expect(getByTestId('priority-lottie-badge')).toBeTruthy();
    expect(getByTestId('streak-flame-icon')).toBeTruthy();
  });
});

