import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '@/theme';
import { ScheduleModeCards } from '../ScheduleModeCards';
import { RecurrenceSection } from '../RecurrenceSection';
import { MoreOptionsSection } from '../MoreOptionsSection';
import { EditScopeSheet } from '../EditScopeSheet';
import { SuccessScreen } from '../SuccessScreen';
import { PartialSuccessView } from '../PartialSuccessView';
import { TaskFormScreen } from '../TaskFormScreen';
import { createInitialFormState, formReducer } from '@/features/task-form/formReducer';
import type { TodayTemporalInputProvider, TodayTemporalInputs } from '@/services/types';

// Mock datetimepicker to avoid native dependency in test environment
jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');
  return function MockDateTimePicker(props: any) {
    return (
      <View testID={props.testID || 'mock-datetimepicker'}>
        <Text>MockDateTimePicker</Text>
      </View>
    );
  };
});



describe('Task Form UI Components & Accessibility (M10 §6, §11, §14, §16, §18, §21, §42, §43, §45, §46)', () => {
  const civilToday = '2026-09-15';
  const planningDayKey = '2026-09-15';

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

  describe('ScheduleModeCards', () => {
    it('renders all four scheduling modes with accessible radio role and selection state', async () => {
      const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      const dispatch = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <ScheduleModeCards state={state} dispatch={dispatch} previewResult={null} />
        </ThemeProvider>
      );

      expect(getByTestId('schedule-mode-exact_time')).toBeTruthy();
      expect(getByTestId('schedule-mode-prayer_relative')).toBeTruthy();
      expect(getByTestId('schedule-mode-prayer_window')).toBeTruthy();
      expect(getByTestId('schedule-mode-anytime_today')).toBeTruthy();

      // Click on Relative to Prayer
      await fireEvent.press(getByTestId('schedule-mode-prayer_relative'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SCHEDULE_MODE',
        payload: 'PRAYER_RELATIVE',
      });
    });

    it('displays only 5 prayer anchors (FAJR, DHUHR, ASR, MAGHRIB, ISHA) and NO Sunrise option', async () => {
      let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      state = formReducer(state, { type: 'SET_SCHEDULE_MODE', payload: 'PRAYER_RELATIVE' });
      const dispatch = jest.fn();

      const { getByTestId, queryByTestId } = await render(
        <ThemeProvider>
          <ScheduleModeCards state={state} dispatch={dispatch} previewResult={null} />
        </ThemeProvider>
      );

      expect(getByTestId('relative-prayer-fajr')).toBeTruthy();
      expect(getByTestId('relative-prayer-dhuhr')).toBeTruthy();
      expect(getByTestId('relative-prayer-asr')).toBeTruthy();
      expect(getByTestId('relative-prayer-maghrib')).toBeTruthy();
      expect(getByTestId('relative-prayer-isha')).toBeTruthy();
      expect(queryByTestId('relative-prayer-sunrise')).toBeNull();
    });

    it('renders live schedule preview when available', async () => {
      const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      const preview = {
        status: 'READY' as const,
        primaryLabel: '6:00 PM · Asr',
        secondaryLabel: 'Exact wall-clock time',
      };

      const { getByTestId, getByText } = await render(
        <ThemeProvider>
          <ScheduleModeCards state={state} dispatch={jest.fn()} previewResult={preview} />
        </ThemeProvider>
      );

      expect(getByTestId('schedule-preview-banner')).toBeTruthy();
      expect(getByText('6:00 PM · Asr')).toBeTruthy();
    });
  });

  describe('RecurrenceSection & CustomRecurrenceModal', () => {
    it('renders presets and handles specific days selection', async () => {
      let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'SPECIFIC_DAYS' });
      const dispatch = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <RecurrenceSection state={state} dispatch={dispatch} />
        </ThemeProvider>
      );

      expect(getByTestId('specific-days-controls')).toBeTruthy();
      // Weekday 1 (Monday)
      await fireEvent.press(getByTestId('weekday-toggle-1'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SPECIFIC_DAYS',
        payload: expect.arrayContaining([1]),
      });
    });

    it('opens custom modal with Gregorian and Hijri calendar switcher', async () => {
      let state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      state = formReducer(state, { type: 'SET_RECURRENCE_PRESET', payload: 'CUSTOM' });
      const dispatch = jest.fn();

      const { getByTestId } = await render(
        <ThemeProvider>
          <RecurrenceSection state={state} dispatch={dispatch} />
        </ThemeProvider>
      );

      await fireEvent.press(getByTestId('open-custom-recurrence-modal'));
      await waitFor(() => {
        expect(getByTestId('custom-recurrence-modal')).toBeTruthy();
        expect(getByTestId('calendar-gregorian')).toBeTruthy();
        expect(getByTestId('calendar-hijri')).toBeTruthy();
      });
    });
  });

  describe('MoreOptionsSection', () => {
    it('expands more options and supports priority, reminder, notes, subtasks, and tags', async () => {
      const state = createInitialFormState({ civilSeedDate: civilToday, planningDayDate: planningDayKey });
      const dispatch = jest.fn();

      const { getByTestId, queryByText } = await render(
        <ThemeProvider>
          <MoreOptionsSection state={state} dispatch={dispatch} />
        </ThemeProvider>
      );

      // Expand section
      await fireEvent.press(getByTestId('toggle-more-options'));
      await waitFor(() => {
        expect(getByTestId('more-options-body')).toBeTruthy();
      });

      // Priority buttons (Normal vs Important)
      expect(getByTestId('priority-normal')).toBeTruthy();
      expect(getByTestId('priority-important')).toBeTruthy();
      await fireEvent.press(getByTestId('priority-important'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PRIORITY', payload: 'IMPORTANT' });

      // Reminder preset
      await fireEvent.press(getByTestId('reminder-preset-15'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_REMINDER_MINUTES', payload: 15 });

      // Duration preset
      await fireEvent.press(getByTestId('duration-30'));
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ESTIMATED_MINUTES', payload: 30 });

      // Notes
      await fireEvent.changeText(getByTestId('task-notes-input'), 'Reading Surah Al-Kahf');
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_NOTES', payload: 'Reading Surah Al-Kahf' });

      // Subtasks
      await fireEvent.changeText(getByTestId('new-subtask-input'), 'Buy fresh flowers');
      await fireEvent.press(getByTestId('add-subtask-button'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'ADD_SUBTASK',
        payload: { title: 'Buy fresh flowers' },
      });

      // Tags
      await fireEvent.changeText(getByTestId('new-tag-input'), 'family');
      await fireEvent.press(getByTestId('add-tag-button'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_TAGS',
        payload: ['family'],
      });

      // Explicit check: NO Attachment and NO Delete UI
      expect(queryByText(/attachment/i)).toBeNull();
      expect(queryByText(/delete task/i)).toBeNull();
    });
  });

  describe('EditScopeSheet', () => {
    it('presents 3 scope options with current repeating schedule helper and no internal jargon', async () => {
      const onSelect = jest.fn();
      const onCancel = jest.fn();

      const { getByTestId, getByText, queryByText } = await render(
        <ThemeProvider>
          <EditScopeSheet visible={true} onSelectScope={onSelect} onCancel={onCancel} />
        </ThemeProvider>
      );

      expect(getByTestId('scope-option-this_occurrence')).toBeTruthy();
      expect(getByTestId('scope-option-this_and_future')).toBeTruthy();
      expect(getByTestId('scope-option-all_occurrences')).toBeTruthy();
      expect(getByText('Applies to the current repeating schedule')).toBeTruthy();

      // Ensure no internal jargon visible
      expect(queryByText(/predecessor/i)).toBeNull();
      expect(queryByText(/successor/i)).toBeNull();
      expect(queryByText(/seriesVersion/i)).toBeNull();

      await fireEvent.press(getByTestId('scope-option-this_and_future'));
      expect(onSelect).toHaveBeenCalledWith('THIS_AND_FUTURE');
    });
  });

  describe('Success & Partial Success States', () => {
    it('renders SuccessScreen with Islamic copy, summary card, and Done action (no gamification)', async () => {
      const onDone = jest.fn();

      const { getByTestId, getByText, queryByText } = await render(
        <ThemeProvider>
          <SuccessScreen
            title="Read Quran"
            scheduleSummary="10:00 AM · Dhuhr"
            repeatSummary="DAILY"
            onDone={onDone}
          />
        </ThemeProvider>
      );
      expect(getByTestId('create-success-screen')).toBeTruthy();
      expect(getByText('Task Added!')).toBeTruthy();
      expect(getByText('May Allah make it easy for you.')).toBeTruthy();
      expect(getByText('Read Quran')).toBeTruthy();
      expect(getByText('10:00 AM · Dhuhr')).toBeTruthy();
      expect(getByText('DAILY')).toBeTruthy();

      // No gamification
      expect(queryByText(/xp/i)).toBeNull();
      expect(queryByText(/streak/i)).toBeNull();

      await fireEvent.press(getByTestId('success-done-button'));
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('renders PartialSuccessView with accurate copy and Retry Sync button', async () => {
      const onRetry = jest.fn();
      const onDone = jest.fn();

      const { getByTestId, getByText } = await render(
        <ThemeProvider>
          <PartialSuccessView
            issues={[{ stage: 'DELETE', message: 'Delete error' }]}
            onRetrySync={onRetry}
            onDone={onDone}
          />
        </ThemeProvider>
      );

      expect(getByTestId('partial-success-screen')).toBeTruthy();
      expect(getByText('Task Saved')).toBeTruthy();
      expect(getByText('Task saved. Schedule will update on next refresh.')).toBeTruthy();

      await fireEvent.press(getByTestId('retry-sync-button'));
      expect(onRetry).toHaveBeenCalledTimes(1);

      await fireEvent.press(getByTestId('partial-success-done-button'));
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('renders Setup Required copy when issue stage is CONTEXT', async () => {
      const { getByText } = await render(
        <ThemeProvider>
          <PartialSuccessView
            issues={[{ stage: 'CONTEXT', message: 'Location unavailable' }]}
            onRetrySync={jest.fn()}
            onDone={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(
        getByText('Task saved. Its schedule will appear once you configure your location in Settings.')
      ).toBeTruthy();
    });
  });

  describe('TaskFormScreen Integration & Defaults', () => {
    it('applies prayer-tab launch defaults for Fajr (Prayer Window Fajr->Dhuhr)', async () => {
      const { getByTestId } = await render(
        <ThemeProvider>
          <TaskFormScreen
            initialCivilSeedDate={civilToday}
            initialPlanningDayDate={planningDayKey}
            initialPrayerTab="FAJR"
            inputProvider={mockProvider}
            onSuccess={jest.fn()}
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(getByTestId('prayer-window-fields')).toBeTruthy();
    });

    it('applies prayer-tab launch defaults for Isha (Relative to Isha, After 0m)', async () => {
      const { getByTestId } = await render(
        <ThemeProvider>
          <TaskFormScreen
            initialCivilSeedDate={civilToday}
            initialPlanningDayDate={planningDayKey}
            initialPrayerTab="ISHA"
            inputProvider={mockProvider}
            onSuccess={jest.fn()}
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(getByTestId('prayer-relative-fields')).toBeTruthy();
    });

    it('shows validation error when title is empty upon Save', async () => {
      const { getByTestId } = await render(
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

      await fireEvent.press(getByTestId('task-form-save-button'));
      await waitFor(() => {
        expect(getByTestId('title-validation-error')).toBeTruthy();
      });
    });

    it('shows alert when discarding unsaved changes on back press', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = await render(
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

      // Enter title to make form dirty
      await fireEvent.changeText(getByTestId('task-title-input'), 'Dirty Task');

      // Press back button
      await fireEvent.press(getByTestId('task-form-back-button'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        expect.any(Array)
      );

      alertSpy.mockRestore();
    });
  });
});
