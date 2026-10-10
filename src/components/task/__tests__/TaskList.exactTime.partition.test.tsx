import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskList } from '../TaskList';
import type { PrayerTabViewModel, TaskCardViewModel } from '@/services/types';
import { usePlannerUiStore } from '@/stores/usePlannerUiStore';

function makeTask(id: string, over: Partial<TaskCardViewModel> = {}): TaskCardViewModel {
  return {
    occurrenceId: id,
    taskDefinitionId: `def-${id}`,
    title: `Task ${id}`,
    scheduleType: 'EXACT_TIME',
    scheduleLabel: '11:00 AM',
    priority: 'NORMAL',
    status: 'PENDING',
    estimatedMinutes: 15,
    sortInstant: '2026-09-15T11:00:00.000Z',
    createdAt: '2026-09-15T08:00:00.000Z',
    completedAt: null,
    missedAt: null,
    dueAt: null,
    expiresAt: null,
    ...over,
  };
}

function makeTab(prayer: PrayerTabViewModel['prayer'], over: Partial<PrayerTabViewModel> = {}): PrayerTabViewModel {
  return {
    prayer,
    name: prayer,
    startTime: '12:00 PM',
    startDateTime: '2026-09-15T12:00:00.000Z',
    temporalState: 'CURRENT',
    scheduledTasks: [],
    missedTasks: [],
    completedTasks: [],
    anytimeTasks: [],
    ...over,
  };
}

describe('TaskList exact time 11:00 AM task partitioning', () => {
  beforeEach(() => {
    usePlannerUiStore.getState().resetToDefaults();
  });

  it('an 11am task on its tab appears under Today and does NOT duplicate in Upcoming', async () => {
    const task11am = makeTask('task-11am');
    const fajrTab = makeTab('FAJR', { scheduledTasks: [task11am] });
    const dhuhrTab = makeTab('DHUHR');
    const asrTab = makeTab('ASR');

    await render(
      <ThemeProvider>
        <TaskList
          tab={fajrTab}
          allTabs={[fajrTab, dhuhrTab, asrTab]}
          selectedPrayer="FAJR"
          currentPrayer="FAJR"
          nextPrayer="DHUHR"
          onCompleteTask={jest.fn()}
          onUndoTask={jest.fn()}
        />
      </ThemeProvider>
    );

    // It should appear once in Today
    expect(screen.getByText('Today (1)')).toBeTruthy();
    expect(screen.getByText('Task task-11am')).toBeTruthy();

    // It must NOT appear in Upcoming
    const upcomingHeader = screen.queryByText(/^Upcoming \(/);
    if (upcomingHeader) {
      expect(screen.queryByText('Upcoming (0)')).toBeTruthy();
    }
  });
});
