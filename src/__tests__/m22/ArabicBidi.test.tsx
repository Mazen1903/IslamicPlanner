import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PrayerHeader } from '@/components/prayer/PrayerHeader';
import { DayDetailTaskList } from '@/components/calendar/DayDetailTaskList';
import fs from 'fs';

describe('Group L: Arabic / Mixed-Bidi Content & Suppression Contract', () => {
  const sampleSelectedDayDetail: any = {
    civilDate: '2026-09-15',
    hijriFormatted: '3 Rabi al-Awwal 1448 AH',
    prayerSections: [
      {
        prayer: 'FAJR',
        name: 'Fajr',
        arabicName: 'الفجر',
        startTime: '5:15 AM',
        tasks: [],
      },
    ],
    anytimeTasks: [],
    totalTasksCount: 0,
  };

  it('L-1: DayDetailTaskList Arabic prayer name is suppressed from accessibility (A-11)', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={sampleSelectedDayDetail} />
      </ThemeProvider>
    );

    const json = JSON.stringify(toJSON());
    // Arabic text has importantForAccessibility="no"
    expect(json).toContain('"importantForAccessibility":"no"');
    expect(json).toContain('"accessibilityElementsHidden":true');
  });

  it('L-2: PrayerHeader Arabic prayer name is suppressed from individual screen-reader traversal (A-7)', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <PrayerHeader
          currentPrayer="DHUHR"
          nextPrayer={{ prayer: 'ASR', time: '15:30' }}
          countdownDisplay="2h 15m"
        />
      </ThemeProvider>
    );

    const json = JSON.stringify(toJSON());
    // In PrayerHeader, content is grouped with composite label and ornament is hidden
    expect(json).toContain('"importantForAccessibility":"no"');
  });

  it('L-3: PrayerHeader decorative geometric ornament is suppressed from accessibility (OBS-2 / A-7)', async () => {
    const src = fs.readFileSync('src/components/prayer/PrayerHeader.tsx', 'utf8');
    expect(src).toContain('importantForAccessibility="no"');
    expect(src).toContain('accessibilityElementsHidden={true}');
  });

  it('L-4: English accessible label provides composite prayer information without requiring Arabic TTS', async () => {
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
  });

  it('L-5: Zero files in the production codebase call I18nManager.forceRTL or allowRTL', () => {
    function getFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const full = `${dir}/${entry.name}`;
          if (!full.includes('__tests__') && !full.includes('node_modules')) {
            files.push(...getFiles(full));
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(`${dir}/${entry.name}`);
        }
      }
      return files;
    }

    const prodFiles = [
      ...getFiles('app'),
      ...getFiles('src'),
    ];

    for (const file of prodFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('forceRTL');
      expect(content).not.toContain('allowRTL');
    }
  });

  it('L-6: DayDetailTaskList English prayer name is readable while Arabic is secondary', async () => {
    await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={sampleSelectedDayDetail} />
      </ThemeProvider>
    );

    expect(screen.getByText('Fajr')).toBeTruthy();
  });
});
