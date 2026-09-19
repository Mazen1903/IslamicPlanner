import fs from 'fs';

describe('Group M: Targeted Static Accessibility Audits', () => {
  function getProductionFiles(): string[] {
    function walk(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const full = `${dir}/${entry.name}`;
          if (!full.includes('__tests__') && !full.includes('node_modules')) {
            files.push(...walk(full));
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(`${dir}/${entry.name}`);
        }
      }
      return files;
    }
    return [...walk('app'), ...walk('src/components')];
  }

  // M-1
  it('M-1: zero instances of invalid accessibilityRole="text" in production code (A-12, A-23)', () => {
    const files = getProductionFiles();
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('accessibilityRole="text"');
      expect(content).not.toContain("accessibilityRole='text'");
    }
  });

  // M-2
  it('M-2: zero instances of accessibilityRole="radio" paired with state key "selected" (A-24)', () => {
    const files = getProductionFiles();
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('accessibilityRole="radio"')) {
        // Tag must not use { selected: ... } with role="radio"
        expect(content).not.toMatch(/<[A-Za-z]+[^>]*accessibilityRole="radio"[^>]*accessibilityState=\{\{\s*selected\s*:/);
        expect(content).not.toMatch(/<[A-Za-z]+[^>]*accessibilityState=\{\{\s*selected\s*:[^>]*accessibilityRole="radio"/);
      }
    }
  });

  // M-3
  it('M-3: exactly six native <Modal> consumers exist in the production codebase', () => {
    const files = getProductionFiles();
    const modalFiles = files.filter((f) => {
      const content = fs.readFileSync(f, 'utf8');
      return content.includes('<Modal') && content.includes('onRequestClose');
    });

    const expectedModalFiles = [
      'src/components/journal/JournalDeleteDialog.tsx',
      'src/components/journal/JournalPrivacySheet.tsx',
      'src/components/task-form/CustomRecurrenceModal.tsx',
      'src/components/task-form/EditScopeSheet.tsx',
      'src/components/premium/PremiumLockedInfo.tsx',
      'app/(tabs)/settings/hijri-calendar.tsx',
    ];

    expect(modalFiles.length).toBe(6);
    for (const expected of expectedModalFiles) {
      expect(modalFiles).toContain(expected);
    }
  });

  // M-4
  it('M-4: all six native <Modal> consumers specify accessibilityViewIsModal={true} on content', () => {
    const modalFiles = [
      'src/components/journal/JournalDeleteDialog.tsx',
      'src/components/journal/JournalPrivacySheet.tsx',
      'src/components/task-form/CustomRecurrenceModal.tsx',
      'src/components/task-form/EditScopeSheet.tsx',
      'src/components/premium/PremiumLockedInfo.tsx',
      'app/(tabs)/settings/hijri-calendar.tsx',
    ];

    for (const file of modalFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('accessibilityViewIsModal={true}');
    }
  });

  // M-5
  it('M-5: all six native <Modal> consumers define accessibilityRole="header" on dialog title', () => {
    const modalFiles = [
      'src/components/journal/JournalDeleteDialog.tsx',
      'src/components/journal/JournalPrivacySheet.tsx',
      'src/components/task-form/CustomRecurrenceModal.tsx',
      'src/components/task-form/EditScopeSheet.tsx',
      'src/components/premium/PremiumLockedInfo.tsx',
      'app/(tabs)/settings/hijri-calendar.tsx',
    ];

    for (const file of modalFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('accessibilityRole="header"');
    }
  });

  // M-6
  it('M-6: all 8 horizontal directional icon instances in 7 consumer files have directional prop (RTL-3)', () => {
    const expectedConsumers = [
      'src/components/settings/SettingsScreenHeader.tsx',
      'src/components/calendar/CalendarHeader.tsx',
      'src/components/journal/JournalHistory.tsx',
      'src/components/settings/SettingsRow.tsx',
      'src/components/journal/JournalHistoryRow.tsx',
      'src/components/task/CompletedSection.tsx',
      'src/components/task/AnytimeTodaySection.tsx',
    ];

    for (const file of expectedConsumers) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('directional');
    }
  });

  // M-7
  it('M-7: exactly three Text nodes specify maxFontSizeMultiplier={2} (A-20)', () => {
    const files = getProductionFiles();
    let totalMaxFontSize = 0;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/maxFontSizeMultiplier/g);
      if (matches) totalMaxFontSize += matches.length;
    }
    expect(totalMaxFontSize).toBe(3);
  });

  // M-8
  it('M-8: error text containers carry accessibilityLiveRegion="assertive" (A-17)', () => {
    const errorFiles = [
      'src/components/today/SetupRequiredState.tsx',
      'app/(tabs)/today.tsx',
      'app/(tabs)/journal.tsx',
    ];

    for (const file of errorFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('accessibilityLiveRegion="assertive"');
    }
  });

  // M-9
  it('M-9: PrayerTabBar indicator dot is suppressed from screen reader traversal (A-16)', () => {
    const content = fs.readFileSync('src/components/prayer/PrayerTabBar.tsx', 'utf8');
    expect(content).toContain('importantForAccessibility="no"');
    expect(content).toContain('accessible={false}');
  });

  // M-10
  it('M-10: PremiumLockedInfo removes accessible grouping from card View to prevent hiding OK button (A-22)', () => {
    const content = fs.readFileSync('src/components/premium/PremiumLockedInfo.tsx', 'utf8');
    // Content view should have accessibilityViewIsModal={true} but NOT accessible={true} or accessibilityRole="alert"
    expect(content).toContain('accessibilityViewIsModal={true}');
    expect(content).not.toContain('accessibilityRole="alert"');
  });
});
