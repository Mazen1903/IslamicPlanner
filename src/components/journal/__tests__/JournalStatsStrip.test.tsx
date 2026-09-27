import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { JournalStatsStrip } from '../JournalStatsStrip';
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

describe('JournalStatsStrip', () => {
  it('renders stats with 0 counts when entries is empty', async () => {
    await render(
      <ThemeProvider>
        <JournalStatsStrip entries={[]} activePlanningDayKey="2026-09-24" />
      </ThemeProvider>
    );

    expect(screen.getByTestId('journal-stats-strip')).toBeTruthy();
    expect(screen.getByTestId('journal-stat-total')).toBeTruthy();
    expect(screen.getByTestId('journal-stat-streak')).toBeTruthy();
    expect(screen.getByTestId('journal-stat-best')).toBeTruthy();
  });

  it('renders correct total entries, streak, and best streak', async () => {
    const entries = [
      createEntry('2026-09-22'),
      createEntry('2026-09-23'),
      createEntry('2026-09-24'),
    ];

    await render(
      <ThemeProvider>
        <JournalStatsStrip entries={entries} activePlanningDayKey="2026-09-24" />
      </ThemeProvider>
    );

    const threes = screen.getAllByText('3');
    expect(threes.length).toBe(3); // total, streak, best all match 3
    expect(screen.getByText('Day Streak')).toBeTruthy();
    expect(screen.getByText('Best Streak')).toBeTruthy();
  });
});
