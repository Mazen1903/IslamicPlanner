import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskList } from '../TaskList';
import type { PrayerTabViewModel, TaskCardViewModel } from '@/services/types';
import { usePlannerUiStore } from '@/stores/usePlannerUiStore';

function task(
  id: string,
  over: Partial<TaskCardViewModel> = {}
): TaskCardViewModel {
  return {
    occurrenceId: id,
    taskDefinitionId: `def-${id}`,
    title: `Task ${id}`,
    scheduleType: 'PRAYER_RELATIVE',
    scheduleLabel: 'label',
    priority: 'NORMAL',
    status: 'PENDING',
    estimatedMinutes: 10,
    sortInstant: null,
    createdAt: '2026-09-15T08:00:00.000Z',
    completedAt: null,
    missedAt: null,
    dueAt: null,
    expiresAt: null,
    ...over,
  };
}

function tab(
  prayer: PrayerTabViewModel['prayer'],
  over: Partial<PrayerTabViewModel> = {}
): PrayerTabViewModel {
  return {
    prayer,
    name: prayer,
    startTime: '12:00 PM',
    startDateTime: '2026-09-15T12:00:00.000Z',
    temporalState: 'FUTURE',
    scheduledTasks: [],
    missedTasks: [],
    completedTasks: [],
    anytimeTasks: [],
    ...over,
  };
}

async function renderList(
  selected: PrayerTabViewModel['prayer'],
  tabs: PrayerTabViewModel[],
  extra: Partial<React.ComponentProps<typeof TaskList>> = {}
) {
  const current = tabs.find((t) => t.prayer === selected)!;
  await render(
    <ThemeProvider>
      <TaskList
        tab={current}
        allTabs={tabs}
        selectedPrayer={selected}
        currentPrayer="DHUHR"
        nextPrayer="ASR"
        onCompleteTask={jest.fn()}
        onUndoTask={jest.fn()}
        {...extra}
      />
    </ThemeProvider>
  );
}

describe('TaskList time-based partition', () => {
  beforeEach(() => {
    usePlannerUiStore.getState().resetToDefaults();
  });

  const fajr = () => tab('FAJR', { scheduledTasks: [task('fajr-1')] });
  const dhuhr = () => tab('DHUHR', { scheduledTasks: [task('dhuhr-1')] });
  const asr = () => tab('ASR', { scheduledTasks: [task('asr-1')] });

  it('current tab: its tasks are Today, later prayers Upcoming, earlier prayers Previous', async () => {
    await renderList('DHUHR', [fajr(), dhuhr(), asr()]);

    expect(screen.getByText('Previous (1)')).toBeTruthy();
    expect(screen.getByText('Today (1)')).toBeTruthy();
    expect(screen.getByText('Upcoming (1)')).toBeTruthy();
    expect(screen.getByText('Task dhuhr-1')).toBeTruthy();
  });

  it('selecting a future tab moves the partition with it', async () => {
    await renderList('ASR', [fajr(), dhuhr(), asr()]);

    expect(screen.getByText('Previous (2)')).toBeTruthy();
    expect(screen.getByText('Today (1)')).toBeTruthy();
    expect(screen.getByText('Upcoming (0)')).toBeTruthy();
    expect(screen.getByText('Task asr-1')).toBeTruthy();
  });

  it('selecting a past tab keeps later prayers in Upcoming', async () => {
    await renderList('FAJR', [fajr(), dhuhr(), asr()]);

    expect(screen.queryByText(/^Previous \(/)).toBeNull();
    expect(screen.getByText('Today (1)')).toBeTruthy();
    expect(screen.getByText('Upcoming (2)')).toBeTruthy();
  });

  it('Anytime tasks always count as Today', async () => {
    const t = tab('DHUHR', {
      anytimeTasks: [task('any-1', { scheduleType: 'ANYTIME_TODAY' })],
    });
    await renderList('DHUHR', [t]);

    expect(screen.getByText('Today (1)')).toBeTruthy();
    expect(screen.getByText('Task any-1')).toBeTruthy();
  });

  it('missed tasks always land in Previous', async () => {
    const t = tab('DHUHR', {
      missedTasks: [task('missed-1', { status: 'MISSED', missedAt: '2026-09-15T07:00:00.000Z' })],
    });
    await renderList('DHUHR', [t]);

    expect(screen.getByText('Previous (1)')).toBeTruthy();
  });

  it('completed tasks land in Completed Today', async () => {
    const t = tab('DHUHR', {
      completedTasks: [task('done-1', { status: 'COMPLETED', completedAt: '2026-09-15T13:10:00.000Z' })],
    });
    await renderList('DHUHR', [t]);

    expect(screen.getByText('Completed Today (1)')).toBeTruthy();
  });

  it('premium users can hide a section; free users fail closed and see every section', async () => {
    const tabs = [fajr(), dhuhr(), asr()];

    await renderList('DHUHR', tabs, { isPremium: true, plannerHiddenSections: ['UPCOMING'] });
    expect(screen.queryByText(/^Upcoming \(/)).toBeNull();
    expect(screen.getByText('Today (1)')).toBeTruthy();
  });

  it('premium lapse: hidden sections are ignored for free users', async () => {
    await renderList('DHUHR', [fajr(), dhuhr(), asr()], {
      isPremium: false,
      plannerHiddenSections: ['UPCOMING', 'TODAY'],
    });

    expect(screen.getByText('Upcoming (1)')).toBeTruthy();
    expect(screen.getByText('Today (1)')).toBeTruthy();
  });
});
