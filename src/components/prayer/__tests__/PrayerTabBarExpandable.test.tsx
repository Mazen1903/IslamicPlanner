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

    // Selected tab (Dhuhr) time text carries ComicSansMS-Bold and primary color
    const dhuhrTime = screen.getByText('1:05 PM');
    const dhuhrStyle = StyleSheet.flatten(dhuhrTime.props.style);
    expect(dhuhrStyle.fontFamily).toBe('ComicSansMS-Bold');

    // Unselected tab time text carries secondary/tertiary color
    const fajrTime = screen.getByText('5:15 AM');
    const fajrStyle = StyleSheet.flatten(fajrTime.props.style);
    expect(fajrStyle.color).not.toBe(dhuhrStyle.color);
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

  it('renders active prayer covered by solid green highlighter for current prayer and others when active', async () => {
    const { rerender } = await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="ASR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    // Asr is selectedPrayer (user switched to Asr - other prayer active)
    const asrTab = screen.getByTestId('prayer-tab-asr');
    const asrTabStyle = StyleSheet.flatten(asrTab.props.style);
    expect(asrTabStyle.backgroundColor).toBe('#0F9F4A');
    const asrText = screen.getByText('Asr');
    const asrStyle = StyleSheet.flatten(asrText.props.style);
    expect(asrStyle.color).toBe('#FFFFFF'); // textOnPrimary for solid active prayer
    const asrTime = screen.getByText('4:35 PM');
    const asrTimeStyle = StyleSheet.flatten(asrTime.props.style);
    expect(asrTimeStyle.color).toBe('#FFFFFF'); // start time also covered by solid green highlighter

    // Dhuhr is temporalState: 'CURRENT' (inactive, so carries indicator border)
    const dhuhrTab = screen.getByTestId('prayer-tab-dhuhr');
    const dhuhrTabStyle = StyleSheet.flatten(dhuhrTab.props.style);
    expect(dhuhrTabStyle.borderColor).toBe('#0F9F4A');

    // Layout triggers sliding pill covering active prayer
    await act(async () => {
      fireEvent(asrTab, 'layout', {
        nativeEvent: { layout: { x: 150, y: 4, width: 75, height: 40 } },
      });
    });

    const pill = screen.getByTestId('prayer-tab-sliding-pill');
    expect(pill).toBeTruthy();
    expect(pill.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: '#0F9F4A',
      })
    );

    // Switch to current prayer (Dhuhr) - solid green highlighter covers entire current prayer
    await rerender(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    const dhuhrActiveTab = screen.getByTestId('prayer-tab-dhuhr');
    const dhuhrActiveStyle = StyleSheet.flatten(dhuhrActiveTab.props.style);
    expect(dhuhrActiveStyle.backgroundColor).toBe('#0F9F4A');
    const dhuhrActiveText = screen.getByText('Dhuhr');
    expect(StyleSheet.flatten(dhuhrActiveText.props.style).color).toBe('#FFFFFF');
    const dhuhrActiveTime = screen.getByText('1:05 PM');
    expect(StyleSheet.flatten(dhuhrActiveTime.props.style).color).toBe('#FFFFFF');
  });
});
