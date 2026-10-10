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

  it('renders task details with name, subtasks, notes, and no standalone edit buttons', async () => {
    const { getByText, queryByText, getByTestId } = await render(
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
    expect(getByText('Checklist')).toBeTruthy();
    expect(getByText('First 10 ayat')).toBeTruthy();
    expect(getByText('Last 10 ayat')).toBeTruthy();
    expect(getByText('Notes')).toBeTruthy();
    expect(getByText('Read with tafsir')).toBeTruthy();
    expect(getByTestId('task-detail-delete-button')).toBeTruthy();
    expect(getByTestId('task-detail-edit-button')).toBeTruthy();

    // Verify three-dots button is removed
    expect(queryByText('Task Options')).toBeNull();
    // Verify Schedule & Information is completely removed
    expect(queryByText('Schedule & Information')).toBeNull();
  });

  it('hides notes, subtasks, and priority when they were not added to the task', async () => {
    const minimalDefinition: TaskDefinition = {
      ...mockDefinition,
      priority: 'NORMAL',
      notes: null,
      subtasks: [],
      estimatedMinutes: null,
    };

    const { queryByText, getByText } = await render(
      <ThemeProvider>
        <TaskDetailScreen
          definition={minimalDefinition}
          occurrence={{ ...mockOccurrence, overrideData: {} }}
          onEditFull={jest.fn()}
          onDelete={jest.fn()}
          onBack={jest.fn()}
        />
      </ThemeProvider>
    );

    // Essential header is present
    expect(getByText('Recite Surah Al-Kahf')).toBeTruthy();

    // Unadded metadata must NOT be rendered
    expect(queryByText('Notes')).toBeNull();
    expect(queryByText('Checklist')).toBeNull();
    expect(queryByText('Important')).toBeNull();
    expect(queryByText('20m')).toBeNull();
    expect(queryByText('Schedule & Information')).toBeNull();
  });

  it('toggles subtask completion on press', async () => {
    const onToggle = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await render(
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

    await fireEvent.press(getByTestId('detail-checkbox-st-2'));
    expect(onToggle).toHaveBeenCalledWith('occ-1', 'st-2');
  });

  it('allows inline editing of checklist items', async () => {
    const onUpdateSubtask = jest.fn().mockResolvedValue(undefined);

    const { getByLabelText } = await render(
      <ThemeProvider>
        <TaskDetailScreen
          definition={mockDefinition}
          occurrence={mockOccurrence}
          onEditFull={jest.fn()}
          onDelete={jest.fn()}
          onBack={jest.fn()}
          onUpdateSubtask={onUpdateSubtask}
        />
      </ThemeProvider>
    );

    // Edit item
    await fireEvent.press(getByLabelText('Edit: First 10 ayat'));
    await fireEvent.press(getByLabelText('Save edit'));
    expect(onUpdateSubtask).toHaveBeenCalledWith('st-1', 'First 10 ayat');
  });

  it('triggers edit full task from bottom green action button', async () => {
    const onEditFull = jest.fn();
    const { getByTestId } = await render(
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

    await fireEvent.press(getByTestId('task-detail-edit-button'));
    expect(onEditFull).toHaveBeenCalledTimes(1);
  });

  it('renders Anytime Today schedule mode and Daily recurrence badge in the Hero card', async () => {
    const anytimeDailyDefinition: TaskDefinition = {
      ...mockDefinition,
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
      recurrenceRule: 'RRULE:FREQ=DAILY',
    };

    const { getByText, queryByText } = await render(
      <ThemeProvider>
        <TaskDetailScreen
          definition={anytimeDailyDefinition}
          occurrence={mockOccurrence}
          onEditFull={jest.fn()}
          onDelete={jest.fn()}
          onBack={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(getByText('Anytime Today')).toBeTruthy();
    expect(getByText('Daily')).toBeTruthy();
    expect(queryByText('Schedule & Information')).toBeNull();
  });
});
