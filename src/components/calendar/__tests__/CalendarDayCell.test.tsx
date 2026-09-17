import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CalendarDayCell } from '../CalendarDayCell';
import type { CalendarDayCellModel } from '@/domain/calendar/calendarGrid';

describe('CalendarDayCell (M14)', () => {
  const baseCell: CalendarDayCellModel = {
    date: '2026-09-15',
    dayNumber: 15,
    hijriDayNumber: 3,
    hijriDate: { year: 1448, month: 3, day: 3 },
    isCurrentMonth: true,
    isCivilToday: false,
    isSelected: false,
    hasTasks: true,
    taskSummary: { total: 3, completed: 1, pending: 2, missed: 0 },
    accessibleLabel: 'Tuesday, September 15, 2026, 3 Rabi al-Awwal 1448 AH, 1 completed, 2 pending',
  };

  it('renders Gregorian and Hijri day numbers and accessible label', async () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = await render(
      <ThemeProvider>
        <CalendarDayCell cell={baseCell} onPress={onPress} />
      </ThemeProvider>
    );

    expect(getByText('15')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByLabelText(baseCell.accessibleLabel)).toBeTruthy();
  });

  it('renders single task-presence dot when hasTasks is true (M14 §4)', async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <CalendarDayCell cell={baseCell} onPress={jest.fn()} />
      </ThemeProvider>
    );

    expect(getByTestId('task-dot-2026-09-15')).toBeTruthy();
  });

  it('does NOT render task dot when hasTasks is false', async () => {
    const noTasksCell: CalendarDayCellModel = {
      ...baseCell,
      hasTasks: false,
      taskSummary: { total: 0, completed: 0, pending: 0, missed: 0 },
    };

    const { queryByTestId } = await render(
      <ThemeProvider>
        <CalendarDayCell cell={noTasksCell} onPress={jest.fn()} />
      </ThemeProvider>
    );

    expect(queryByTestId('task-dot-2026-09-15')).toBeNull();
  });

  it('dimmed filler cell does NOT render task dot (M14 §8)', async () => {
    const fillerCell: CalendarDayCellModel = {
      ...baseCell,
      date: '2026-08-30',
      dayNumber: 30,
      hijriDayNumber: 16,
      isCurrentMonth: false,
      hasTasks: false,
      taskSummary: { total: 0, completed: 0, pending: 0, missed: 0 },
    };

    const { queryByTestId, getByText } = await render(
      <ThemeProvider>
        <CalendarDayCell cell={fillerCell} onPress={jest.fn()} />
      </ThemeProvider>
    );

    expect(getByText('30')).toBeTruthy();
    expect(getByText('16')).toBeTruthy();
    expect(queryByTestId('task-dot-2026-08-30')).toBeNull();
  });

  it('invokes onPress callback with the cell data on press', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <ThemeProvider>
        <CalendarDayCell cell={baseCell} onPress={onPress} />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('calendar-cell-2026-09-15'));
    expect(onPress).toHaveBeenCalledWith(baseCell);
  });
});
