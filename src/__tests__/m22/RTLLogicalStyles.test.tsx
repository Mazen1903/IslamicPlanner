import fs from 'fs';
import path from 'path';

describe('Group H: RTL Logical Styles Contract (RTL-1 & RTL-2)', () => {
  function readSource(relPath: string): string {
    return fs.readFileSync(path.resolve(relPath), 'utf8');
  }

  // 1. Button.tsx
  it('H-1: Button.tsx uses marginStart and marginEnd for icon spacing', () => {
    const src = readSource('src/components/common/Button.tsx');
    expect(src).toContain('marginStart');
    expect(src).toContain('marginEnd');
    expect(src).not.toMatch(/iconPosition === 'left'\s*\?\s*\{\s*marginRight/);
  });

  // 2. Toggle.tsx
  it('H-2: Toggle.tsx uses marginEnd on textContainer', () => {
    const src = readSource('src/components/common/Toggle.tsx');
    expect(src).toContain('marginEnd: 16');
    expect(src).not.toContain('marginRight: 16');
  });

  // 3. SettingsRow.tsx
  it('H-3: SettingsRow.tsx uses marginEnd on iconWrapper and value text', () => {
    const src = readSource('src/components/settings/SettingsRow.tsx');
    expect(src).toContain('marginEnd: spacing.md');
    expect(src).not.toContain('marginRight: spacing.md');
  });

  // 4. SettingsInfoCard.tsx
  it('H-4: SettingsInfoCard.tsx uses marginEnd on icon', () => {
    const src = readSource('src/components/settings/SettingsInfoCard.tsx');
    expect(src).toContain('marginEnd: spacing.sm');
    expect(src).not.toContain('marginRight: spacing.sm');
  });

  // 5. SettingsToggle.tsx
  it('H-5: SettingsToggle.tsx uses marginEnd on icon and paddingEnd for row container', () => {
    const src = readSource('src/components/settings/SettingsToggle.tsx');
    expect(src).toContain('marginEnd: spacing.md');
    expect(src).toContain('paddingEnd: 12');
    expect(src).not.toContain('marginRight: spacing.md');
    expect(src).not.toContain('paddingRight: 12');
  });

  // 6. SettingsSelectOption.tsx
  it('H-6: SettingsSelectOption.tsx uses paddingEnd', () => {
    const src = readSource('src/components/settings/SettingsSelectOption.tsx');
    expect(src).toContain('paddingEnd: 12');
    expect(src).not.toContain('paddingRight: 12');
  });

  // 7. PremiumLockedInfo.tsx
  it('H-7: PremiumLockedInfo.tsx uses marginEnd on icon container', () => {
    const src = readSource('src/components/premium/PremiumLockedInfo.tsx');
    expect(src).toContain('marginEnd: spacing.sm');
    expect(src).not.toContain('marginRight: spacing.sm');
  });

  // 8. PremiumBadge.tsx
  it('H-8: PremiumBadge.tsx uses marginEnd on lock icon', () => {
    const src = readSource('src/components/premium/PremiumBadge.tsx');
    expect(src).toContain('marginEnd: 3');
    expect(src).not.toContain('marginRight: 3');
  });

  // 9. PrayerHeader.tsx
  it('H-9: PrayerHeader.tsx uses marginStart and marginEnd', () => {
    const src = readSource('src/components/prayer/PrayerHeader.tsx');
    expect(src).toContain('marginStart: spacing.md');
    expect(src).toContain('marginEnd: spacing.xs');
    expect(src).not.toContain('marginLeft: spacing.md');
    expect(src).not.toContain('marginRight: spacing.xs');
  });

  // 10. PrayerTransitionBanner.tsx
  it('H-10: PrayerTransitionBanner.tsx uses marginEnd: 12 and marginStart: 8', () => {
    const src = readSource('src/components/prayer/PrayerTransitionBanner.tsx');
    expect(src).toContain('marginEnd: 12');
    expect(src).toContain('marginStart: 8');
  });

  // 11. TaskCard.tsx
  it('H-11: TaskCard.tsx uses marginStart on contentContainer and marginEnd on clock icon', () => {
    const src = readSource('src/components/task/TaskCard.tsx');
    expect(src).toContain('marginStart: 8');
    expect(src).toContain('marginEnd: 4');
  });

  // 12. AnytimeTodaySection.tsx
  it('H-12: AnytimeTodaySection.tsx uses marginEnd on sun icon', () => {
    const src = readSource('src/components/task/AnytimeTodaySection.tsx');
    expect(src).toContain('marginEnd: 6');
  });

  // 13. JournalHeader.tsx
  it('H-13: JournalHeader.tsx uses marginStart', () => {
    const src = readSource('src/components/journal/JournalHeader.tsx');
    expect(src).toContain('marginStart: spacing.xs');
    expect(src).toContain('marginStart: 4');
  });

  // 14. JournalHistory.tsx
  it('H-14: JournalHistory.tsx uses marginStart', () => {
    const src = readSource('src/components/journal/JournalHistory.tsx');
    expect(src).toContain('marginStart: spacing.xs');
  });

  // 15. JournalDeleteDialog.tsx
  it('H-15: JournalDeleteDialog.tsx uses marginEnd on cancel button', () => {
    const src = readSource('src/components/journal/JournalDeleteDialog.tsx');
    expect(src).toContain('marginEnd: spacing.sm');
  });

  // 16. JournalPrivacySheet.tsx
  it('H-16: JournalPrivacySheet.tsx uses marginStart and paddingEnd', () => {
    const src = readSource('src/components/journal/JournalPrivacySheet.tsx');
    expect(src).toContain('marginStart: spacing.md');
    expect(src).toContain('paddingEnd: 12');
  });

  // 17. ReflectionSection.tsx
  it('H-17: ReflectionSection.tsx uses marginStart', () => {
    const src = readSource('src/components/journal/ReflectionSection.tsx');
    expect(src).toContain('marginStart: spacing.sm');
  });

  // 18. DayDetailTaskList.tsx
  it('H-18: DayDetailTaskList.tsx uses marginStart on Arabic text', () => {
    const src = readSource('src/components/calendar/DayDetailTaskList.tsx');
    expect(src).toContain('marginStart: spacing.xs');
  });

  // 19. UpcomingSection.tsx
  it('H-19: UpcomingSection.tsx uses marginEnd', () => {
    const src = readSource('src/components/calendar/UpcomingSection.tsx');
    expect(src).toContain('marginEnd: spacing.xs');
    expect(src).toContain('marginEnd: 4');
  });

  // 20. DateTimePickerInput.tsx
  it('H-20: DateTimePickerInput.tsx uses marginEnd on icons', () => {
    const src = readSource('src/components/task-form/DateTimePickerInput.tsx');
    expect(src).toContain('marginEnd: spacing.sm');
  });

  // 21. MoreOptionsSection.tsx
  it('H-21: MoreOptionsSection.tsx uses marginEnd and marginStart', () => {
    const src = readSource('src/components/task-form/MoreOptionsSection.tsx');
    expect(src).toContain('marginEnd: spacing.sm');
    expect(src).toContain('marginEnd: spacing.xs');
    expect(src).toContain('marginStart: 4');
  });

  // 22. RecurrenceSection.tsx
  it('H-22: RecurrenceSection.tsx uses marginEnd', () => {
    const src = readSource('src/components/task-form/RecurrenceSection.tsx');
    expect(src).toContain('marginEnd: spacing.sm');
  });

  // 23. ScheduleModeCards.tsx
  it('H-23: ScheduleModeCards.tsx uses marginStart and marginEnd', () => {
    const src = readSource('src/components/task-form/ScheduleModeCards.tsx');
    expect(src).toContain('marginStart: spacing.sm');
    expect(src).toContain('marginEnd: spacing.sm');
    expect(src).toContain('marginEnd: spacing.xs');
  });

  // 24. SuccessScreen.tsx
  it('H-24: SuccessScreen.tsx uses marginEnd: 6', () => {
    const src = readSource('src/components/task-form/SuccessScreen.tsx');
    expect(src).toContain('marginEnd: 6');
  });

  // 25. TaskFormScreen.tsx
  it('H-25: TaskFormScreen.tsx uses marginStart on error icon spacing', () => {
    const src = readSource('src/components/task-form/TaskFormScreen.tsx');
    expect(src).toContain('marginStart: spacing.xs');
  });

  // 26. SetupRequiredState.tsx & app routes
  it('H-26: SetupRequiredState.tsx and settings screens use logical margins', () => {
    const setupSrc = readSource('src/components/today/SetupRequiredState.tsx');
    expect(setupSrc).toContain('marginEnd: spacing.xs');
    expect(setupSrc).toContain('marginStart: spacing.xs');

    const journalScreenSrc = readSource('app/(tabs)/journal.tsx');
    expect(journalScreenSrc).toContain('marginStart: spacing.xs');
    expect(journalScreenSrc).toContain('marginStart: 12');
  });
});
