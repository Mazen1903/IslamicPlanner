import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CalendarMonthGrid } from '../CalendarMonthGrid';
import { buildCalendarMonthGrid } from '@/domain/calendar/calendarGrid';
import { HijriService } from '@/domain/calendar/HijriService';

describe('CalendarMonthGrid (M14)', () => {
  const hijriService = new HijriService();

  it('renders Sunday-first weekday headers in order (Sun to Sat)', async () => {
    const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);
    const { getByText } = await render(
      <ThemeProvider>
        <CalendarMonthGrid grid={grid} onCellTap={jest.fn()} />
      </ThemeProvider>
    );

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of weekdays) {
      expect(getByText(day)).toBeTruthy();
    }
  });

  it('renders natural 4, 5, or 6 rows without forcing 5 rows (M14 §15)', async () => {
    // February 2026 starts on Sunday (28 days => exactly 4 rows)
    const febGrid = buildCalendarMonthGrid(2026, 2, '2026-02-01', '2026-02-01', hijriService);
    expect(febGrid.rowCount).toBe(4);
    expect(febGrid.cells.length).toBe(28);

    const { getAllByTestId: getFebCells } = await render(
      <ThemeProvider>
        <CalendarMonthGrid grid={febGrid} onCellTap={jest.fn()} testID="feb-grid" />
      </ThemeProvider>
    );
    // All 28 cells rendered
    expect(getFebCells(/^calendar-cell-/).length).toBe(28);

    // September 2026 (starts Tuesday, 30 days => 35 cells / 5 rows)
    const sepGrid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);
    expect(sepGrid.rowCount).toBe(5);
    expect(sepGrid.cells.length).toBe(35);

    // August 2026 (starts Saturday, 31 days => 42 cells / 6 rows)
    const augGrid = buildCalendarMonthGrid(2026, 8, '2026-08-15', '2026-08-15', hijriService);
    expect(augGrid.rowCount).toBe(6);
    expect(augGrid.cells.length).toBe(42);
  });

  it('routes cell tap to onCellTap callback', async () => {
    const onCellTap = jest.fn();
    const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);

    const { getByTestId } = await render(
      <ThemeProvider>
        <CalendarMonthGrid grid={grid} onCellTap={onCellTap} />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('calendar-cell-2026-09-15'));
    expect(onCellTap).toHaveBeenCalledTimes(1);
    expect(onCellTap.mock.calls[0][0].date).toBe('2026-09-15');
  });
});
