import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { JournalHistoryRow } from '../JournalHistoryRow';
import { ThemeProvider } from '@/theme';
import type { JournalEntryMetadata } from '@/domain/journal/types';

describe('JournalHistoryRow', () => {
  const mockMetadata: JournalEntryMetadata = {
    id: 'entry-uuid-1',
    planningDayKey: '2026-09-16',
    revision: 2,
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-09-16T14:30:00Z',
  };

  it('HIST-02: displays metadata dates only and NO content preview', async () => {
    await render(
      <ThemeProvider>
        <JournalHistoryRow
          metadata={mockMetadata}
          gregorianDisplay="Wednesday, 16 Sep 2026"
          hijriDisplay="5 Rabi al-Thani 1448 AH"
          onPress={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Wednesday, 16 Sep 2026')).toBeTruthy();
    expect(screen.getByText('5 Rabi al-Thani 1448 AH')).toBeTruthy();

    // Invariant: No prose preview exists in component
    expect(screen.queryByText(/words/i)).toBeNull();
  });

  it('triggers onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <JournalHistoryRow
          metadata={mockMetadata}
          gregorianDisplay="Wednesday, 16 Sep 2026"
          hijriDisplay="5 Rabi al-Thani 1448 AH"
          onPress={onPress}
        />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('journal-history-row-2026-09-16'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
