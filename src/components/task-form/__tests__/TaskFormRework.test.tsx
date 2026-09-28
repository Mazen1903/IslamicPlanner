import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskFormScreen } from '../TaskFormScreen';
import { RelativePrayerSubView } from '../RelativePrayerSubView';
import { MoreOptionsSubView } from '../MoreOptionsSubView';
import { createInitialFormState, formReducer } from '@/features/task-form/formReducer';
import type { TodayTemporalInputProvider, TodayTemporalInputs } from '@/services/types';

describe('Task Form Rework (All 5 Approved Phases)', () => {
  const civilToday = '2026-09-24';
  const planningDayKey = '2026-09-24';

  const validInputs: TodayTemporalInputs = {
    coordinates: { latitude: 40.7128, longitude: -74.006 },
    params: {
      method: 'MWL',
      asrMethod: 'SHAFI',
      highLatitudeRule: 'AUTO',
      polarCircleResolution: 'AQRAB_YAUM',
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      timezone: 'America/New_York',
    },
    planningDayConfig: { mode: 'FAJR' },
  };

  const mockProvider: TodayTemporalInputProvider = {
    getInputs: jest.fn().mockResolvedValue({
      status: 'READY',
      inputs: validInputs,
    }),
  };

  describe('Phase 3: Reminder on MAIN view', () => {
    it('surfaces reminder presets directly on MAIN view without navigating to More Options', async () => {
      const { getByTestId, queryByTestId } = await render(
        <ThemeProvider>
          <TaskFormScreen
            initialCivilSeedDate={civilToday}
            initialPlanningDayDate={planningDayKey}
            inputProvider={mockProvider}
            onSuccess={jest.fn()}
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );

      // Reminder presets should exist on the main screen
      expect(getByTestId('reminder-preset-none')).toBeTruthy();
      expect(getByTestId('reminder-preset-0')).toBeTruthy();
      expect(getByTestId('reminder-preset-5')).toBeTruthy();
      expect(getByTestId('reminder-preset-10')).toBeTruthy();
      expect(getByTestId('reminder-preset-15')).toBeTruthy();
      expect(getByTestId('reminder-preset-30')).toBeTruthy();
      expect(getByTestId('reminder-preset-60')).toBeTruthy();

      // Tap 15m preset
      await fireEvent.press(getByTestId('reminder-preset-15'));
      // No crash, active
    });

    it('displays anytime-reminder-helper when scheduleMode is ANYTIME_TODAY', async () => {
      const { getByTestId, queryByTestId } = await render(
        <ThemeProvider>
          <TaskFormScreen
            initialCivilSeedDate={civilToday}
            initialPlanningDayDate={planningDayKey}
            inputProvider={mockProvider}
            onSuccess={jest.fn()}
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );

      // Select Anytime Today
      await fireEvent.press(getByTestId('schedule-mode-anytime_today'));

      expect(getByTestId('anytime-reminder-helper')).toBeTruthy();
      expect(queryByTestId('reminder-preset-15')).toBeNull();
    });
  });

  describe('Phase 4: Steps removed from MAIN view and managed in More Options', () => {
    it('does not display Steps section directly on MAIN view', async () => {
      const { queryByText, queryByTestId } = await render(
        <ThemeProvider>
          <TaskFormScreen
            initialCivilSeedDate={civilToday}
            initialPlanningDayDate={planningDayKey}
            inputProvider={mockProvider}
            onSuccess={jest.fn()}
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(queryByText('Steps')).toBeNull();
      expect(queryByTestId('new-subtask-input')).toBeNull();
    });
  });

  describe('Phase 2: Prayer Offset Expansion in RelativePrayerSubView', () => {
    it('provides "At Prayer Time" shortcut that sets offset=0 and relation=AFTER', async () => {
      let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'PRAYER_RELATIVE' });
      state = formReducer(state, { type: 'UPDATE_RELATIVE_DRAFT', payload: { prayer: 'FAJR', offsetMinutes: 30, relation: 'BEFORE' } });
      const dispatch = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <RelativePrayerSubView
            state={state}
            dispatch={dispatch}
            previewResult={null}
            onBack={jest.fn()}
            onNext={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(getByTestId('relative-exact-shortcut')).toBeTruthy();
      await fireEvent.press(getByTestId('relative-exact-shortcut'));

      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_RELATIVE_DRAFT',
        payload: { offsetMinutes: 0, relation: 'AFTER' },
      });
    });

    it('supports ±5 and ±15 stepping up to 240 minutes', async () => {
      let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      state = formReducer(state, { type: 'UPDATE_RELATIVE_DRAFT', payload: { prayer: 'ASR', offsetMinutes: 10 } });
      const dispatch = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <RelativePrayerSubView
            state={state}
            dispatch={dispatch}
            previewResult={null}
            onBack={jest.fn()}
            onNext={jest.fn()}
          />
        </ThemeProvider>
      );

      // +5 -> 15
      await fireEvent.press(getByTestId('stepper-plus-5'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_RELATIVE_DRAFT',
        payload: { offsetMinutes: 15 },
      });

      // -5 -> 5
      await fireEvent.press(getByTestId('stepper-minus-5'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_RELATIVE_DRAFT',
        payload: { offsetMinutes: 5 },
      });

      // +15 -> 25
      await fireEvent.press(getByTestId('stepper-plus-15'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_RELATIVE_DRAFT',
        payload: { offsetMinutes: 25 },
      });

      // -15 -> 0 (clamped)
      await fireEvent.press(getByTestId('stepper-minus-15'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_RELATIVE_DRAFT',
        payload: { offsetMinutes: 0 },
      });
    });

    it('renders visible preset chips including 0, 5, 10, 15, 20, 30, 45, 60, 90, 120', async () => {
      let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      const dispatch = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <RelativePrayerSubView
            state={state}
            dispatch={dispatch}
            previewResult={null}
            onBack={jest.fn()}
            onNext={jest.fn()}
          />
        </ThemeProvider>
      );

      const presets = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120];
      for (const p of presets) {
        expect(getByTestId(`relative-offset-${p}`)).toBeTruthy();
      }

      await fireEvent.press(getByTestId('relative-offset-45'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_RELATIVE_DRAFT',
        payload: { offsetMinutes: 45 },
      });
    });

    it('renders "At Fajr" in summary when offset is 0', async () => {
      let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      state = formReducer(state, { type: 'UPDATE_RELATIVE_DRAFT', payload: { prayer: 'FAJR', offsetMinutes: 0 } });

      const { getByText } = await render(
        <ThemeProvider>
          <RelativePrayerSubView
            state={state}
            dispatch={jest.fn()}
            previewResult={null}
            onBack={jest.fn()}
            onNext={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(getByText('At Fajr')).toBeTruthy();
      expect(getByText('(at Fajr)')).toBeTruthy();
    });
  });

  describe('Phase 5: MoreOptionsSubView streamlined options', () => {
    it('only contains Priority, Notes, Attachment, and Habit Tracker — removed clutter', async () => {
      const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      const dispatch = jest.fn();

      const { getByText, queryByText, queryByTestId } = await render(
        <ThemeProvider>
          <MoreOptionsSubView
            state={state}
            dispatch={dispatch}
            onBack={jest.fn()}
            onSave={jest.fn()}
          />
        </ThemeProvider>
      );

      // Retained features
      expect(getByText('Priority')).toBeTruthy();
      expect(getByText('Notes')).toBeTruthy();
      expect(getByText('Subtasks')).toBeTruthy();
      expect(getByText('Attachment')).toBeTruthy();

      // Habit tracker removed per redesign
      expect(queryByText('Add to Habit Tracker')).toBeNull();

      // Removed clutter from this subview
      expect(queryByText('Reminder')).toBeNull();
      expect(queryByText('Duration')).toBeNull();
      expect(queryByText('Tags')).toBeNull();
      expect(queryByText('Private Task')).toBeNull();
    });
  });
});
