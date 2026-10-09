import React from 'react';
import { render, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskCard } from '../TaskCard';
import { useTodayStore } from '@/stores/useTodayStore';
import type { TaskCardViewModel } from '@/services/types';
import { DateTime } from 'luxon';

describe('TaskCard Visual States — M11 Presentation (Overdue, Missed, Completed)', () => {
  const baseTask: TaskCardViewModel = {
    occurrenceId: 'occ-card-1',
    taskDefinitionId: 'def-card-1',
    title: 'Daily Reflection',
    scheduleType: 'EXACT_TIME',
    scheduleLabel: '2:00 PM',
    priority: 'NORMAL',
    status: 'PENDING',
    estimatedMinutes: 15,
    sortInstant: '2026-09-15T14:00:00.000Z',
    createdAt: '2026-09-15T10:00:00.000Z',
    completedAt: null,
    missedAt: null,
    dueAt: '2026-09-15T14:00:00.000Z',
    expiresAt: '2026-09-15T17:00:00.000Z',
  };

  beforeEach(() => {
    useTodayStore.getState().reset();
  });

  it('no longer renders an overdue pill; overdue tasks surface in the Previous section instead', async () => {
    useTodayStore.getState().setNowMs(DateTime.fromISO('2026-09-15T14:05:00.000Z').toMillis());

    const { queryByTestId, queryByText } = await render(
      <ThemeProvider>
        <TaskCard task={baseTask} />
      </ThemeProvider>
    );

    expect(queryByTestId('overdue-badge-occ-card-1')).toBeNull();
    expect(queryByText(/overdue/i)).toBeNull();

    // Time passing does not reintroduce the pill.
    await act(async () => {
      useTodayStore.getState().setNowMs(DateTime.fromISO('2026-09-15T14:06:00.000Z').toMillis());
    });
    expect(queryByText(/overdue/i)).toBeNull();
  });

  it('overdue badge automatically disappears when now >= expiresAt', async () => {
    // Exactly at expiresAt
    const nowExpired = DateTime.fromISO('2026-09-15T17:00:00.000Z');
    useTodayStore.getState().setNowMs(nowExpired.toMillis());

    const { queryByTestId, queryByText } = await render(
      <ThemeProvider>
        <TaskCard task={baseTask} />
      </ThemeProvider>
    );

    expect(queryByTestId('overdue-badge-occ-card-1')).toBeNull();
    expect(queryByText(/overdue/i)).toBeNull();
  });

  it('does not display "Missed" badge for MISSED task, never overdue', async () => {
    const missedTask: TaskCardViewModel = {
      ...baseTask,
      status: 'MISSED',
      missedAt: '2026-09-15T17:00:00.000Z',
    };

    const { queryByText, queryByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={missedTask} />
      </ThemeProvider>
    );

    expect(queryByText('Missed')).toBeNull();
    expect(queryByTestId('overdue-badge-occ-card-1')).toBeNull();
  });

  it('does not display "Completed" badge for COMPLETED task, never overdue', async () => {
    const completedTask: TaskCardViewModel = {
      ...baseTask,
      status: 'COMPLETED',
      completedAt: '2026-09-15T14:10:00.000Z',
    };

    const { queryByText, queryByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={completedTask} />
      </ThemeProvider>
    );

    expect(queryByText('Completed')).toBeNull();
    expect(queryByTestId('overdue-badge-occ-card-1')).toBeNull();
  });

  it('never displays overdue badge for PRAYER_WINDOW or ANYTIME_TODAY tasks', async () => {
    const windowTask: TaskCardViewModel = {
      ...baseTask,
      scheduleType: 'PRAYER_WINDOW',
      dueAt: null,
      expiresAt: null,
    };

    const anytimeTask: TaskCardViewModel = {
      ...baseTask,
      scheduleType: 'ANYTIME_TODAY',
      dueAt: null,
      expiresAt: null,
    };

    const nowLate = DateTime.fromISO('2026-09-15T23:00:00.000Z');
    useTodayStore.getState().setNowMs(nowLate.toMillis());

    const { queryByTestId, rerender } = await render(
      <ThemeProvider>
        <TaskCard task={windowTask} />
      </ThemeProvider>
    );

    expect(queryByTestId('overdue-badge-occ-card-1')).toBeNull();

    await rerender(
      <ThemeProvider>
        <TaskCard task={anytimeTask} />
      </ThemeProvider>
    );

    expect(queryByTestId('overdue-badge-occ-card-1')).toBeNull();
  });

  it('renders streak flame badge when task has streakCount >= 1', async () => {
    const taskWithStreak: TaskCardViewModel = {
      ...baseTask,
      streakCount: 5,
      streakEnabled: true,
    };

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <TaskCard task={taskWithStreak} />
      </ThemeProvider>
    );

    expect(getByTestId('streak-badge-occ-card-1')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('renders streak flame badge when task has streakCount >= 0', async () => {
    const taskZeroStreak: TaskCardViewModel = {
      ...baseTask,
      streakCount: 0,
      streakEnabled: true,
    };

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <TaskCard task={taskZeroStreak} />
      </ThemeProvider>
    );

    expect(getByTestId('streak-badge-occ-card-1')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });

  it('omits streak flame badge when streakCount is null', async () => {
    const taskNoStreak: TaskCardViewModel = {
      ...baseTask,
      streakCount: null,
      streakEnabled: false,
    };

    const { queryByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={taskNoStreak} />
      </ThemeProvider>
    );

    expect(queryByTestId('streak-badge-occ-card-1')).toBeNull();
  });

  it('displays date and time combined with middle dot when both are available', async () => {
    const taskWithDateTime: TaskCardViewModel = {
      ...baseTask,
      date: 'Oct 1',
      scheduleLabel: '2:30 PM',
      scheduleType: 'EXACT_TIME',
    };

    const { getByText } = await render(
      <ThemeProvider>
        <TaskCard task={taskWithDateTime} />
      </ThemeProvider>
    );

    expect(getByText('Oct 1 · 2:30 PM')).toBeTruthy();
  });

  it('displays date only when schedule is Anytime Today', async () => {
    const anytimeTask: TaskCardViewModel = {
      ...baseTask,
      date: 'Oct 1',
      scheduleLabel: 'Anytime Today',
      scheduleType: 'ANYTIME_TODAY',
    };

    const { getByText, queryByText } = await render(
      <ThemeProvider>
        <TaskCard task={anytimeTask} />
      </ThemeProvider>
    );

    expect(getByText('Oct 1')).toBeTruthy();
    expect(queryByText('Oct 1 · Anytime Today')).toBeNull();
  });

  it('renders green Daily recurring badge when isRecurring is true', async () => {
    const recurringTask: TaskCardViewModel = {
      ...baseTask,
      isRecurring: true,
      recurrenceRule: 'FREQ=DAILY',
      date: 'Oct 1',
      scheduleLabel: 'Fajr · +5m',
      scheduleType: 'PRAYER_RELATIVE',
    };

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <TaskCard task={recurringTask} />
      </ThemeProvider>
    );

    expect(getByTestId('task-recurring-badge-occ-card-1')).toBeTruthy();
    expect(getByText('Daily')).toBeTruthy();
    expect(getByText('Oct 1 · Fajr · +5m')).toBeTruthy();
  });
});
