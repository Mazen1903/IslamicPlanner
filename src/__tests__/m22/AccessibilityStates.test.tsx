import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskCheckbox } from '@/components/task/TaskCheckbox';
import { SettingsToggle } from '@/components/settings/SettingsToggle';
import { PrayerTabBar } from '@/components/prayer/PrayerTabBar';
import { CustomRecurrenceModal } from '@/components/task-form/CustomRecurrenceModal';
import { CompletedSection } from '@/components/task/CompletedSection';
import { AnytimeTodaySection } from '@/components/task/AnytimeTodaySection';
import { SetupRequiredState } from '@/components/today/SetupRequiredState';
import { JournalSaveStatus } from '@/components/journal/JournalSaveStatus';
import { PrayerTransitionBanner } from '@/components/prayer/PrayerTransitionBanner';
import { Button } from '@/components/common/Button';
import type { PrayerTabViewModel, TaskCardViewModel } from '@/services/types';
import fs from 'fs';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/hooks/useLocation', () => ({
  useLocation: () => ({
    requestAutoLocation: jest.fn().mockResolvedValue(false),
  }),
}));

const mockTabs: PrayerTabViewModel[] = [
  { prayer: 'FAJR', name: 'Fajr', arabicName: 'الفجر', startTime: '05:00', startDateTime: '2026-09-19T05:00:00Z', temporalState: 'CURRENT', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
  { prayer: 'DHUHR', name: 'Dhuhr', arabicName: 'الظهر', startTime: '12:30', startDateTime: '2026-09-19T12:30:00Z', temporalState: 'FUTURE', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
  { prayer: 'ASR', name: 'Asr', arabicName: 'العصر', startTime: '15:45', startDateTime: '2026-09-19T15:45:00Z', temporalState: 'FUTURE', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
  { prayer: 'MAGHRIB', name: 'Maghrib', arabicName: 'المغرب', startTime: '18:15', startDateTime: '2026-09-19T18:15:00Z', temporalState: 'FUTURE', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
  { prayer: 'ISHA', name: 'Isha', arabicName: 'العشاء', startTime: '19:30', startDateTime: '2026-09-19T19:30:00Z', temporalState: 'FUTURE', scheduledTasks: [], missedTasks: [], completedTasks: [], anytimeTasks: [] },
];

const mockTask: TaskCardViewModel = {
  occurrenceId: 'occ-1',
  taskDefinitionId: 'def-1',
  title: 'Morning Dhikr',
  scheduleType: 'PRAYER_RELATIVE',
  scheduleLabel: 'After Fajr',
  priority: 'NORMAL',
  status: 'COMPLETED',
  estimatedMinutes: null,
  sortInstant: '2026-09-19T05:15:00Z',
  createdAt: '2026-09-19T05:00:00Z',
  completedAt: '2026-09-19T05:15:00Z',
  missedAt: null,
  dueAt: null,
  expiresAt: null,
};

describe('Group C: Accessibility States & Live Regions Contract (§6.2, §11)', () => {
  // Checkbox states
  it('C-1: TaskCheckbox exposes accessibilityState.checked=false when unchecked', async () => {
    await render(
      <ThemeProvider>
        <TaskCheckbox checked={false} onToggle={jest.fn()} testID="chk-unfilled" />
      </ThemeProvider>
    );
    const chk = screen.getByTestId('chk-unfilled');
    expect(chk.props.accessibilityState).toEqual({ checked: false, disabled: false });
  });

  it('C-2: TaskCheckbox exposes accessibilityState.checked=true when checked', async () => {
    await render(
      <ThemeProvider>
        <TaskCheckbox checked={true} onToggle={jest.fn()} testID="chk-filled" />
      </ThemeProvider>
    );
    const chk = screen.getByTestId('chk-filled');
    expect(chk.props.accessibilityState).toEqual({ checked: true, disabled: false });
  });

  it('C-3: TaskCheckbox exposes accessibilityState.disabled=true when disabled', async () => {
    await render(
      <ThemeProvider>
        <TaskCheckbox checked={false} disabled={true} onToggle={jest.fn()} testID="chk-disabled" />
      </ThemeProvider>
    );
    const chk = screen.getByTestId('chk-disabled');
    expect(chk.props.accessibilityState).toEqual({ checked: false, disabled: true });
  });

  // Switch states
  it('C-4: SettingsToggle exposes accessibilityState.checked=false when off', async () => {
    await render(
      <ThemeProvider>
        <SettingsToggle
          label="Notifications"
          value={false}
          onValueChange={jest.fn()}
          testID="toggle-off"
        />
      </ThemeProvider>
    );
    const switchEl = screen.getByTestId('toggle-off-switch');
    expect(switchEl.props.accessibilityState.checked).toBe(false);
  });

  it('C-5: SettingsToggle exposes accessibilityState.checked=true when on', async () => {
    await render(
      <ThemeProvider>
        <SettingsToggle
          label="Notifications"
          value={true}
          onValueChange={jest.fn()}
          testID="toggle-on"
        />
      </ThemeProvider>
    );
    const switchEl = screen.getByTestId('toggle-on-switch');
    expect(switchEl.props.accessibilityState.checked).toBe(true);
  });

  it('C-6: SettingsToggle exposes accessibilityState.disabled=true when disabled', async () => {
    await render(
      <ThemeProvider>
        <SettingsToggle
          label="Notifications"
          value={true}
          disabled={true}
          onValueChange={jest.fn()}
          testID="toggle-disabled"
        />
      </ThemeProvider>
    );
    const switchEl = screen.getByTestId('toggle-disabled-switch');
    expect(switchEl.props.accessibilityState.disabled).toBe(true);
  });

  // Tab states
  it('C-7: PrayerTabBar tabs expose accessibilityState.selected=true for active prayer and false for inactive', async () => {
    await render(
      <ThemeProvider>
        <PrayerTabBar
          tabs={mockTabs}
          selectedPrayer="FAJR"
          onSelectPrayer={jest.fn()}
        />
      </ThemeProvider>
    );
    const fajrTab = screen.getByTestId('prayer-tab-fajr');
    const dhuhrTab = screen.getByTestId('prayer-tab-dhuhr');

    expect(fajrTab.props.accessibilityState).toEqual({ selected: true });
    expect(dhuhrTab.props.accessibilityState).toEqual({ selected: false });
  });

  // Radio state contract (A-24): radio MUST use checked: boolean, NOT selected: boolean
  it('C-8: CustomRecurrenceModal calendar radio options use checked state key and NOT selected (A-24)', async () => {
    const dummyState: any = {
      recurrenceCalendar: 'GREGORIAN',
      customGregorianDraft: {
        frequency: 'WEEKLY',
        interval: 1,
        selectedWeekdays: [1],
      },
      customHijriDraft: {
        frequency: 'MONTHLY_DAY',
        interval: 1,
        day: 1,
      },
    };

    await render(
      <ThemeProvider>
        <CustomRecurrenceModal
          visible={true}
          state={dummyState}
          dispatch={jest.fn()}
          onClose={jest.fn()}
        />
      </ThemeProvider>
    );
    const gregRadio = screen.getByTestId('calendar-gregorian');
    const hijriRadio = screen.getByTestId('calendar-hijri');

    // Gregorian is selected by default
    expect(gregRadio.props.accessibilityRole).toBe('radio');
    expect(gregRadio.props.accessibilityState).toEqual({ checked: true });
    expect(gregRadio.props.accessibilityState.selected).toBeUndefined();

    // Hijri is unselected
    expect(hijriRadio.props.accessibilityRole).toBe('radio');
    expect(hijriRadio.props.accessibilityState).toEqual({ checked: false });
    expect(hijriRadio.props.accessibilityState.selected).toBeUndefined();
  });

  // Expandable / Collapsible controls (A-6 contract)
  it('C-9: CompletedSection header exposes accessibilityState.expanded=true when open', async () => {
    await render(
      <ThemeProvider>
        <CompletedSection
          tasks={[mockTask]}
          collapsed={false}
          onToggleCollapsed={jest.fn()}
        />
      </ThemeProvider>
    );
    const header = screen.getByTestId('completed-section-header');
    expect(header.props.accessibilityState).toEqual({ expanded: true });
  });

  it('C-10: CompletedSection header exposes accessibilityState.expanded=false when collapsed', async () => {
    await render(
      <ThemeProvider>
        <CompletedSection
          tasks={[mockTask]}
          collapsed={true}
          onToggleCollapsed={jest.fn()}
        />
      </ThemeProvider>
    );
    const header = screen.getByTestId('completed-section-header');
    expect(header.props.accessibilityState).toEqual({ expanded: false });
  });

  it('C-11: AnytimeTodaySection header exposes accessibilityState.expanded=true when open', async () => {
    await render(
      <ThemeProvider>
        <AnytimeTodaySection
          tasks={[mockTask]}
          collapsed={false}
          onToggleCollapsed={jest.fn()}
          onComplete={jest.fn()}
        />
      </ThemeProvider>
    );
    const header = screen.getByTestId('anytime-section-header');
    expect(header.props.accessibilityState).toEqual({ expanded: true });
  });

  it('C-12: AnytimeTodaySection header exposes accessibilityState.expanded=false when collapsed', async () => {
    await render(
      <ThemeProvider>
        <AnytimeTodaySection
          tasks={[mockTask]}
          collapsed={true}
          onToggleCollapsed={jest.fn()}
          onComplete={jest.fn()}
        />
      </ThemeProvider>
    );
    const header = screen.getByTestId('anytime-section-header');
    expect(header.props.accessibilityState).toEqual({ expanded: false });
  });

  // Disabled state
  it('C-13: Button exposes accessibilityState.disabled=true when disabled', async () => {
    await render(
      <ThemeProvider>
        <Button title="Submit" disabled={true} onPress={jest.fn()} testID="submit-btn" />
      </ThemeProvider>
    );
    const btn = screen.getByTestId('submit-btn');
    expect(btn.props.accessibilityState.disabled).toBe(true);
  });

  // Screen-Reader Live Regions (§11, A-17)
  it('C-14: SetupRequiredState renders error message with accessibilityLiveRegion="assertive" (A-17)', async () => {
    const onUseLocation = jest.fn().mockResolvedValue(false);
    await render(
      <ThemeProvider>
        <SetupRequiredState onUseCurrentLocation={onUseLocation} />
      </ThemeProvider>
    );

    // Click to trigger error
    const useLocBtn = screen.getByTestId('use-current-location-button');
    fireEvent.press(useLocBtn);

    // Wait for error banner
    const banner = await screen.findByTestId('setup-error-banner');
    expect(banner).toBeTruthy();

    const errorText = screen.getByText('Location permission was denied. You can set your location manually.');
    expect(errorText.props.accessibilityLiveRegion).toBe('assertive');
  });

  it('C-15: JournalSaveStatus exposes accessibilityLiveRegion="polite"', async () => {
    await render(
      <ThemeProvider>
        <JournalSaveStatus state="saved" />
      </ThemeProvider>
    );
    const statusText = screen.getByTestId('journal-save-status');
    expect(statusText.props.accessibilityLiveRegion).toBe('polite');
  });

  it('C-16: PrayerTransitionBanner exposes accessibilityLiveRegion="polite"', async () => {
    await render(
      <ThemeProvider>
        <PrayerTransitionBanner
          transition={{
            newPrayer: 'DHUHR',
            message: 'It is now time for Dhuhr',
          }}
          onViewPress={jest.fn()}
        />
      </ThemeProvider>
    );
    const banner = screen.getByTestId('prayer-transition-banner');
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
  });

  // Static checks for Onboarding radio state (A-13, A-14) and Screen-level live regions (A-17)
  it('C-17: Onboarding theme and calc method selectors carry accessibilityState checked: boolean (A-13, A-14)', () => {
    const src = fs.readFileSync('app/onboarding/index.tsx', 'utf8');
    expect(src).toContain('accessibilityState={{ checked: activeThemeMode ===');
    expect(src).toContain('accessibilityState={{ checked: isSelected }}');
  });

  it('C-18: Screen-level dynamic errors in today.tsx and journal.tsx carry accessibilityLiveRegion="assertive" (A-17)', () => {
    const todaySrc = fs.readFileSync('app/(tabs)/today.tsx', 'utf8');
    expect(todaySrc).toContain('accessibilityLiveRegion="assertive"');

    const journalSrc = fs.readFileSync('app/(tabs)/journal.tsx', 'utf8');
    expect(journalSrc).toContain('accessibilityLiveRegion="assertive"');
  });
});
