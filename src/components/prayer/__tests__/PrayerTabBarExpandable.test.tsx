import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PrayerTabBar } from '@/components/prayer/PrayerTabBar';
import type { PrayerTabViewModel } from '@/services/types';

describe('PrayerTabBar Expandable Integration', () => {
  const sampleTabs: PrayerTabViewModel[] = [
    {
      prayer: 'FAJR',
      name: 'Fajr',
      arabicName: 'الفجر',
      startTime: '5:15 AM',
      startDateTime: '2026-09-19T05:15:00Z',
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
      startDateTime: '2026-09-19T13:05:00Z',
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
      startTime: '4:35 PM',
      startDateTime: '2026-09-19T16:35:00Z',
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
      startTime: '7:10 PM',
      startDateTime: '2026-09-19T19:10:00Z',
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
      startTime: '8:30 PM',
      startDateTime: '2026-09-19T20:30:00Z',
      temporalState: 'FUTURE',
      scheduledTasks: [],
      missedTasks: [],
      completedTasks: [],
      anytimeTasks: [],
    },
  ];

  it('renders all prayer names and displays start time only for the selected tab', async () => {
    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    // All prayer names are rendered cleanly
    expect(screen.getByText('Fajr')).toBeTruthy();
    expect(screen.getByText('Dhuhr')).toBeTruthy();
    expect(screen.getByText('Asr')).toBeTruthy();
    expect(screen.getByText('Maghrib')).toBeTruthy();
    expect(screen.getByText('Isha')).toBeTruthy();

    // All time labels are always rendered (animation hides them via transform/opacity on the Animated.View wrapper)
    expect(screen.getByText('1:05 PM')).toBeTruthy(); // selected: Dhuhr time present
    expect(screen.getByText('5:15 AM')).toBeTruthy(); // unselected: Fajr time still in DOM
    expect(screen.getByText('4:35 PM')).toBeTruthy(); // unselected: Asr time still in DOM

    // Selected tab (Dhuhr) time text carries full-weight style
    const dhuhrTime = screen.getByText('1:05 PM');
    const dhuhrStyle = StyleSheet.flatten(dhuhrTime.props.style);
    expect(dhuhrStyle.fontWeight).toBe('700'); // bold on selected

    // Unselected tab time text carries lighter weight (hidden by Animated.View transform, not style)
    const fajrTime = screen.getByText('5:15 AM');
    const fajrStyle = StyleSheet.flatten(fajrTime.props.style);
    expect(fajrStyle.fontWeight).not.toBe('700'); // not bold when unselected
  });

  it('tapping an unexpanded tab invokes onSelectPrayer', async () => {
    const onSelect = jest.fn();

    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={onSelect}
        />
      </ThemeProvider>
    );

    const fajrTab = screen.getByTestId('prayer-tab-fajr');

    await act(async () => {
      fireEvent.press(fajrTab);
    });

    expect(onSelect).toHaveBeenCalledWith('FAJR');
  });

  it('controlled expansion: accepts expandedPrayer and displays expanded tab state', async () => {
    const onSelect = jest.fn();

    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={onSelect}
          expandedPrayer="DHUHR"
        />
      </ThemeProvider>
    );

    const dhuhrTab = screen.getByTestId('prayer-tab-dhuhr');
    expect(dhuhrTab).toBeTruthy();
    expect(screen.getByText('1:05 PM')).toBeTruthy();

    await act(async () => {
      fireEvent.press(dhuhrTab);
    });

    expect(onSelect).toHaveBeenCalledWith('DHUHR');
  });
});
