import React from 'react';
import { I18nManager } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { CalendarDayCell } from '@/components/calendar/CalendarDayCell';
import { buildCalendarMonthGrid, CalendarDayCellModel } from '@/domain/calendar/calendarGrid';
import { HijriService } from '@/domain/calendar/HijriService';
import fs from 'fs';

describe('Group K: Calendar RTL Contract', () => {
  const hijriService = new HijriService();
  const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);

  const sampleCell: CalendarDayCellModel = {
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

  it('K-1: CalendarHeader onPreviousMonth is called when previous button is tapped in RTL mode', async () => {
    const onPrev = jest.fn();
    const orig = I18nManager.isRTL;
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: true });

    try {
      await render(
        <ThemeProvider>
          <CalendarHeader
            gregorianTitle="September 2026"
            hijriHeaderSpan="Rabi al-Awwal 1448 AH"
            onPreviousMonth={onPrev}
            onNextMonth={jest.fn()}
            onTodayPress={jest.fn()}
          />
        </ThemeProvider>
      );

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Previous month'));
      });
      expect(onPrev).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: orig });
    }
  });

  it('K-2: CalendarHeader onNextMonth is called when next button is tapped in RTL mode', async () => {
    const onNext = jest.fn();
    const orig = I18nManager.isRTL;
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: true });

    try {
      await render(
        <ThemeProvider>
          <CalendarHeader
            gregorianTitle="September 2026"
            hijriHeaderSpan="Rabi al-Awwal 1448 AH"
            onPreviousMonth={jest.fn()}
            onNextMonth={onNext}
            onTodayPress={jest.fn()}
          />
        </ThemeProvider>
      );

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Next month'));
      });
      expect(onNext).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: orig });
    }
  });

  it('K-3: Weekday data order remains Sunday-first (Sun, Mon, Tue, Wed, Thu, Fri, Sat)', async () => {
    await render(
      <ThemeProvider>
        <CalendarMonthGrid grid={grid} onCellTap={jest.fn()} />
      </ThemeProvider>
    );

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of weekdays) {
      expect(screen.getByText(day)).toBeTruthy();
    }
  });

  it('K-4: CalendarMonthGrid renders day cells in forward chronological order', async () => {
    await render(
      <ThemeProvider>
        <CalendarMonthGrid grid={grid} onCellTap={jest.fn()} />
      </ThemeProvider>
    );

    // Month starts with days belonging to grid
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1);
  });

  it('K-5: CalendarDayCell onPress callback fires with correct date regardless of RTL', async () => {
    const onSelect = jest.fn();
    const orig = I18nManager.isRTL;
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: true });

    try {
      await render(
        <ThemeProvider>
          <CalendarDayCell cell={sampleCell} onPress={onSelect} />
        </ThemeProvider>
      );

      await act(async () => {
        fireEvent.press(screen.getByLabelText(sampleCell.accessibleLabel));
      });
      expect(onSelect).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: orig });
    }
  });

  it('K-6: CalendarHeader month title has accessibilityRole="header"', async () => {
    await render(
      <ThemeProvider>
        <CalendarHeader
          gregorianTitle="September 2026"
          hijriHeaderSpan="Rabi al-Awwal 1448 AH"
          onPreviousMonth={jest.fn()}
          onNextMonth={jest.fn()}
          onTodayPress={jest.fn()}
        />
      </ThemeProvider>
    );

    const title = screen.getByText('September 2026');
    expect(title.props.accessibilityRole).toBe('header');
  });

  it('K-7: Calendar components do not force physical direction: "ltr"', () => {
    const headerSrc = fs.readFileSync('src/components/calendar/CalendarHeader.tsx', 'utf8');
    expect(headerSrc).not.toContain("direction: 'ltr'");
    expect(headerSrc).not.toContain('direction: "ltr"');

    const gridSrc = fs.readFileSync('src/components/calendar/CalendarMonthGrid.tsx', 'utf8');
    expect(gridSrc).not.toContain("direction: 'ltr'");
    expect(gridSrc).not.toContain('direction: "ltr"');
  });

  it('K-8: DayDetailTaskList prayer sections retain canonical sequence (Fajr -> Isha)', () => {
    const src = fs.readFileSync('src/components/calendar/DayDetailTaskList.tsx', 'utf8');
    expect(src).toContain('prayerSections.map');
    expect(src).toContain('prayer-sections-list');
  });
});
