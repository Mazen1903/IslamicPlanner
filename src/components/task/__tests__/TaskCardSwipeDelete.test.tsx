import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskCard } from '../TaskCard';
import type { TaskCardViewModel } from '@/services/types';
import { useRouter } from 'expo-router';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

describe('TaskCard Inline Fluid Expansion', () => {
  const pushMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: pushMock,
    });
  });

  const mockTask: TaskCardViewModel = {
    occurrenceId: 'occ-expand-1',
    taskDefinitionId: 'def-expand-1',
    title: 'Recite Morning Adhkar',
    scheduleLabel: 'Fajr · +10m',
    scheduleType: 'PRAYER_RELATIVE',
    date: 'Oct 1',
    icon: 'quran',
    priority: 'NORMAL',
    status: 'PENDING',
    streakCount: null,
    subtasks: [
      { id: 'sub-1', title: 'Ayat al-Kursi', isCompleted: false },
      { id: 'sub-2', title: 'Surah Al-Ikhlas', isCompleted: true },
    ],
    notes: 'Remember to recite with full presence of heart.',
    estimatedMinutes: 15,
    sortInstant: '2026-10-01T05:30:00.000Z',
    createdAt: '2026-10-01T05:00:00.000Z',
    completedAt: null,
    missedAt: null,
    dueAt: null,
    expiresAt: null,
  };

  const recurringTask: TaskCardViewModel = {
    ...mockTask,
    occurrenceId: 'occ-recurring-1',
    isRecurring: true,
    recurrenceRule: 'FREQ=DAILY',
  };

  it('renders card ready for inline expansion without chevron arrow', async () => {
    const { getByTestId, queryByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={mockTask} />
      </ThemeProvider>
    );

    expect(getByTestId('task-card-occ-expand-1')).toBeTruthy();
    expect(queryByTestId('task-card-chevron-occ-expand-1')).toBeNull();
  });

  it('taps card to expand inline and reveal Edit Task and Delete buttons, notes, and subtasks', async () => {
    const onToggleSubtask = jest.fn();
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <TaskCard task={mockTask} onToggleSubtask={onToggleSubtask} />
      </ThemeProvider>
    );

    // Tap to expand
    await fireEvent.press(getByTestId('task-card-occ-expand-1'));

    // Check notes
    expect(getByTestId('task-card-notes-occ-expand-1')).toBeTruthy();
    expect(getByText('Remember to recite with full presence of heart.')).toBeTruthy();

    // Check subtasks checklist
    expect(getByTestId('task-card-subtasks-occ-expand-1')).toBeTruthy();
    expect(getByText('Ayat al-Kursi')).toBeTruthy();
    expect(getByText('Surah Al-Ikhlas')).toBeTruthy();

    // Toggle subtask
    await fireEvent.press(getByTestId('subtask-item-occ-expand-1-sub-1'));
    expect(onToggleSubtask).toHaveBeenCalledWith('occ-expand-1', 'sub-1');

    // Check action buttons
    expect(getByTestId('task-card-edit-btn-occ-expand-1')).toBeTruthy();
    expect(getByTestId('task-card-delete-btn-occ-expand-1')).toBeTruthy();
  });

  it('pressing Edit Task navigates to full task details screen', async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={mockTask} />
      </ThemeProvider>
    );

    // Expand
    await fireEvent.press(getByTestId('task-card-occ-expand-1'));

    // Press Edit
    await fireEvent.press(getByTestId('task-card-edit-btn-occ-expand-1'));
    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/task/[id]',
      params: { id: 'occ-expand-1', defId: 'def-expand-1', mode: 'full' },
    });
  });

  it('pressing Delete on a one-off task directly calls onDelete with THIS_OCCURRENCE', async () => {
    const onDelete = jest.fn();
    const { getByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={mockTask} onDelete={onDelete} />
      </ThemeProvider>
    );

    // Expand
    await fireEvent.press(getByTestId('task-card-occ-expand-1'));

    // Press Delete
    await fireEvent.press(getByTestId('task-card-delete-btn-occ-expand-1'));
    expect(onDelete).toHaveBeenCalledWith(mockTask, 'THIS_OCCURRENCE');
  });

  it('pressing Delete on a recurring task reveals inline scope options', async () => {
    const onDelete = jest.fn();
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <TaskCard task={recurringTask} onDelete={onDelete} />
      </ThemeProvider>
    );

    // Expand card
    await fireEvent.press(getByTestId('task-card-occ-recurring-1'));

    // Press Delete
    await fireEvent.press(getByTestId('task-card-delete-btn-occ-recurring-1'));

    // Inline recurring options should appear
    expect(getByTestId('task-card-recurring-delete-options-occ-recurring-1')).toBeTruthy();
    expect(getByText('Delete Recurring Task')).toBeTruthy();
    expect(getByTestId('delete-scope-this-occurrence-occ-recurring-1')).toBeTruthy();
    expect(getByTestId('delete-scope-this-and-future-occ-recurring-1')).toBeTruthy();
    expect(getByTestId('delete-scope-all-occurrences-occ-recurring-1')).toBeTruthy();
    expect(getByTestId('delete-scope-cancel-occ-recurring-1')).toBeTruthy();

    // Selecting scope triggers onDelete with chosen scope
    await fireEvent.press(getByTestId('delete-scope-all-occurrences-occ-recurring-1'));
    expect(onDelete).toHaveBeenCalledWith(recurringTask, 'ALL_OCCURRENCES');
  });

  it('canceling recurring delete returns to standard Edit and Delete action buttons', async () => {
    const { getByTestId, queryByTestId } = await render(
      <ThemeProvider>
        <TaskCard task={recurringTask} />
      </ThemeProvider>
    );

    // Expand card and click Delete
    await fireEvent.press(getByTestId('task-card-occ-recurring-1'));
    await fireEvent.press(getByTestId('task-card-delete-btn-occ-recurring-1'));
    expect(getByTestId('task-card-recurring-delete-options-occ-recurring-1')).toBeTruthy();

    // Cancel
    await fireEvent.press(getByTestId('delete-scope-cancel-occ-recurring-1'));
    expect(queryByTestId('task-card-recurring-delete-options-occ-recurring-1')).toBeNull();
    expect(getByTestId('task-card-edit-btn-occ-recurring-1')).toBeTruthy();
    expect(getByTestId('task-card-delete-btn-occ-recurring-1')).toBeTruthy();
  });

  it('supports controlled expansion via isExpanded and onToggleExpand', async () => {
    const onToggleExpand = jest.fn();
    const { getByTestId, rerender } = await render(
      <ThemeProvider>
        <TaskCard task={mockTask} isExpanded={false} onToggleExpand={onToggleExpand} />
      </ThemeProvider>
    );

    // Tapping calls onToggleExpand
    await fireEvent.press(getByTestId('task-card-occ-expand-1'));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);

    // Re-rendering with isExpanded={true} displays expanded content
    await rerender(
      <ThemeProvider>
        <TaskCard task={mockTask} isExpanded={true} onToggleExpand={onToggleExpand} />
      </ThemeProvider>
    );
    expect(getByTestId('task-card-edit-btn-occ-expand-1')).toBeTruthy();
  });
});
