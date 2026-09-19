import React from 'react';
import { I18nManager } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PrayerTabBar } from '@/components/prayer/PrayerTabBar';
import type { PrayerTabViewModel } from '@/services/types';
import fs from 'fs';

describe('Group J: Prayer Tab RTL Order Contract', () => {
  const sampleTabs: PrayerTabViewModel[] = [
    { prayer: 'FAJR', name: 'Fajr', arabicName: 'الفجر', startTime: '5:15 AM', startDateTime: '2026-09-19T05:15:00Z', temporalState: 'PAST', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
    { prayer: 'DHUHR', name: 'Dhuhr', arabicName: 'الظهر', startTime: '1:05 PM', startDateTime: '2026-09-19T13:05:00Z', temporalState: 'CURRENT', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
    { prayer: 'ASR', name: 'Asr', arabicName: 'العصر', startTime: '4:35 PM', startDateTime: '2026-09-19T16:35:00Z', temporalState: 'FUTURE', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
    { prayer: 'MAGHRIB', name: 'Maghrib', arabicName: 'المغرب', startTime: '7:10 PM', startDateTime: '2026-09-19T19:10:00Z', temporalState: 'FUTURE', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
    { prayer: 'ISHA', name: 'Isha', arabicName: 'العشاء', startTime: '8:30 PM', startDateTime: '2026-09-19T20:30:00Z', temporalState: 'FUTURE', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
  ];

  it('J-1: renders tabs in canonical chronological order (Fajr -> Dhuhr -> Asr -> Maghrib -> Isha)', async () => {
    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(5);
    expect(tabs[0].props.testID).toBe('prayer-tab-fajr');
    expect(tabs[1].props.testID).toBe('prayer-tab-dhuhr');
    expect(tabs[2].props.testID).toBe('prayer-tab-asr');
    expect(tabs[3].props.testID).toBe('prayer-tab-maghrib');
    expect(tabs[4].props.testID).toBe('prayer-tab-isha');
  });

  it('J-2: does NOT force direction: "ltr" or hardcoded physical layout on container', () => {
    const src = fs.readFileSync('src/components/prayer/PrayerTabBar.tsx', 'utf8');
    expect(src).not.toContain("direction: 'ltr'");
    expect(src).not.toContain('direction: "ltr"');
  });

  it('J-3: onSelectPrayer receives correct prayer identifier when pressed in RTL mode', async () => {
    const onSelect = jest.fn();
    const orig = I18nManager.isRTL;
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: true });

    try {
      await render(
        <ThemeProvider>
          <PrayerTabBar
            tabs={sampleTabs}
            selectedPrayer="DHUHR"
            onSelectPrayer={onSelect}
          />
        </ThemeProvider>
      );

      await act(async () => {
        fireEvent.press(screen.getByTestId('prayer-tab-fajr'));
      });
      expect(onSelect).toHaveBeenCalledWith('FAJR');

      await act(async () => {
        fireEvent.press(screen.getByTestId('prayer-tab-maghrib'));
      });
      expect(onSelect).toHaveBeenCalledWith('MAGHRIB');
    } finally {
      Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: orig });
    }
  });

  it('J-4: tab container has accessibilityRole="tablist"', async () => {
    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    const tablist = screen.getByTestId('prayer-tab-bar');
    expect(tablist.props.accessibilityRole).toBe('tablist');
  });

  it('J-5: each tab carries accessibilityRole="tab" and correct selected state', async () => {
    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    const dhuhrTab = screen.getByTestId('prayer-tab-dhuhr');
    expect(dhuhrTab.props.accessibilityRole).toBe('tab');
    expect(dhuhrTab.props.accessibilityState).toEqual({ selected: true });

    const fajrTab = screen.getByTestId('prayer-tab-fajr');
    expect(fajrTab.props.accessibilityState).toEqual({ selected: false });
  });

  it('J-6: active indicator dot is suppressed from accessibility traversal (A-16)', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    const json = JSON.stringify(toJSON());
    // Indicator dot View has importantForAccessibility="no" and accessible={false}
    expect(json).toContain('"importantForAccessibility":"no"');
  });

  it('J-7: screen reader label contains prayer name, start time, and current state', async () => {
    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={sampleTabs}
          selectedPrayer="DHUHR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );

    const dhuhrTab = screen.getByTestId('prayer-tab-dhuhr');
    expect(dhuhrTab.props.accessibilityLabel).toBe('Dhuhr, 1:05 PM, current prayer');

    const fajrTab = screen.getByTestId('prayer-tab-fajr');
    expect(fajrTab.props.accessibilityLabel).toBe('Fajr, 5:15 AM');
  });

  it('J-8: DOM reading order remains Fajr -> Isha in both LTR and RTL', async () => {
    const orig = I18nManager.isRTL;
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: true });

    try {
      await render(
        <ThemeProvider>
          <PrayerTabBar
            tabs={sampleTabs}
            selectedPrayer="DHUHR"
            onSelectPrayer={jest.fn()}
          />
        </ThemeProvider>
      );

      const tabs = screen.getAllByRole('tab');
      const testIds = tabs.map((t) => t.props.testID);
      expect(testIds).toEqual([
        'prayer-tab-fajr',
        'prayer-tab-dhuhr',
        'prayer-tab-asr',
        'prayer-tab-maghrib',
        'prayer-tab-isha',
      ]);
    } finally {
      Object.defineProperty(I18nManager, 'isRTL', { configurable: true, value: orig });
    }
  });
});
