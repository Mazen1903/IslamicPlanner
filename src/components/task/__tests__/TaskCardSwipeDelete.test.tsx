import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskCard } from '../TaskCard';
import type { TaskCardViewModel } from '@/services/types';

describe('TaskCard Swipe-to-Remove Feature', () => {
  const mockTask: TaskCardViewModel = {
    occurrenceId: 'occ-swipe-1',
    taskDefinitionId: 'def-swipe-1',
    title: 'Recite Morning Adhkar',
    scheduleLabel: 'Fajr · +10m',
    scheduleType: 'PRAYER_RELATIVE',
    date: 'Oct 1',
    icon: 'quran',
    priority: 'NORMAL',
    status: 'PENDING',
    streakCount: null,
    subtasks: [],
    estimatedMinutes: 15,
    sortInstant: '2026-10-01T05:30:00.000Z',
    createdAt: '2026-10-01T05:00:00.000Z',
    completedAt: null,
    missedAt: null,
    dueAt: null,
    expiresAt: null,
  };

  it('renders the underneath delete reveal container with popup trash icon and remove button', async () => {
    const onDelete = jest.fn();
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <TaskCard task={mockTask} onDelete={onDelete} />
      </ThemeProvider>
    );

    const deleteRevealContainer = getByTestId('task-card-delete-reveal-occ-swipe-1');
    expect(deleteRevealContainer).toBeTruthy();

    const removeBtn = getByTestId('task-card-remove-button-occ-swipe-1');
    expect(removeBtn).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
  });

  it('triggers onDelete callback when the revealed remove button is pressed', async () => {
    const onDelete = jest.fn();
    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={mockTask} onDelete={onDelete} />
      </ThemeProvider>
    );

    const removeBtn = getByTestId('task-card-remove-button-occ-swipe-1');
    await fireEvent.press(removeBtn);

    expect(onDelete).toHaveBeenCalledWith(mockTask);
  });
});
