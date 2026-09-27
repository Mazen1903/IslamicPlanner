import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { JournalCalendar } from '../JournalCalendar';
import { ThemeProvider } from '@/theme';
import type { JournalEntryMetadata } from '@/domain/journal/types';

function createEntry(planningDayKey: string): JournalEntryMetadata {
  return {
    id: `entry-${planningDayKey}`,
    planningDayKey,
    revision: 1,
    createdAt: `${planningDayKey}T10:00:00Z`,
    updatedAt: `${planningDayKey}T10:00:00Z`,
  };
}

describe('JournalCalendar', () => {
  const entries: JournalEntryMetadata[] = [
    createEntry('2026-09-15'),
    createEntry('2026-09-16'),
  ];

  it('renders month title and day cells', async () => {
    await render(
      <ThemeProvider>
        <JournalCalendar
          entries={entries}
          activePlanningDayKey="2026-09-24"
          onSelectEntry={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('journal-calendar')).toBeTruthy();
    expect(screen.getByTestId('journal-calendar-month-title')).toBeTruthy();
    expect(screen.getByText('September 2026')).toBeTruthy();
    expect(screen.getByTestId('calendar-day-2026-09-15')).toBeTruthy();
    expect(screen.getByTestId('calendar-dot-2026-09-15')).toBeTruthy();
  });

  it('navigates to next and previous month', async () => {
    await render(
      <ThemeProvider>
        <JournalCalendar
          entries={entries}
          activePlanningDayKey="2026-09-24"
          onSelectEntry={jest.fn()}
        />
      </ThemeProvider>
    );

    // Next month -> October 2026
    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-calendar-next-month'));
    });
    expect(screen.getByText('October 2026')).toBeTruthy();
    expect(screen.getByTestId('journal-calendar-jump-today')).toBeTruthy();

    // Jump back to today -> September 2026
    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-calendar-jump-today'));
    });
    expect(screen.getByText('September 2026')).toBeTruthy();

    // Previous month -> August 2026
    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-calendar-prev-month'));
    });
    expect(screen.getByText('August 2026')).toBeTruthy();
  });

  it('triggers onSelectEntry when a day with an entry is pressed', async () => {
    const onSelectEntry = jest.fn();

    await render(
      <ThemeProvider>
        <JournalCalendar
          entries={entries}
          activePlanningDayKey="2026-09-24"
          onSelectEntry={onSelectEntry}
        />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-day-2026-09-15'));
    });

    expect(onSelectEntry).toHaveBeenCalledWith(entries[0]);
  });
});
