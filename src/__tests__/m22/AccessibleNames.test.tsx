import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { SettingsToggle } from '@/components/settings/SettingsToggle';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { PrayerHeader } from '@/components/prayer/PrayerHeader';
import { TaskCard } from '@/components/task/TaskCard';
import { DayDetailTaskList } from '@/components/calendar/DayDetailTaskList';
import { JournalHistory } from '@/components/journal/JournalHistory';
import { useTodayStore } from '@/stores/useTodayStore';
import { DateTime } from 'luxon';
import type { TaskCardViewModel } from '@/services/types';
import fs from 'fs';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

describe('Group A: Accessible Names & Traversal Noise', () => {
  // A-1
  it('A-1: SettingsToggle suppresses icon and text container from traversal to prevent double announcement', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <SettingsToggle
          label="Notifications"
          value={true}
          onValueChange={jest.fn()}
          icon="bell"
          description="Enable prayer alerts"
        />
      </ThemeProvider>
    );

    const json = JSON.stringify(toJSON());
    expect(json).toContain('"importantForAccessibility":"no"');
    const switchNode = screen.getByRole('switch');
    expect(switchNode.props.accessibilityLabel).toBe('Notifications');
  });

  // A-2
  it('A-2: Icon when decorative={true} renders with role="none", empty label, and importantForAccessibility="no"', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <Icon name="check" size={20} color="#000" decorative={true} />
      </ThemeProvider>
    );

    const json = toJSON() as any;
    expect(json.props.accessibilityRole).toBe('none');
    expect(json.props.accessibilityLabel).toBe('');
    expect(json.props.importantForAccessibility).toBe('no');
  });

  it('A-2b: Icon when decorative={false} renders with role="image" and accessible name', async () => {
    await render(
      <ThemeProvider>
        <Icon name="star" size={20} color="#000" accessibilityLabel="Star rating" />
      </ThemeProvider>
    );

    const icon = screen.getByRole('image');
    expect(icon.props.accessibilityLabel).toBe('Star rating');
  });

  // A-7
  it('A-7: PrayerHeader groups content with composite accessibilityLabel and does NOT use no-hide-descendants on the composite View', async () => {
    await render(
      <ThemeProvider>
        <PrayerHeader
          currentPrayer="DHUHR"
          nextPrayer={{ prayer: 'ASR', time: '4:35 PM' }}
          countdownDisplay="2h 15m"
        />
      </ThemeProvider>
    );

    const header = screen.getByLabelText('Current prayer: Dhuhr. Next: Asr in 2h 15m', {
      includeHiddenElements: true,
    });
    expect(header).toBeTruthy();
    expect(header.props.accessible).toBe(true);
    // The composite grouping container uses accessible={true} + accessibilityLabel only.
    // importantForAccessibility="no-hide-descendants" must NOT be on this same element:
    // combining it with accessible={true} is incoherent — no-hide-descendants marks the
    // element itself AND descendants as unimportant, which contradicts the intent of
    // keeping the composite element focusable. (Lead ruling, M22 consistency fix.)
    // M23 native QA carry-forward:
    // "Verify PrayerHeader composite announcement with VoiceOver and TalkBack on physical devices."
    expect(header.props.importantForAccessibility).not.toBe('no-hide-descendants');
  });

  // A-8
  it('A-8: PrayerHeader Arabic name is suppressed at child level; composite grouping uses accessible={true} without no-hide-descendants', () => {
    const src = fs.readFileSync('src/components/prayer/PrayerHeader.tsx', 'utf8');
    // Child-level suppression of Arabic name is still present and correct:
    expect(src).toContain('importantForAccessibility="no"');
    expect(src).toContain('accessibilityElementsHidden={true}');
    // The composite View itself must NOT use no-hide-descendants alongside accessible={true}:
    // accessible={true} + no-hide-descendants on the same element is incoherent.
    // Verified by absence of the combination: the source has accessible={true} and
    // accessibilityLabel for grouping; no-hide-descendants has been removed from the composite.
    // (Toggle's inner Switch is the one remaining valid no-hide-descendants use — that
    // Switch is intentionally suppressed because the wrapping Pressable owns the semantics.)
    expect(src).not.toContain('importantForAccessibility="no-hide-descendants"');
  });

  // A-9
  it('A-9: SettingsRow passes decorative prop to disclosure chevron', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <SettingsRow label="Account" onPress={jest.fn()} />
      </ThemeProvider>
    );

    const json = JSON.stringify(toJSON());
    // Decorative chevron icon has importantForAccessibility: no
    expect(json).toContain('"importantForAccessibility":"no"');
  });

  // A-10
  it('A-10: TaskCard groups contentContainer with composite label and keeps checkbox outside group', async () => {
    // M23 native QA carry-forward:
    // "Verify TaskCard composite announcement and absence of duplicate descendant
    // announcements with Android TalkBack on a physical/emulated native build."
    const sampleTask: TaskCardViewModel = {
      occurrenceId: 'occ-1',
      taskDefinitionId: 'def-1',
      title: 'Read Quran',
      scheduleType: 'PRAYER_RELATIVE',
      scheduleLabel: 'After Fajr',
      priority: 'IMPORTANT',
      status: 'PENDING',
      estimatedMinutes: 20,
      sortInstant: '2026-09-19T05:15:00Z',
      createdAt: '2026-09-19T05:00:00Z',
      completedAt: null,
      missedAt: null,
      dueAt: null,
      expiresAt: null,
    };

    await render(
      <ThemeProvider>
        <TaskCard task={sampleTask} onComplete={jest.fn()} />
      </ThemeProvider>
    );

    // Checkbox is accessible outside group
    const checkbox = screen.getByTestId('checkbox-occ-1');
    expect(checkbox.props.accessibilityRole).toBe('checkbox');
    expect(checkbox.props.accessibilityLabel).toBe('Complete task: Read Quran');

    // Composite label on content container
    const contentGroup = screen.getByLabelText('Read Quran. Important.');
    expect(contentGroup).toBeTruthy();
    expect(contentGroup.props.accessible).toBe(true);
    expect(contentGroup.props.accessibilityLabel).toBe('Read Quran. Important.');

    // Composite container does NOT use importantForAccessibility="no-hide-descendants"
    // (RN 0.86 defines no-hide-descendants as hiding the view itself AND all descendants)
    expect(contentGroup.props.importantForAccessibility).not.toBe('no-hide-descendants');
  });

  // A-11
  it('A-11: DayDetailTaskList suppresses Arabic name with importantForAccessibility="no"', async () => {
    const sampleDetail: any = {
      civilDate: '2026-09-15',
      hijriFormatted: '3 Rabi al-Awwal 1448 AH',
      prayerSections: [
        { prayer: 'FAJR', name: 'Fajr', arabicName: 'الفجر', startTime: '5:15 AM', tasks: [] },
      ],
      anytimeTasks: [],
      totalTasksCount: 0,
    };

    const { toJSON } = await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={sampleDetail} />
      </ThemeProvider>
    );

    const json = JSON.stringify(toJSON());
    expect(json).toContain('"importantForAccessibility":"no"');
  });

  // A-15
  it('A-15: Onboarding city results have accessible button role and descriptive label', () => {
    const src = fs.readFileSync('app/onboarding/index.tsx', 'utf8');
    expect(src).toContain('accessibilityRole="button"');
    expect(src).toContain('accessibilityLabel={`${city.name}, ${city.countryCode}');
  });

  // A-16
  it('A-16: PrayerTabBar active indicator dot is suppressed from accessibility', () => {
    const src = fs.readFileSync('src/components/prayer/PrayerTabBar.tsx', 'utf8');
    expect(src).toContain('importantForAccessibility="no"');
    expect(src).toContain('accessible={false}');
  });

  // A-21
  it('A-21: JournalHistory back button has accessible label "Back to today\'s entry"', async () => {
    await render(
      <ThemeProvider>
        <JournalHistory
          entries={[]}
          onSelectEntry={jest.fn()}
          onBackToToday={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByLabelText("Back to today's entry")).toBeTruthy();
  });

  // Decorative icon consumer audits
  it('A-22: BottomNavBar tab icons and Add icon have decorative prop', () => {
    const src = fs.readFileSync('src/components/layout/BottomNavBar.tsx', 'utf8');
    expect(src).toContain('decorative');
  });

  it('A-23: DateTimePickerInput calendar and clock icons have decorative prop', () => {
    const src = fs.readFileSync('src/components/task-form/DateTimePickerInput.tsx', 'utf8');
    expect(src).toContain('decorative');
  });

  it('A-24: MoreOptionsSection icons have decorative prop', () => {
    const src = fs.readFileSync('src/components/task-form/MoreOptionsSection.tsx', 'utf8');
    expect(src).toContain('decorative');
  });

  it('A-25: RecurrenceSection repeat icon has decorative prop', () => {
    const src = fs.readFileSync('src/components/task-form/RecurrenceSection.tsx', 'utf8');
    expect(src).toContain('decorative');
  });

  it('A-26: ScheduleModeCards card icons have decorative prop', () => {
    const src = fs.readFileSync('src/components/task-form/ScheduleModeCards.tsx', 'utf8');
    expect(src).toContain('decorative');
  });

  it('A-27: SuccessScreen check icon has decorative prop', () => {
    const src = fs.readFileSync('src/components/task-form/SuccessScreen.tsx', 'utf8');
    expect(src).toContain('decorative');
  });

  it('A-28: TaskCard completed state badge includes "Completed" in composite label', async () => {
    const completedTask: any = {
      occurrenceId: 'occ-2',
      taskId: 'task-2',
      title: 'Morning Dhikr',
      status: 'COMPLETED',
      priority: 'NORMAL',
    };

    await render(
      <ThemeProvider>
        <TaskCard task={completedTask} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Morning Dhikr. Completed.')).toBeTruthy();
  });

  it('A-29: TaskCard missed state badge includes "Missed" in composite label', async () => {
    const missedTask: any = {
      occurrenceId: 'occ-3',
      taskId: 'task-3',
      title: 'Fajr Sunnah',
      status: 'MISSED',
      priority: 'NORMAL',
    };

    await render(
      <ThemeProvider>
        <TaskCard task={missedTask} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Fajr Sunnah. Missed.')).toBeTruthy();
  });

  it('A-30: TaskCard overdue state includes overdue minutes in composite label', async () => {
    const dueAt = '2026-09-15T14:00:00.000Z';
    const expiresAt = '2026-09-15T17:00:00.000Z';
    const now5 = DateTime.fromISO('2026-09-15T14:05:00.000Z');
    useTodayStore.getState().setNowMs(now5.toMillis());

    const overdueTask: any = {
      occurrenceId: 'occ-4',
      taskId: 'task-4',
      title: 'Afternoon Adhkar',
      status: 'PENDING',
      priority: 'NORMAL',
      scheduleType: 'EXACT_TIME',
      scheduleLabel: '2:00 PM',
      dueAt,
      expiresAt,
    };

    await render(
      <ThemeProvider>
        <TaskCard task={overdueTask} />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Afternoon Adhkar. 5 min overdue.')).toBeTruthy();
  });

  it('A-31: SettingsScreenHeader back button has accessible label "Go back"', () => {
    const src = fs.readFileSync('src/components/settings/SettingsScreenHeader.tsx', 'utf8');
    expect(src).toContain('accessibilityLabel="Go back"');
  });

  it('A-32: CalendarHeader navigation buttons have accessible labels "Previous month" and "Next month"', () => {
    const src = fs.readFileSync('src/components/calendar/CalendarHeader.tsx', 'utf8');
    expect(src).toContain('accessibilityLabel="Previous month"');
    expect(src).toContain('accessibilityLabel="Next month"');
  });
});
