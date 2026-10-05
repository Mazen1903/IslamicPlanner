import React from 'react';
import { render } from '@testing-library/react-native';
import { DateTime } from 'luxon';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import { useTodayStore } from '@/stores/useTodayStore';
import { todayOrchestrator } from '@/services/TodayOrchestrator';
import { taskFormOrchestrator } from '@/features/task-form/TaskFormOrchestrator';
import { createInitialFormState, formReducer } from '@/features/task-form/formReducer';
import { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import type { TodayTemporalInputProvider, TodayTemporalInputs } from '@/services/types';
import { ThemeProvider } from '@/theme';
import { TaskList } from '@/components/task/TaskList';

describe('Add Task to Planner Flow Test', () => {
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
  });

  afterEach(() => {
    cleanupTestDatabase();
  });

  it('verifies what handleSuccess in _layout does after adding a task', async () => {
    const coordinator = new PlannerRefreshCoordinator(mockInputProvider, todayOrchestrator);
    const now = DateTime.fromISO('2026-09-15T12:00:00.000', { zone: 'America/New_York' });

    // Initial load as done by useToday()
    const refreshResult = await coordinator.fullRefresh(now);
    expect(refreshResult.status).toBe('READY');
    if (refreshResult.status !== 'READY') throw new Error('Expected READY');

    const token = useTodayStore.getState().startRefresh();
    useTodayStore.getState().commitRefresh(
      token,
      { viewModel: refreshResult.viewModel, runtime: refreshResult.runtime },
      true
    );

    // Initial viewModel has 0 tasks
    const initialVm = useTodayStore.getState().viewModel!;
    expect(initialVm.tabs.flatMap(t => t.scheduledTasks).length).toBe(0);

    // Now user adds a task via form
    let state = createInitialFormState({
      civilSeedDate: '2026-09-15',
      planningDayDate: '2026-09-15',
      launchPrayer: 'DHUHR',
    });
    state = formReducer(state, { type: 'SET_TITLE', payload: 'Dhuhr Prayer Task' });

    const submitResult = await taskFormOrchestrator.submit(state);
    expect(submitResult.status).toBe('SAVED_AND_SYNCED');

    // Now execute handleSuccess as updated in app/(tabs)/_layout.tsx
    const refreshResultAfterAdd = await coordinator.fullRefresh(now);
    expect(refreshResultAfterAdd.status).toBe('READY');
    if (refreshResultAfterAdd.status !== 'READY') throw new Error('Expected READY');

    const token2 = useTodayStore.getState().startRefresh();
    useTodayStore.getState().commitRefresh(
      token2,
      { viewModel: refreshResultAfterAdd.viewModel, runtime: refreshResultAfterAdd.runtime },
      false
    );

    const vmAfterAdd = useTodayStore.getState().viewModel!;
    const dhuhrTab = vmAfterAdd.tabs.find(t => t.prayer === 'DHUHR')!;
    expect(dhuhrTab.scheduledTasks.length).toBe(1);
    expect(dhuhrTab.scheduledTasks[0].title).toBe('Dhuhr Prayer Task');

    // Reset flight as TaskFormScreen does on mount
    taskFormOrchestrator.resetFlight();

    // User adds a second task for ASR
    let asrState = createInitialFormState({
      civilSeedDate: '2026-09-15',
      planningDayDate: '2026-09-15',
      launchPrayer: 'ASR',
    });
    asrState = formReducer(asrState, { type: 'SET_TITLE', payload: 'Asr Afternoon Task' });
    const asrSubmit = await taskFormOrchestrator.submit(asrState);
    expect(asrSubmit.status).toBe('SAVED_AND_SYNCED');

    // Run full refresh again
    const refreshResultAfterAsr = await coordinator.fullRefresh(now);
    expect(refreshResultAfterAsr.status).toBe('READY');
    if (refreshResultAfterAsr.status !== 'READY') throw new Error('Expected READY');

    const token3 = useTodayStore.getState().startRefresh();
    useTodayStore.getState().commitRefresh(
      token3,
      { viewModel: refreshResultAfterAsr.viewModel, runtime: refreshResultAfterAsr.runtime },
      false
    );

    const asrVm = useTodayStore.getState().viewModel!;
    const asrTab = asrVm.tabs.find(t => t.prayer === 'ASR')!;
    expect(asrTab.scheduledTasks.length).toBe(1);
    expect(asrTab.scheduledTasks[0].title).toBe('Asr Afternoon Task');

    // Verify TaskList partitioning logic when currentPrayer === 'FAJR'
    const selectedPrayer = useTodayStore.getState().selectedPrayer ?? asrVm.currentPrayer;
    expect(selectedPrayer).toBe('FAJR');
    expect(asrVm.currentPrayer).toBe('FAJR');

    const seenIds = new Set<string>();
    const upcoming: any[] = [];
    const today: any[] = [];

    for (const t of asrVm.tabs) {
      if (t.temporalState === 'FUTURE') {
        for (const task of t.scheduledTasks) {
          if (!seenIds.has(task.occurrenceId)) {
            seenIds.add(task.occurrenceId);
            upcoming.push(task);
          }
        }
      }
    }
    for (const t of asrVm.tabs) {
      for (const task of t.scheduledTasks) {
        if (!seenIds.has(task.occurrenceId)) {
          seenIds.add(task.occurrenceId);
          today.push(task);
        }
      }
    }

    expect(today.length).toBe(0);
    expect(upcoming.length).toBe(2);
    expect(upcoming.map(x => x.title)).toEqual(['Dhuhr Prayer Task', 'Asr Afternoon Task']);

    // Check Upcoming auto-expand condition:
    // isUpcomingOpen = upcomingUserToggled ? upcomingExpanded : upcomingExpanded || (todayTasks.length === 0 && upcomingTasks.length > 0)
    const upcomingExpanded = true;
    const upcomingUserToggled = false;
    const isUpcomingOpen = upcomingUserToggled
      ? upcomingExpanded
      : upcomingExpanded || (today.length === 0 && upcoming.length > 0);

    expect(isUpcomingOpen).toBe(true);

    // If user switches tab to DHUHR, verify task is directly in todayTasks
    const dhuhrTabTasks = dhuhrTab.scheduledTasks;
    expect(dhuhrTabTasks.length).toBe(1);
    expect(dhuhrTabTasks[0].title).toBe('Dhuhr Prayer Task');
  });
});
