import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { CalendarDayCell } from '@/components/calendar/CalendarDayCell';
import { buildCalendarMonthGrid, CalendarDayCellModel } from '@/domain/calendar/calendarGrid';
import { HijriService } from '@/domain/calendar/HijriService';
import fs from 'fs';
import path from 'path';

describe('Group F: Text Scaling Contract', () => {
  const hijriService = new HijriService();
  const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);

  const sampleCell: CalendarDayCellModel = {
    date: '2026-09-15',
    dayNumber: 15,
    hijriDayNumber: 3,
    hijriDate: { year: 1448, month: 3, day: 3 },
    isCurrentMonth: true,
    isCivilToday: false,
    isSelected: false,
    hasTasks: true,
    taskSummary: { total: 3, completed: 1, pending: 2, missed: 0 },
    accessibleLabel: 'Tuesday, September 15, 2026, 3 Rabi al-Awwal 1448 AH, 1 completed, 2 pending',
  };

  it('F-1: CalendarMonthGrid weekday header labels have maxFontSizeMultiplier={2}', async () => {
    await render(
      <ThemeProvider>
        <CalendarMonthGrid grid={grid} onCellTap={jest.fn()} />
      </ThemeProvider>
    );

    const sun = screen.getByText('Sun');
    expect(sun.props.maxFontSizeMultiplier).toBe(2);
    const mon = screen.getByText('Mon');
    expect(mon.props.maxFontSizeMultiplier).toBe(2);
  });

  it('F-2: CalendarDayCell Gregorian day number has maxFontSizeMultiplier={2}', async () => {
    await render(
      <ThemeProvider>
        <CalendarDayCell cell={sampleCell} onPress={jest.fn()} />
      </ThemeProvider>
    );

    const gregorianText = screen.getByText('15');
    expect(gregorianText.props.maxFontSizeMultiplier).toBe(2);
  });

  it('F-3: CalendarDayCell Hijri sub-number has maxFontSizeMultiplier={2}', async () => {
    await render(
      <ThemeProvider>
        <CalendarDayCell cell={sampleCell} onPress={jest.fn()} />
      </ThemeProvider>
    );

    const hijriText = screen.getByText('3');
    expect(hijriText.props.maxFontSizeMultiplier).toBe(2);
  });

  it('F-4: Exactly three approved Text nodes in production codebase use maxFontSizeMultiplier', () => {
    function getFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!full.includes('__tests__') && !full.includes('node_modules')) {
            files.push(...getFiles(full));
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(full);
        }
      }
      return files;
    }

    const prodFiles = [
      ...getFiles(path.resolve('app')),
      ...getFiles(path.resolve('src/components')),
    ];

    let count = 0;
    const locations: string[] = [];
    for (const file of prodFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/maxFontSizeMultiplier/g);
      if (matches) {
        count += matches.length;
        locations.push(`${path.basename(file)}: ${matches.length}`);
      }
    }

    // Exactly 3 authorized instances: CalendarMonthGrid (1), CalendarDayCell (2)
    expect(count).toBe(3);
    expect(locations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('CalendarMonthGrid.tsx: 1'),
        expect.stringContaining('CalendarDayCell.tsx: 2'),
      ])
    );
  });

  it('F-5: Zero production UI files disable font scaling globally with allowFontScaling={false}', () => {
    function getFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const full = path.join(dir, entry.name);
          if (!full.includes('__tests__') && !full.includes('node_modules')) {
            files.push(...getFiles(full));
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(path.join(dir, entry.name));
        }
      }
      return files;
    }

    const prodFiles = [
      ...getFiles(path.resolve('app')),
      ...getFiles(path.resolve('src/components')),
    ].filter((f) => !f.endsWith('Icon.tsx')); // Icon uses vector icon glyphs which can have allowFontScaling=false for glyph fonts

    for (const file of prodFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('allowFontScaling={false}');
    }
  });

  it('F-6: CalendarMonthGrid weekday labels do not contain invalid accessibilityRole="text" (A-12)', async () => {
    await render(
      <ThemeProvider>
        <CalendarMonthGrid grid={grid} onCellTap={jest.fn()} />
      </ThemeProvider>
    );

    const sun = screen.getByText('Sun');
    expect(sun.props.accessibilityRole).toBeUndefined();
  });
});
