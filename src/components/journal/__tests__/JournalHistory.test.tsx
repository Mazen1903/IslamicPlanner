import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { JournalHistory } from '../JournalHistory';
import { ThemeProvider } from '@/theme';
import type { JournalEntryMetadata } from '@/domain/journal/types';

describe('JournalHistory', () => {
  const mockEntries: JournalEntryMetadata[] = [
    {
      id: 'entry-1',
      planningDayKey: '2026-09-16',
      revision: 1,
      createdAt: '2026-09-16T10:00:00Z',
      updatedAt: '2026-09-16T10:00:00Z',
    },
    {
      id: 'entry-2',
      planningDayKey: '2026-09-15',
      revision: 1,
      createdAt: '2026-09-15T10:00:00Z',
      updatedAt: '2026-09-15T10:00:00Z',
    },
  ];

  it('renders history entries and triggers onSelectEntry', async () => {
    const onSelectEntry = jest.fn();
    const onBackToToday = jest.fn();

    const { unmount } = await render(
      <ThemeProvider>
        <JournalHistory
          entries={mockEntries}
          onSelectEntry={onSelectEntry}
          onBackToToday={onBackToToday}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByTestId('journal-history-row-2026-09-16')).toBeTruthy();
    expect(screen.getByTestId('journal-history-row-2026-09-15')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-history-row-2026-09-16'));
    });
    expect(onSelectEntry).toHaveBeenCalledWith(mockEntries[0]);

    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-history-back-btn'));
    });
    expect(onBackToToday).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('renders calm empty state when entries list is empty', async () => {
    const { unmount } = await render(
      <ThemeProvider>
        <JournalHistory
          entries={[]}
          onSelectEntry={jest.fn()}
          onBackToToday={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('journal-history-empty')).toBeTruthy();
    expect(screen.getByText('No previous journal entries yet.')).toBeTruthy();
    unmount();
  });
});
