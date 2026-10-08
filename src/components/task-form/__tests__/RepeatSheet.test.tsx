import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { RepeatSheet } from '../RepeatSheet';
import { createInitialFormState, formReducer } from '@/features/task-form/formReducer';

describe('RepeatSheet', () => {
  it('renders all presets including Every other day and selects it', async () => {
    const state = createInitialFormState({ civilSeedDate: '2026-10-07', planningDayDate: '2026-10-07' });
    const dispatch = jest.fn();
    const onClose = jest.fn();

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <RepeatSheet visible={true} onClose={onClose} state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    expect(getByText('Every other day')).toBeTruthy();
    expect(getByText(/Every 2 days • Day on, day off/i)).toBeTruthy();

    await fireEvent.press(getByTestId('repeat-preset-every_other_day'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_RECURRENCE_PRESET',
      payload: 'EVERY_OTHER_DAY',
    });

    await fireEvent.press(getByTestId('repeat-sheet-close-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders upcoming active days preview when EVERY_OTHER_DAY is selected', async () => {
    let state = createInitialFormState({ civilSeedDate: '2026-10-07', planningDayDate: '2026-10-07' });
    state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'EVERY_OTHER_DAY' });
    const dispatch = jest.fn();

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <RepeatSheet visible={true} onClose={jest.fn()} state={state} dispatch={dispatch} />
      </ThemeProvider>
    );

    expect(getByTestId('every-other-day-preview-sheet')).toBeTruthy();
    expect(getByText(/Upcoming active days/i)).toBeTruthy();
  });
});
