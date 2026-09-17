import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { UpcomingSection } from '../UpcomingSection';
import type { UpcomingTaskItem } from '@/services/CalendarMonthOrchestrator';

describe('UpcomingSection (M14 §5)', () => {
  const sampleItems: UpcomingTaskItem[] = [
    {
      occurrenceId: 'occ-up-1',
      taskDefinitionId: 'def-up-1',
      title: 'Prepare Friday Khutbah Notes',
      planningDayKey: '2026-09-18',
      scheduleType: 'PRAYER_WINDOW',
      scheduleLabel: 'During Dhuhr',
      priority: 'IMPORTANT',
      calculatedStartTime: '2026-09-18T13:00:00.000Z',
      windowStart: '2026-09-18T13:00:00.000Z',
      createdAt: '2026-09-15T00:00:00.000Z',
    },
    {
      occurrenceId: 'occ-up-2',
      taskDefinitionId: 'def-up-2',
      title: 'Family Dinner Gathering',
      planningDayKey: '2026-09-20',
      scheduleType: 'EXACT_TIME',
      scheduleLabel: '7:30 PM',
      priority: 'NORMAL',
      calculatedStartTime: '2026-09-20T19:30:00.000Z',
      windowStart: null,
      createdAt: '2026-09-15T00:00:00.000Z',
    },
  ];

  it('renders upcoming task items with dates, schedule labels, and badges', async () => {
    const { getByText, getByTestId } = await render(
      <ThemeProvider>
        <UpcomingSection upcomingTasks={sampleItems} hasMoreUpcoming={false} />
      </ThemeProvider>
    );

    expect(getByText('Upcoming This Month')).toBeTruthy();
    expect(getByText('Prepare Friday Khutbah Notes')).toBeTruthy();
    expect(getByText('Family Dinner Gathering')).toBeTruthy();
    expect(getByText('During Dhuhr')).toBeTruthy();
    expect(getByText('7:30 PM')).toBeTruthy();
    expect(getByText('IMPORTANT')).toBeTruthy();

    expect(getByTestId('upcoming-item-occ-up-1')).toBeTruthy();
    expect(getByTestId('upcoming-item-occ-up-2')).toBeTruthy();
  });

  it('renders empty state when there are no upcoming tasks', async () => {
    const { getByText, queryByTestId } = await render(
      <ThemeProvider>
        <UpcomingSection upcomingTasks={[]} hasMoreUpcoming={false} />
      </ThemeProvider>
    );

    expect(getByText('No upcoming tasks for the remainder of this month')).toBeTruthy();
    expect(queryByTestId('upcoming-item-occ-up-1')).toBeNull();
  });

  it('renders more items indicator when hasMoreUpcoming is true (capped at 50)', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <UpcomingSection upcomingTasks={sampleItems} hasMoreUpcoming={true} />
      </ThemeProvider>
    );

    expect(getByTestId('upcoming-more-items-indicator')).toBeTruthy();
    expect(getByText('More items this month...')).toBeTruthy();
  });
});
