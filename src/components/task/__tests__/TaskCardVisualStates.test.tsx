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

  it('displays calm "Overdue" text when task is < 1 minute overdue', async () => {
    // 30 seconds after dueAt
    const now = DateTime.fromISO('2026-09-15T14:00:30.000Z');
    useTodayStore.getState().setNowMs(now.toMillis());

    const { getByTestId, getByText, queryByText } = await render(
      <ThemeProvider>
        <TaskCard task={baseTask} />
      </ThemeProvider>
    );

    const badge = getByTestId('overdue-badge-occ-card-1');
    expect(badge).toBeTruthy();
    expect(getByText('Overdue')).toBeTruthy();
    // Invariant: No "0 min overdue", no exclamation mark
    expect(queryByText(/0 min overdue/i)).toBeNull();
    expect(queryByText(/!/)).toBeNull();
  });

  it('displays "5 min overdue" calmly when 5 minutes past due', async () => {
    // 5 minutes after dueAt
    const now = DateTime.fromISO('2026-09-15T14:05:00.000Z');
    useTodayStore.getState().setNowMs(now.toMillis());

    const { getByText } = await render(
      <ThemeProvider>
        <TaskCard task={baseTask} />
      </ThemeProvider>
    );

    expect(getByText('5 min overdue')).toBeTruthy();
  });

  it('updates overdue minutes from 5 to 6 min live when store nowMs changes (zero DB, zero reprojection)', async () => {
    const now5 = DateTime.fromISO('2026-09-15T14:05:00.000Z');
    useTodayStore.getState().setNowMs(now5.toMillis());

    const { getByText, queryByText } = await render(
      <ThemeProvider>
        <TaskCard task={baseTask} />
      </ThemeProvider>
    );

    expect(getByText('5 min overdue')).toBeTruthy();

    // 1 minute passes: 1-second timer updates store.nowMs
    const now6 = DateTime.fromISO('2026-09-15T14:06:00.000Z');
    await act(async () => {
      useTodayStore.getState().setNowMs(now6.toMillis());
    });

    expect(getByText('6 min overdue')).toBeTruthy();
    expect(queryByText('5 min overdue')).toBeNull();
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

  it('displays calm "Missed" badge for MISSED task, never overdue', async () => {
    const missedTask: TaskCardViewModel = {
      ...baseTask,
      status: 'MISSED',
      missedAt: '2026-09-15T17:00:00.000Z',
    };

    const { getByText, queryByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={missedTask} />
      </ThemeProvider>
    );

    expect(getByText('Missed')).toBeTruthy();
    expect(queryByTestId('overdue-badge-occ-card-1')).toBeNull();
  });

  it('displays calm "Completed" badge and strike-through for COMPLETED task, never overdue', async () => {
    const completedTask: TaskCardViewModel = {
      ...baseTask,
      status: 'COMPLETED',
      completedAt: '2026-09-15T14:10:00.000Z',
    };

    const { getByText, queryByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={completedTask} />
      </ThemeProvider>
    );

    expect(getByText('Completed')).toBeTruthy();
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
});
