import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskFormScreen } from '../TaskFormScreen';
import { RelativePrayerSubView } from '../RelativePrayerSubView';
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
    it('surfaces reminder presets directly via ReminderSheet modal', async () => {
      const { getByTestId, findByTestId } = await render(
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

      // Open reminder sheet from task-details-card
      await fireEvent.press(getByTestId('details-row-reminder'));

      // Reminder sheet should be displayed
      expect(await findByTestId('reminder-sheet')).toBeTruthy();
      expect(getByTestId('preset-btn-0')).toBeTruthy();
      expect(getByTestId('preset-btn--5')).toBeTruthy();
      expect(getByTestId('preset-btn--10')).toBeTruthy();
      expect(getByTestId('preset-btn--15')).toBeTruthy();
      expect(getByTestId('preset-btn--30')).toBeTruthy();
      expect(getByTestId('preset-btn--60')).toBeTruthy();

      // Tap 15m preset
      await fireEvent.press(getByTestId('preset-btn--15'));
      expect(getByTestId('reminder-chip--15')).toBeTruthy();
    });

    it('displays anytime alert time input in ReminderSheet when scheduleMode is ANYTIME_TODAY', async () => {
      const { getByTestId, findByTestId } = await render(
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

      // Open reminder sheet
      await fireEvent.press(getByTestId('details-row-reminder'));

      expect(await findByTestId('reminder-sheet')).toBeTruthy();
      expect(getByTestId('anytime-reminder-time-input')).toBeTruthy();
    });
  });

  describe('Subtasks displayed on MAIN view inside merged Task card', () => {
    it('displays Add subtask button when empty, and expands SubtasksSection upon tapping', async () => {
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

      // Initially shows Add subtask row button inside merged Task card
      expect(getByTestId('expand-add-subtask-button')).toBeTruthy();
      expect(queryByTestId('subtasks-section')).toBeNull();

      // Tap expand button
      await fireEvent.press(getByTestId('expand-add-subtask-button'));

      // Now subtasks section and input are visible inside the merged card
      expect(getByTestId('subtasks-section')).toBeTruthy();
      expect(getByTestId('new-subtask-input')).toBeTruthy();
    });

    it('displays subtask count badge in heading row when subtasks are added', async () => {
      const { getByTestId, queryByTestId, findByText } = await render(
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

      expect(queryByTestId('task-subtasks-count-badge')).toBeNull();

      // Expand subtask section
      await fireEvent.press(getByTestId('expand-add-subtask-button'));

      await fireEvent.changeText(getByTestId('new-subtask-input'), 'First step');
      await fireEvent.press(getByTestId('add-subtask-button'));

      expect(await findByText('1 subtask')).toBeTruthy();
      expect(getByTestId('task-subtasks-count-badge')).toBeTruthy();

      await fireEvent.changeText(getByTestId('new-subtask-input'), 'Second step');
      await fireEvent.press(getByTestId('add-subtask-button'));

      expect(await findByText('2 subtasks')).toBeTruthy();
    });

    it('auto-expands subtasks section when initial definition has subtasks', async () => {
      const initialDef: any = {
        id: 'task-1',
        title: 'Existing Task',
        icon: 'book',
        priority: 'MEDIUM',
        subtasks: [{ id: 'st-1', title: 'Existing subtask', isCompleted: false }],
        createdAt: '2026-09-24T00:00:00Z',
        updatedAt: '2026-09-24T00:00:00Z',
      };

      const { getByTestId, getByText } = await render(
        <ThemeProvider>
          <TaskFormScreen
            initialCivilSeedDate={civilToday}
            initialPlanningDayDate={planningDayKey}
            initialDefinition={initialDef}
            inputProvider={mockProvider}
            onSuccess={jest.fn()}
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(getByTestId('subtasks-section')).toBeTruthy();
      expect(getByText('Existing subtask')).toBeTruthy();
      expect(getByTestId('task-subtasks-count-badge')).toBeTruthy();
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

  describe('Details Card on MAIN view', () => {
    it('renders task-details-card and eliminates separate repeat and more-options subviews', async () => {
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

      expect(getByTestId('task-details-card')).toBeTruthy();
      expect(queryByTestId('repeat-entry-card')).toBeNull();
      expect(queryByTestId('more-options-entry-card')).toBeNull();
    });
  });
});
