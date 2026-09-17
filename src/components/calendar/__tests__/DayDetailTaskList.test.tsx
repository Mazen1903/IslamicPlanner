import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { DayDetailTaskList } from '../DayDetailTaskList';
import type { SelectedDayDetailModel } from '@/services/CalendarMonthOrchestrator';
import type { TaskCardViewModel } from '@/services/types';

describe('DayDetailTaskList (M14)', () => {
  const sampleTask: TaskCardViewModel = {
    occurrenceId: 'occ-1',
    taskDefinitionId: 'def-1',
    title: 'Morning Adhkar',
    scheduleType: 'PRAYER_RELATIVE',
    scheduleLabel: '15m after Fajr',
    priority: 'NORMAL',
    status: 'PENDING',
    estimatedMinutes: 10,
    sortInstant: '2026-09-15T05:30:00.000Z',
    createdAt: '2026-09-15T00:00:00.000Z',
    completedAt: null,
    missedAt: null,
    dueAt: '2026-09-15T05:30:00.000Z',
    expiresAt: '2026-09-15T06:30:00.000Z',
  };

  const sampleAnytimeTask: TaskCardViewModel = {
    occurrenceId: 'occ-anytime',
    taskDefinitionId: 'def-anytime',
    title: 'Read Quran Juz 15',
    scheduleType: 'ANYTIME_TODAY',
    scheduleLabel: 'Anytime',
    priority: 'IMPORTANT',
    status: 'PENDING',
    estimatedMinutes: 30,
    sortInstant: '2026-09-15T23:59:59.999Z',
    createdAt: '2026-09-15T00:00:00.000Z',
    completedAt: null,
    missedAt: null,
    dueAt: null,
    expiresAt: null,
  };

  const detailModel: SelectedDayDetailModel = {
    planningDayKey: '2026-09-15',
    civilDate: '2026-09-15',
    hijriFormatted: '3 Rabi al-Awwal 1448 AH',
    prayerSections: [
      { prayer: 'FAJR', name: 'Fajr', arabicName: 'الفجر', startTime: '5:15 AM', tasks: [sampleTask] },
      { prayer: 'DHUHR', name: 'Dhuhr', arabicName: 'الظهر', startTime: '1:05 PM', tasks: [] },
      { prayer: 'ASR', name: 'Asr', arabicName: 'العصر', startTime: '4:35 PM', tasks: [] },
      { prayer: 'MAGHRIB', name: 'Maghrib', arabicName: 'المغرب', startTime: '7:10 PM', tasks: [] },
      { prayer: 'ISHA', name: 'Isha', arabicName: 'العشاء', startTime: '8:30 PM', tasks: [] },
    ],
    anytimeTasks: [sampleAnytimeTask],
    totalTasksCount: 2,
  };

  it('renders exactly five prayer sections in fixed canonical order (M14 §1)', async () => {
    const { getByTestId, queryByTestId } = await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={detailModel} />
      </ThemeProvider>
    );

    // Fixed order: Fajr, Dhuhr, Asr, Maghrib, Isha
    expect(getByTestId('prayer-section-fajr')).toBeTruthy();
    expect(getByTestId('prayer-section-dhuhr')).toBeTruthy();
    expect(getByTestId('prayer-section-asr')).toBeTruthy();
    expect(getByTestId('prayer-section-maghrib')).toBeTruthy();
    expect(getByTestId('prayer-section-isha')).toBeTruthy();

    // Invariant: Sunrise is NOT a section
    expect(queryByTestId('prayer-section-sunrise')).toBeNull();

    // Verify ordering in rendered tree
    const container = getByTestId('prayer-sections-list');
    const childTestIds = container.props.children.map((child: any) => child.props.testID);
    expect(childTestIds).toEqual([
      'prayer-section-fajr',
      'prayer-section-dhuhr',
      'prayer-section-asr',
      'prayer-section-maghrib',
      'prayer-section-isha',
    ]);
  });

  it('renders visually secondary Anytime area below the five prayer sections (M14 §2)', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={detailModel} />
      </ThemeProvider>
    );

    const anytimeSection = getByTestId('anytime-secondary-section');
    expect(anytimeSection).toBeTruthy();
    expect(getByText('Read Quran Juz 15')).toBeTruthy();
  });

  it('renders task cards in read-only form with no completion mutation (M14 §3)', async () => {
    const { getByText, queryByTestId } = await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={detailModel} />
      </ThemeProvider>
    );

    expect(getByText('Morning Adhkar')).toBeTruthy();
    // In read-only mode, task cards in Calendar do NOT have an interactive completion toggle
    // Verify there is no completion interaction callback attached
    expect(queryByTestId('task-card-complete-btn-occ-1')).toBeNull();
  });

  it('returns null when selectedDayDetail is null', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={null} />
      </ThemeProvider>
    );

    expect(toJSON()).toBeNull();
  });
});
