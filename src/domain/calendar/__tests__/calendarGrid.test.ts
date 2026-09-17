import {
  buildCalendarMonthGrid,
  buildHijriHeaderSpan,
  buildCellAccessibleLabel,
  type TaskDaySummary,
} from '../calendarGrid';
import { HijriService } from '../HijriService';

describe('CalendarGrid (M14 §15, §8, §9, §16)', () => {
  const hijriService = new HijriService();

  describe('Grid Row Sizing (4, 5, 6 rows)', () => {
    it('generates 4 rows (28 cells) for February 2026 (starts on Sunday, 28 days)', () => {
      // 2026-02-01 is a Sunday (weekday % 7 = 0)
      const grid = buildCalendarMonthGrid(2026, 2, '2026-02-01', '2026-02-01', hijriService);
      expect(grid.rowCount).toBe(4);
      expect(grid.totalCells).toBe(28);
      expect(grid.cells).toHaveLength(28);

      // Cell 0 is 2026-02-01
      expect(grid.cells[0].date).toBe('2026-02-01');
      expect(grid.cells[0].isCurrentMonth).toBe(true);

      // Cell 27 is 2026-02-28
      expect(grid.cells[27].date).toBe('2026-02-28');
      expect(grid.cells[27].isCurrentMonth).toBe(true);
    });

    it('generates 5 rows (35 cells) for September 2026 (starts on Tuesday, 30 days)', () => {
      // 2026-09-01 is Tuesday (leading fillers = 2)
      // totalDays = 2 + 30 = 32 <= 35 -> 5 rows
      const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);
      expect(grid.rowCount).toBe(5);
      expect(grid.totalCells).toBe(35);
      expect(grid.cells).toHaveLength(35);

      // Leading fillers: Aug 30 (Sun), Aug 31 (Mon)
      expect(grid.cells[0].date).toBe('2026-08-30');
      expect(grid.cells[0].isCurrentMonth).toBe(false);
      expect(grid.cells[1].date).toBe('2026-08-31');
      expect(grid.cells[1].isCurrentMonth).toBe(false);

      // In-month: Sep 1 is index 2
      expect(grid.cells[2].date).toBe('2026-09-01');
      expect(grid.cells[2].isCurrentMonth).toBe(true);

      // Sep 30 is index 31
      expect(grid.cells[31].date).toBe('2026-09-30');
      expect(grid.cells[31].isCurrentMonth).toBe(true);

      // Trailing fillers: Oct 1, 2, 3
      expect(grid.cells[32].date).toBe('2026-10-01');
      expect(grid.cells[32].isCurrentMonth).toBe(false);
      expect(grid.cells[34].date).toBe('2026-10-03');
      expect(grid.cells[34].isCurrentMonth).toBe(false);
    });

    it('generates 6 rows (42 cells) for August 2026 (starts on Saturday, 31 days)', () => {
      // 2026-08-01 is Saturday (leading fillers = 6)
      // totalDays = 6 + 31 = 37 > 35 -> 6 rows
      const grid = buildCalendarMonthGrid(2026, 8, '2026-08-15', '2026-08-15', hijriService);
      expect(grid.rowCount).toBe(6);
      expect(grid.totalCells).toBe(42);
      expect(grid.cells).toHaveLength(42);

      // Leading fillers: July 26 to July 31
      expect(grid.cells[0].date).toBe('2026-07-26');
      expect(grid.cells[0].isCurrentMonth).toBe(false);
      expect(grid.cells[5].date).toBe('2026-07-31');
      expect(grid.cells[5].isCurrentMonth).toBe(false);

      // First day of August is cell 6
      expect(grid.cells[6].date).toBe('2026-08-01');
      expect(grid.cells[6].isCurrentMonth).toBe(true);

      // Last day of August is cell 36 (Aug 31)
      expect(grid.cells[36].date).toBe('2026-08-31');
      expect(grid.cells[36].isCurrentMonth).toBe(true);

      // Trailing fillers: Sep 1 to Sep 5
      expect(grid.cells[37].date).toBe('2026-09-01');
      expect(grid.cells[37].isCurrentMonth).toBe(false);
      expect(grid.cells[41].date).toBe('2026-09-05');
      expect(grid.cells[41].isCurrentMonth).toBe(false);
    });
  });

  describe('Sunday-First Layout Invariant', () => {
    it('ensures column 0 is always Sunday for every row', () => {
      const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);
      for (let r = 0; r < grid.rowCount; r++) {
        const sundayCell = grid.cells[r * 7];
        const dayOfWeek = new Date(sundayCell.date + 'T12:00:00Z').getUTCDay();
        expect(dayOfWeek).toBe(0); // 0 = Sunday
      }
    });
  });

  describe('Filler Cell Invariants (M14 §8)', () => {
    it('never assigns hasTasks = true to adjacent-month filler cells even if task map has data for that date', () => {
      const tasksMap = new Map<string, TaskDaySummary>();
      // August 31 has tasks, but when viewing September, August 31 is a filler cell
      tasksMap.set('2026-08-31', { total: 5, completed: 2, pending: 3, missed: 0 });
      tasksMap.set('2026-09-15', { total: 2, completed: 1, pending: 1, missed: 0 });

      const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService, undefined, tasksMap);

      // Cell 1 is 2026-08-31 (filler)
      expect(grid.cells[1].date).toBe('2026-08-31');
      expect(grid.cells[1].isCurrentMonth).toBe(false);
      expect(grid.cells[1].hasTasks).toBe(false); // MUST BE FALSE

      // Cell for Sep 15 (in-month)
      const sep15Cell = grid.cells.find(c => c.date === '2026-09-15')!;
      expect(sep15Cell.isCurrentMonth).toBe(true);
      expect(sep15Cell.hasTasks).toBe(true);
    });

    it('derives valid Hijri date for filler cells', () => {
      const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);
      // Filler cell
      const fillerCell = grid.cells[0];
      expect(fillerCell.isCurrentMonth).toBe(false);
      expect(fillerCell.hijriDate).toBeDefined();
      expect(fillerCell.hijriDayNumber).toBeGreaterThanOrEqual(1);
      expect(fillerCell.hijriDayNumber).toBeLessThanOrEqual(30);
    });
  });

  describe('Hijri Header Span (M14 §9)', () => {
    it('derives header span strictly from Gregorian monthStart through monthEnd, ignoring filler cells', () => {
      // For September 2026: 2026-09-01 to 2026-09-30
      const span = buildHijriHeaderSpan('2026-09-01', '2026-09-30', hijriService);
      expect(span).toBeTruthy();
      // Leading filler Aug 30 is Safar, but header span must NOT mention Safar if Sept 1 is Rabi al-Awwal
      const sep1Hijri = hijriService.toEffectiveHijri('2026-09-01');
      const sep30Hijri = hijriService.toEffectiveHijri('2026-09-30');
      expect(span).toContain(String(sep1Hijri.year));
      expect(span).toContain(String(sep30Hijri.year));
    });
  });

  describe('Accessibility Metadata (M14 §16)', () => {
    it('produces descriptive accessible label with Gregorian, Hijri, Today, Selected, and task details', () => {
      const label = buildCellAccessibleLabel(
        '2026-09-15',
        { year: 1448, month: 3, day: 4 },
        true,
        true,
        true,
        { total: 3, completed: 1, pending: 2, missed: 0 }
      );

      expect(label).toContain('Today');
      expect(label).toContain('Selected');
      expect(label).toContain('September 15, 2026');
      expect(label).toContain('4 Rabi al-Awwal 1448 AH');
      expect(label).toContain('3 tasks: 1 completed, 2 pending');
    });

    it('indicates No tasks when total is 0', () => {
      const label = buildCellAccessibleLabel(
        '2026-09-16',
        { year: 1448, month: 3, day: 5 },
        true,
        false,
        false,
        { total: 0, completed: 0, pending: 0, missed: 0 }
      );

      expect(label).toContain('No tasks');
      expect(label).not.toContain('Today');
      expect(label).not.toContain('Selected');
    });

    it('indicates Adjacent month for filler cells without task details', () => {
      const label = buildCellAccessibleLabel(
        '2026-08-31',
        { year: 1448, month: 2, day: 29 },
        false,
        false,
        false,
        { total: 0, completed: 0, pending: 0, missed: 0 }
      );

      expect(label).toContain('Adjacent month');
      expect(label).not.toContain('tasks');
    });
  });
});
