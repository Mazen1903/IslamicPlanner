import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PrayerHeader } from '@/components/prayer/PrayerHeader';
import { DayDetailTaskList } from '@/components/calendar/DayDetailTaskList';
import fs from 'fs';

describe('Group L: Arabic Suppression & Pure English UI Contract', () => {
  const sampleSelectedDayDetail: any = {
    civilDate: '2026-09-15',
    hijriFormatted: '3 Rabi al-Awwal 1448 AH',
    prayerSections: [
      {
        prayer: 'FAJR',
        name: 'Fajr',
        startTime: '5:15 AM',
        tasks: [],
      },
    ],
    anytimeTasks: [],
    totalTasksCount: 0,
  };

  it('L-1: DayDetailTaskList renders cleanly with zero Arabic script', async () => {
    const { toJSON } = await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={sampleSelectedDayDetail} />
      </ThemeProvider>
    );

    const json = JSON.stringify(toJSON());
    expect(/[\u0600-\u06FF\uFD00-\uFDFF\uFE70-\uFEFE]/.test(json)).toBe(false);
  });

  it('L-2: PrayerHeader renders cleanly with zero Arabic script', async () => {
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
    expect(/[\u0600-\u06FF\uFD00-\uFDFF\uFE70-\uFEFE]/.test(json)).toBe(false);
  });

  it('L-3: Zero files in the production codebase contain Arabic script characters', () => {
    const ARABIC_REGEX = /[\u0600-\u06FF\uFD00-\uFDFF\uFE70-\uFEFE]/;

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
      ...getFiles('widgets'),
    ];

    for (const file of prodFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const hasArabic = ARABIC_REGEX.test(content);
      expect({ file, hasArabic }).toEqual({ file, hasArabic: false });
    }
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
      ...getFiles('widgets'),
    ];

    for (const file of prodFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('forceRTL');
      expect(content).not.toContain('allowRTL');
    }
  });

  it('L-6: DayDetailTaskList English prayer name is readable', async () => {
    await render(
      <ThemeProvider>
        <DayDetailTaskList selectedDayDetail={sampleSelectedDayDetail} />
      </ThemeProvider>
    );

    expect(screen.getByText('Fajr')).toBeTruthy();
  });
});
