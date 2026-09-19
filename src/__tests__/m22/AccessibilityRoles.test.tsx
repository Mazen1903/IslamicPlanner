import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { SettingsSectionHeader } from '@/components/settings/SettingsSectionHeader';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsToggle } from '@/components/settings/SettingsToggle';
import { SettingsScreenHeader } from '@/components/settings/SettingsScreenHeader';
import { TaskCheckbox } from '@/components/task/TaskCheckbox';
import { PrayerTabBar } from '@/components/prayer/PrayerTabBar';
import { buildCalendarMonthGrid } from '@/domain/calendar/calendarGrid';
import { HijriService } from '@/domain/calendar/HijriService';
import fs from 'fs';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

describe('Group B: Accessibility Roles Contract (§6.1)', () => {
  const hijriService = new HijriService();
  const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);

  // B-1
  it('B-1: CalendarMonthGrid weekday labels do not have redundant accessibilityRole="text" (A-12)', async () => {
    await render(
      <ThemeProvider>
        <CalendarMonthGrid grid={grid} onCellTap={jest.fn()} />
      </ThemeProvider>
    );
    const sun = screen.getByText('Sun');
    expect(sun.props.accessibilityRole).toBeUndefined();
  });

  // B-2
  it('B-2: PremiumBadge removes redundant accessibilityRole="text" (A-23)', async () => {
    await render(
      <ThemeProvider>
        <PremiumBadge />
      </ThemeProvider>
    );
    const badge = screen.getByTestId('premium-badge');
    expect(badge.props.accessibilityRole).toBeUndefined();
    expect(badge.props.accessibilityLabel).toBe('Premium feature');
  });

  // B-3
  it('B-3: SettingsSectionHeader carries accessibilityRole="header" on section title (A-18)', async () => {
    await render(
      <ThemeProvider>
        <SettingsSectionHeader title="Prayer Calculation" />
      </ThemeProvider>
    );
    const header = screen.getByRole('header');
    expect(header).toBeTruthy();
    expect(screen.getByText('PRAYER CALCULATION').props.accessibilityRole).toBe('header');
  });

  // B-4
  it('B-4: SettingsToggle Switch carries accessibilityRole="switch"', async () => {
    await render(
      <ThemeProvider>
        <SettingsToggle
          label="Dark Mode"
          value={true}
          onValueChange={jest.fn()}
        />
      </ThemeProvider>
    );
    expect(screen.getByRole('switch')).toBeTruthy();
  });

  // B-5
  it('B-5: SettingsRow Pressable carries accessibilityRole="button"', async () => {
    await render(
      <ThemeProvider>
        <SettingsRow label="Account" onPress={jest.fn()} />
      </ThemeProvider>
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  // B-6
  it('B-6: SettingsScreenHeader back Pressable carries accessibilityRole="button"', async () => {
    await render(
      <ThemeProvider>
        <SettingsScreenHeader title="General" onBack={jest.fn()} />
      </ThemeProvider>
    );
    const backBtn = screen.getByRole('button');
    expect(backBtn).toBeTruthy();
    expect(backBtn.props.accessibilityLabel).toBe('Go back');
  });

  // B-7
  it('B-7: JournalDeleteDialog title carries accessibilityRole="header"', () => {
    const src = fs.readFileSync('src/components/journal/JournalDeleteDialog.tsx', 'utf8');
    expect(src).toContain('accessibilityRole="header"');
  });

  // B-8
  it('B-8: JournalPrivacySheet title carries accessibilityRole="header"', () => {
    const src = fs.readFileSync('src/components/journal/JournalPrivacySheet.tsx', 'utf8');
    expect(src).toContain('accessibilityRole="header"');
  });

  // B-9
  it('B-9: CustomRecurrenceModal title carries accessibilityRole="header"', () => {
    const src = fs.readFileSync('src/components/task-form/CustomRecurrenceModal.tsx', 'utf8');
    expect(src).toContain('accessibilityRole="header"');
  });

  // B-10
  it('B-10: CustomRecurrenceModal calendar switcher Pressables carry accessibilityRole="radio" (A-24)', () => {
    const src = fs.readFileSync('src/components/task-form/CustomRecurrenceModal.tsx', 'utf8');
    expect(src).toContain('accessibilityRole="radio"');
  });

  // B-11
  it('B-11: Onboarding theme selector Pressables carry accessibilityRole="radio" (A-13)', () => {
    const src = fs.readFileSync('app/onboarding/index.tsx', 'utf8');
    expect(src).toContain('testID="theme-option-system"');
    expect(src).toContain('accessibilityRole="radio"');
    expect(src).toContain('accessibilityLabel="System theme"');
  });

  // B-12
  it('B-12: Onboarding calculation method selector Pressables carry accessibilityRole="radio" (A-14)', () => {
    const src = fs.readFileSync('app/onboarding/index.tsx', 'utf8');
    expect(src).toContain('calc-method-option-');
    expect(src).toContain('accessibilityRole="radio"');
    expect(src).toContain('accessibilityLabel={CALCULATION_METHOD_LABELS[methodKey].label}');
  });

  // B-13
  it('B-13: Onboarding city results carry accessibilityRole="button" (A-15)', () => {
    const src = fs.readFileSync('app/onboarding/index.tsx', 'utf8');
    expect(src).toContain('city-result-');
    expect(src).toContain('accessibilityRole="button"');
  });

  // B-14
  it('B-14: TaskCheckbox carries accessibilityRole="checkbox"', async () => {
    await render(
      <ThemeProvider>
        <TaskCheckbox checked={false} disabled={false} onToggle={jest.fn()} accessibilityLabel="Complete task" />
      </ThemeProvider>
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeTruthy();
    expect(checkbox.props.accessibilityRole).toBe('checkbox');
  });

  // B-15
  it('B-15: PrayerTabBar container has tablist role and child tabs have tab role', async () => {
    const sampleTabs = [
      { prayer: 'FAJR', name: 'Fajr', startTime: '5:15 AM', temporalState: 'CURRENT', taskCount: 0 },
    ];
    await render(
      <ThemeProvider>
        <PrayerTabBar tabs={sampleTabs as any} selectedPrayer="FAJR" onSelectPrayer={jest.fn()} />
      </ThemeProvider>
    );

    const tablist = screen.getByTestId('prayer-tab-bar');
    expect(tablist.props.accessibilityRole).toBe('tablist');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(1);
  });

  // B-16
  it('B-16: CalendarHeader title carries header role and today button carries button role', async () => {
    await render(
      <ThemeProvider>
        <CalendarHeader
          gregorianTitle="September 2026"
          hijriHeaderSpan="Rabi al-Awwal 1448 AH"
          onPreviousMonth={jest.fn()}
          onNextMonth={jest.fn()}
          onTodayPress={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('header')).toBeTruthy();
    expect(screen.getByTestId('calendar-today-button')).toBeTruthy();
    expect(screen.getByTestId('calendar-today-button').props.accessibilityRole).toBe('button');
  });
});
