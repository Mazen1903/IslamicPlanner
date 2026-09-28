import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskDetailScreen } from '../TaskDetailScreen';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';

describe('TaskDetailScreen', () => {
  const mockDefinition: TaskDefinition = {
    id: 'def-1',
    title: 'Recite Surah Al-Kahf',
    description: null,
    startDate: '2026-09-27',
    source: 'USER',
    worshipItemKey: null,
    scheduleType: 'PRAYER_RELATIVE',
    scheduleData: { anchorPrayer: 'DHUHR', direction: 'AFTER', offsetMinutes: 0 },
    recurrenceRule: null,
    hijriRecurrence: null,
    recurrenceEnd: null,
    seriesId: 'series-1',
    seriesVersion: 1,
    effectiveFromDate: '2026-09-27',
    effectiveToDate: null,
    reminderRule: null,
    priority: 'IMPORTANT',
    estimatedMinutes: 20,
    notes: 'Read with tafsir',
    tags: ['icon:quran'],
    subtasks: [
      { id: 'st-1', title: 'First 10 ayat' },
      { id: 'st-2', title: 'Last 10 ayat' },
    ],
    isActive: true,
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt: '2026-09-27T00:00:00.000Z',
  };

  const mockOccurrence: TaskOccurrence = {
    id: 'occ-1',
    taskDefinitionId: 'def-1',
    seriesId: 'series-1',
    localDate: '2026-09-27',
    planningDayKey: '2026-09-27',
    timezone: 'America/Chicago',
    calculatedStartTime: null,
    calculatedPrayerSection: null,
    eligiblePrayerSections: null,
    wallClockResolution: null,
    windowStart: null,
    windowEnd: null,
    status: 'PENDING',
    completedAt: null,
    missedAt: null,
    overrideData: {
      completedSubtaskIds: ['st-1'],
    },
  };

  it('renders task details with name, subtasks, notes, and attachments', async () => {
    const { getByText, getByTestId } = await render(
      <ThemeProvider>
        <TaskDetailScreen
          definition={mockDefinition}
          occurrence={mockOccurrence}
          onEditFull={jest.fn()}
          onDelete={jest.fn()}
          onBack={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(getByText('Task Details')).toBeTruthy();
    expect(getByText('Recite Surah Al-Kahf')).toBeTruthy();
    expect(getByText('Important')).toBeTruthy();
    expect(getByText('Subtasks')).toBeTruthy();
    expect(getByText('First 10 ayat')).toBeTruthy();
    expect(getByText('Last 10 ayat')).toBeTruthy();
    expect(getByText('Notes')).toBeTruthy();
    expect(getByText('Read with tafsir')).toBeTruthy();
    expect(getByText('Attachments')).toBeTruthy();
    expect(getByTestId('task-detail-more-button')).toBeTruthy();
  });

  it('toggles subtask completion on press', async () => {
    const onToggle = jest.fn().mockResolvedValue(undefined);
    const { getByLabelText } = await render(
      <ThemeProvider>
        <TaskDetailScreen
          definition={mockDefinition}
          occurrence={mockOccurrence}
          onEditFull={jest.fn()}
          onDelete={jest.fn()}
          onBack={jest.fn()}
          onToggleSubtask={onToggle}
        />
      </ThemeProvider>
    );

    await fireEvent.press(getByLabelText('Last 10 ayat'));
    expect(onToggle).toHaveBeenCalledWith('occ-1', 'st-2');
  });

  it('opens three dots options menu and triggers edit full task', async () => {
    const onEditFull = jest.fn();
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <TaskDetailScreen
          definition={mockDefinition}
          occurrence={mockOccurrence}
          onEditFull={onEditFull}
          onDelete={jest.fn()}
          onBack={jest.fn()}
        />
      </ThemeProvider>
    );

    await fireEvent.press(getByTestId('task-detail-more-button'));
    expect(getByText('Task Options')).toBeTruthy();
    expect(getByText('Edit Full Task')).toBeTruthy();
    expect(getByText('Delete Task')).toBeTruthy();

    await fireEvent.press(getByText('Edit Full Task'));
    expect(onEditFull).toHaveBeenCalledTimes(1);
  });
});
