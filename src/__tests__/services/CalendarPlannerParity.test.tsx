import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DateTime, Settings } from 'luxon';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { useTodayStore } from '@/stores/useTodayStore';
import { todayOrchestrator } from '@/services/TodayOrchestrator';
import { taskFormOrchestrator } from '@/features/task-form/TaskFormOrchestrator';
import { createInitialFormState, formReducer } from '@/features/task-form/formReducer';
import { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { CalendarMonthOrchestrator, type UpcomingTaskItem } from '@/services/CalendarMonthOrchestrator';
import type {
  TodayTemporalInputProvider,
  TodayTemporalInputs,
  TaskCardViewModel,
  PrayerTabViewModel,
} from '@/services/types';
import { ThemeProvider } from '@/theme';
import { TaskList } from '@/components/task/TaskList';

describe('Calendar and Planner Task Parity Tests', () => {
  const coords = { latitude: 40.7128, longitude: -74.006 };
  const params = {
    method: 'ISNA' as const,
    asrMethod: 'SHAFI' as const,
    highLatitudeRule: 'AUTO' as const,
    polarCircleResolution: 'AQRAB_YAUM' as const,
    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    timezone: 'America/New_York',
  };

  const inputs: TodayTemporalInputs = {
    coordinates: coords,
    params,
    planningDayConfig: { mode: 'FAJR' },
  };

  const mockInputProvider: TodayTemporalInputProvider = {
    getInputs: jest.fn().mockResolvedValue({
      status: 'READY',
      inputs,
    }),
  };

  beforeEach(() => {
    Settings.now = () => new Date('2026-09-15T12:00:00Z').getTime();
    createTestDatabase();
    const { getDatabase } = require('@/data/db');
    const { userSettings } = require('@/data/schema');
    getDatabase().insert(userSettings).values({
      id: 'settings-1',
      locationMode: 'MANUAL',
      manualLatitude: coords.latitude,
      manualLongitude: coords.longitude,
      manualTimezone: params.timezone,
      calculationMethod: 'ISNA',
      asrMethod: 'SHAFI',
      planningDayStart: 'FAJR',
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T00:00:00.000Z',
    }).run();
    useTodayStore.getState().reset();
    taskFormOrchestrator.resetFlight();
  });

  afterEach(() => {
    Settings.now = () => Date.now();
    cleanupTestDatabase();
  });

  it('verifies task created for tomorrow appears in Calendar AND in Planner upcoming section', async () => {
    const coordinator = new PlannerRefreshCoordinator(mockInputProvider, todayOrchestrator);
    const calendarOrchestrator = new CalendarMonthOrchestrator(
      undefined,
      undefined,
      undefined,
      mockInputProvider
    );
    const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });

    // 1. Initial refresh
    const initialRefresh = await coordinator.fullRefresh(now);
    expect(initialRefresh.status).toBe('READY');

    // 2. User adds a task for TOMORROW (2026-09-16)
    let state = createInitialFormState({
      civilSeedDate: '2026-09-16',
      planningDayDate: '2026-09-16',
      launchPrayer: 'DHUHR',
    });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Tomorrow Doctor Appointment' });
    const submitResult = await taskFormOrchestrator.submit(state);
    expect(submitResult.status).toBe('SAVED_AND_SYNCED');

    // 3. Verify it shows in Calendar for September 2026
    const calendarState = await calendarOrchestrator.loadMonth(2026, 9);
    expect(calendarState.status).toBe('READY');
    if (calendarState.status !== 'READY') throw new Error('Expected READY calendar state');

    // It should be in upcomingTasks of the calendar
    const calendarUpcoming = calendarState.upcomingTasks.find(
      (t: UpcomingTaskItem) => t.title === 'Tomorrow Doctor Appointment'
    );
    expect(calendarUpcoming).toBeDefined();
    expect(calendarUpcoming?.planningDayKey).toBe('2026-09-16');

    // 4. Run Planner full refresh for TODAY (2026-09-15)
    const refreshResult = await coordinator.fullRefresh(now);
    expect(refreshResult.status).toBe('READY');
    if (refreshResult.status !== 'READY') throw new Error('Expected READY status');
    const vm = refreshResult.viewModel;

    // 5. Verify the task appears in upcomingDaysTasks of TodayViewModel!
    expect(vm.upcomingDaysTasks).toBeDefined();
    const plannerUpcoming = vm.upcomingDaysTasks?.find(
      (t: TaskCardViewModel) => t.title === 'Tomorrow Doctor Appointment'
    );
    expect(plannerUpcoming).toBeDefined();
    expect(plannerUpcoming?.localDate).toBe('2026-09-16');

    // 6. Render TaskList and verify Upcoming section contains the task
    const currentTab = vm.tabs.find((t: PrayerTabViewModel) => t.prayer === vm.currentPrayer) ?? vm.tabs[0];
    await render(
      <ThemeProvider>
        <TaskList
          tab={currentTab}
          allTabs={vm.tabs}
          upcomingDaysTasks={vm.upcomingDaysTasks}
          selectedPrayer={vm.currentPrayer}
          currentPrayer={vm.currentPrayer}
          nextPrayer={vm.nextPrayer?.prayer ?? null}
          onCompleteTask={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('section-upcoming')).toBeTruthy();
    expect(screen.queryByText('Tomorrow Doctor Appointment')).toBeTruthy();
  });

  it('verifies previous section auto-expands so past prayer tasks are never hidden', async () => {
    // Current time is late night (Isha)
    Settings.now = () => new Date('2026-09-15T22:30:00-04:00').getTime();
    const now = DateTime.fromISO('2026-09-15T22:30:00.000', { zone: 'America/New_York' });
    const coordinator = new PlannerRefreshCoordinator(mockInputProvider, todayOrchestrator);

    // Create a task for FAJR (which is in the past relative to 22:30 Isha)
    let state = createInitialFormState({
      civilSeedDate: '2026-09-15',
      planningDayDate: '2026-09-15',
      launchPrayer: 'FAJR',
    });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Morning Exercise' });
    await taskFormOrchestrator.submit(state);

    const refreshResult = await coordinator.fullRefresh(now);
    expect(refreshResult.status).toBe('READY');
    if (refreshResult.status !== 'READY') throw new Error('Expected READY status');
    const vm = refreshResult.viewModel;

    const ishaTab = vm.tabs.find((t: PrayerTabViewModel) => t.prayer === 'ISHA')!;
    await render(
      <ThemeProvider>
        <TaskList
          tab={ishaTab}
          allTabs={vm.tabs}
          upcomingDaysTasks={vm.upcomingDaysTasks}
          selectedPrayer="ISHA"
          currentPrayer="ISHA"
          nextPrayer={null}
          onCompleteTask={jest.fn()}
        />
      </ThemeProvider>
    );

    // Section Previous must be visible and open with Morning Exercise
    expect(screen.getByTestId('section-previous')).toBeTruthy();
    expect(screen.getByTestId('section-content-previous')).toBeTruthy();
    expect(screen.queryByText('Morning Exercise')).toBeTruthy();
  });

  it('verifies upcoming tasks are retained when user selects a specific prayer tab', async () => {
    Settings.now = () => new Date('2026-09-15T12:00:00Z').getTime();
    const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });
    const coordinator = new PlannerRefreshCoordinator(mockInputProvider, todayOrchestrator);

    // Add future task for tomorrow
    let state = createInitialFormState({
      civilSeedDate: '2026-09-16',
      planningDayDate: '2026-09-16',
      launchPrayer: 'DHUHR',
    });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Future Project Review' });
    await taskFormOrchestrator.submit(state);

    const refreshResult = await coordinator.fullRefresh(now);
    expect(refreshResult.status).toBe('READY');
    if (refreshResult.status !== 'READY') throw new Error('Expected READY status');
    const vm = refreshResult.viewModel;

    // User is viewing DHUHR tab (not current prayer, if current is FAJR)
    const dhuhrTab = vm.tabs.find((t: PrayerTabViewModel) => t.prayer === 'DHUHR')!;
    await render(
      <ThemeProvider>
        <TaskList
          tab={dhuhrTab}
          allTabs={vm.tabs}
          upcomingDaysTasks={vm.upcomingDaysTasks}
          selectedPrayer="DHUHR"
          currentPrayer="FAJR"
          nextPrayer="DHUHR"
          onCompleteTask={jest.fn()}
        />
      </ThemeProvider>
    );

    // Even when viewing DHUHR tab, upcoming section is present and contains future task
    expect(screen.getByTestId('section-upcoming')).toBeTruthy();
    expect(screen.queryByText('Future Project Review')).toBeTruthy();
  });
});
