import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PrayerTabBar } from '@/components/prayer/PrayerTabBar';
import { TaskCheckbox } from '@/components/task/TaskCheckbox';
import { PrayerTransitionBanner } from '@/components/prayer/PrayerTransitionBanner';
import { TaskCard } from '@/components/task/TaskCard';
import type { PrayerTabViewModel, TaskCardViewModel } from '@/services/types';
import { touchTargets } from '@/theme/tokens';

describe('Today Screen Accessibility (AX-01 to AX-05)', () => {
  const dummyTabs: PrayerTabViewModel[] = [
    {
      prayer: 'FAJR',
      name: 'Fajr',
      arabicName: 'الفجر',
      startTime: '5:15 AM',
      startDateTime: '2026-09-15T05:15:00.000Z',
      temporalState: 'PAST',
      scheduledTasks: [],
      missedTasks: [],
      completedTasks: [],
      anytimeTasks: [],
    },
    {
      prayer: 'DHUHR',
      name: 'Dhuhr',
      arabicName: 'الظهر',
      startTime: '1:05 PM',
      startDateTime: '2026-09-15T13:05:00.000Z',
      temporalState: 'CURRENT',
      scheduledTasks: [],
      missedTasks: [],
      completedTasks: [],
      anytimeTasks: [],
    },
    {
      prayer: 'ASR',
      name: 'Asr',
      arabicName: 'العصر',
      startTime: '4:45 PM',
      startDateTime: '2026-09-15T16:45:00.000Z',
      temporalState: 'FUTURE',
      scheduledTasks: [],
      missedTasks: [],
      completedTasks: [],
      anytimeTasks: [],
    },
    {
      prayer: 'MAGHRIB',
      name: 'Maghrib',
      arabicName: 'المغرب',
      startTime: '7:15 PM',
      startDateTime: '2026-09-15T19:15:00.000Z',
      temporalState: 'FUTURE',
      scheduledTasks: [],
      missedTasks: [],
      completedTasks: [],
      anytimeTasks: [],
    },
    {
      prayer: 'ISHA',
      name: 'Isha',
      arabicName: 'العشاء',
      startTime: '8:35 PM',
      startDateTime: '2026-09-15T20:35:00.000Z',
      temporalState: 'FUTURE',
      scheduledTasks: [],
      missedTasks: [],
      completedTasks: [],
      anytimeTasks: [],
    },
  ];

  it('AX-01: tab selected state follows selectedPrayer with accessibilityRole="tab"', async () => {
    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={dummyTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);

    // Fajr is not selected
    const fajrTab = screen.getByTestId('prayer-tab-fajr');
    expect(fajrTab.props.accessibilityState).toEqual({ selected: false });

    // Dhuhr is selected
    const dhuhrTab = screen.getByTestId('prayer-tab-dhuhr');
    expect(dhuhrTab.props.accessibilityState).toEqual({ selected: true });
  });

  it('AX-02: checkbox has role="checkbox", checked state, and accessible label', async () => {
    const onToggle = jest.fn();
    await render(
      <ThemeProvider>
        <TaskCheckbox
          checked={true}
          onToggle={onToggle}
          accessibilityLabel="Complete task: Read Surah Kahf"
        />
      </ThemeProvider>
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect(checkbox.props.accessibilityState).toEqual({ checked: true, disabled: false });
    expect(checkbox.props.accessibilityLabel).toBe('Complete task: Read Surah Kahf');
  });

  it('AX-03: prayer transition banner announced accessibly with polite live region', async () => {
    await render(
      <ThemeProvider>
        <PrayerTransitionBanner
          transition={{
            newPrayer: 'DHUHR',
            message: 'Dhuhr has begun — View Dhuhr',
          }}
          onViewPress={jest.fn()}
        />
      </ThemeProvider>
    );

    const banner = screen.getByTestId('prayer-transition-banner');
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
    expect(banner.props.accessibilityLabel).toBe('Dhuhr has begun — View Dhuhr');
  });

  it('AX-04: missed and completed status use explicit text labels, not color alone', async () => {
    const missedTask: TaskCardViewModel = {
      occurrenceId: 'm-ax-1',
      taskDefinitionId: 'd-1',
      title: 'Morning Dhikr',
      scheduleType: 'PRAYER_RELATIVE',
      scheduleLabel: 'Fajr +15 min',
      priority: 'NORMAL',
      status: 'MISSED',
      estimatedMinutes: 15,
      sortInstant: null,
      createdAt: '2026-09-15T05:00:00.000Z',
      completedAt: null,
      missedAt: '2026-09-15T07:00:00.000Z',
    };

    const completedTask: TaskCardViewModel = {
      occurrenceId: 'c-ax-1',
      taskDefinitionId: 'd-2',
      title: 'Read Quran',
      scheduleType: 'PRAYER_RELATIVE',
      scheduleLabel: 'Fajr +30 min',
      priority: 'IMPORTANT',
      status: 'COMPLETED',
      estimatedMinutes: 20,
      sortInstant: null,
      createdAt: '2026-09-15T05:00:00.000Z',
      completedAt: '2026-09-15T06:00:00.000Z',
      missedAt: null,
    };

    const { rerender } = await render(
      <ThemeProvider>
        <TaskCard task={missedTask} />
      </ThemeProvider>
    );

    // Explicit text badge "Missed"
    expect(screen.getByText('Missed')).toBeTruthy();

    await rerender(
      <ThemeProvider>
        <TaskCard task={completedTask} />
      </ThemeProvider>
    );

    // Explicit text badge "Completed" and "IMPORTANT"
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('IMPORTANT')).toBeTruthy();
  });

  it('AX-05: touch targets meet or exceed 44px minimum token', async () => {
    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={dummyTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
        <TaskCheckbox checked={false} onToggle={jest.fn()} />
      </ThemeProvider>
    );

    const dhuhrTab = screen.getByTestId('prayer-tab-dhuhr');
    expect(dhuhrTab).toBeTruthy();
    // Verify touchTargets.min token is 44
    expect(touchTargets.min).toBeGreaterThanOrEqual(44);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          minWidth: 44,
          minHeight: 44,
        }),
      ])
    );
  });
});
