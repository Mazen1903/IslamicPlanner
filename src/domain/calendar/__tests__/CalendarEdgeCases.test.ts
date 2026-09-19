import {
  buildCalendarMonthGrid,
  type TaskDaySummary,
} from '../calendarGrid';
import { HijriService } from '../HijriService';
import type { HijriAdjustmentConfig } from '../types';

describe('CalendarEdgeCases (CAL-01 to CAL-08)', () => {
  const hijriService = new HijriService();

  it('CAL-01: (UNIT) February in non-leap year: 28-day grid; no Feb 29 cell', () => {
    // 2025 is a non-leap year
    const grid = buildCalendarMonthGrid(2025, 2, '2025-02-15', '2025-02-15', hijriService);
    const inMonthCells = grid.cells.filter(c => c.isCurrentMonth);

    expect(inMonthCells).toHaveLength(28);
    expect(inMonthCells[0].date).toBe('2025-02-01');
    expect(inMonthCells[27].date).toBe('2025-02-28');

    const feb29InMonth = grid.cells.find(c => c.isCurrentMonth && c.date.endsWith('-02-29'));
    expect(feb29InMonth).toBeUndefined();
  });

  it('CAL-02: (UNIT) February in leap year: 29-day grid; Feb 29 cell present', () => {
    // 2024 is a leap year
    const grid = buildCalendarMonthGrid(2024, 2, '2024-02-15', '2024-02-15', hijriService);
    const inMonthCells = grid.cells.filter(c => c.isCurrentMonth);

    expect(inMonthCells).toHaveLength(29);
    expect(inMonthCells[0].date).toBe('2024-02-01');
    expect(inMonthCells[28].date).toBe('2024-02-29');

    const feb29Cell = grid.cells.find(c => c.date === '2024-02-29');
    expect(feb29Cell).toBeDefined();
    expect(feb29Cell!.isCurrentMonth).toBe(true);
    expect(feb29Cell!.dayNumber).toBe(29);
  });

  it('CAL-03: (UNIT) Month requiring 6-row grid (42 cells): grid cell count correct', () => {
    // August 2026 starts on Saturday (leading filler count = 6) + 31 days = 37 days > 35 -> 6 rows (42 cells)
    const grid = buildCalendarMonthGrid(2026, 8, '2026-08-15', '2026-08-15', hijriService);

    expect(grid.rowCount).toBe(6);
    expect(grid.totalCells).toBe(42);
    expect(grid.cells).toHaveLength(42);

    // Verify filler counts
    const leadingFillers = grid.cells.filter(c => !c.isCurrentMonth && c.date < '2026-08-01');
    const trailingFillers = grid.cells.filter(c => !c.isCurrentMonth && c.date > '2026-08-31');
    expect(leadingFillers).toHaveLength(6);
    expect(trailingFillers).toHaveLength(5);
    expect(leadingFillers.length + 31 + trailingFillers.length).toBe(42);
  });

  it('CAL-04: (UNIT) December -> January navigation: planningDayKey correct for Jan 1', () => {
    const decGrid = buildCalendarMonthGrid(2026, 12, '2026-12-15', '2026-12-15', hijriService);
    expect(decGrid.monthStart).toBe('2026-12-01');
    expect(decGrid.monthEnd).toBe('2026-12-31');

    // Navigate to next month (January 2027)
    const janGrid = buildCalendarMonthGrid(2027, 1, '2027-01-01', '2027-01-01', hijriService);
    expect(janGrid.year).toBe(2027);
    expect(janGrid.month).toBe(1);
    expect(janGrid.monthStart).toBe('2027-01-01');
    expect(janGrid.monthEnd).toBe('2027-01-31');

    const jan1Cell = janGrid.cells.find(c => c.date === '2027-01-01');
    expect(jan1Cell).toBeDefined();
    expect(jan1Cell!.isCurrentMonth).toBe(true);
    expect(jan1Cell!.dayNumber).toBe(1);
    expect(jan1Cell!.isCivilToday).toBe(true);
  });

  it('CAL-05: (UNIT) Hijri loader failure: calendarGrid falls back to base Hijri without crash', () => {
    // Failing loader simulation where adjustmentConfig is malformed or throws
    const malformedConfig = {
      globalAdjustment: 0,
      overrides: new Map(),
    } as unknown as HijriAdjustmentConfig;

    // Even if config loader fails or is absent, buildCalendarMonthGrid executes smoothly
    expect(() => {
      const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService, malformedConfig);
      expect(grid.cells).toHaveLength(35);
      expect(grid.hijriHeaderSpan).toContain('1448');
      expect(grid.cells[0].hijriDate).toBeDefined();
      expect(grid.cells[0].hijriDate.year).toBeGreaterThan(1400);
    }).not.toThrow();
  });

  it('CAL-06: (UNIT) Hijri adjustment +/-2 boundary: effective dates correct; no overflow', () => {
    const baseDate = '2026-09-15';
    const unadjusted = hijriService.toEffectiveHijri(baseDate);

    // Test +2 boundary
    const plus2Config: HijriAdjustmentConfig = { globalAdjustment: 2, monthOverrides: new Map() };
    const plus2 = hijriService.toEffectiveHijri(baseDate, plus2Config);

    // Test -2 boundary
    const minus2Config: HijriAdjustmentConfig = { globalAdjustment: -2, monthOverrides: new Map() };
    const minus2 = hijriService.toEffectiveHijri(baseDate, minus2Config);

    expect(unadjusted).toBeDefined();
    expect(plus2).toBeDefined();
    expect(minus2).toBeDefined();
    expect(plus2.day).toBeGreaterThan(0);
    expect(plus2.day).toBeLessThanOrEqual(30);
    expect(minus2.day).toBeGreaterThan(0);
    expect(minus2.day).toBeLessThanOrEqual(30);

    // Effective dates should reflect difference
    expect(plus2.day !== minus2.day || plus2.month !== minus2.month).toBe(true);
    expect(plus2.day !== unadjusted.day || plus2.month !== unadjusted.month).toBe(true);
  });

  it('CAL-07: (UNIT) Zero-task month: grid renders without crash', () => {
    const emptyTaskMap = new Map<string, TaskDaySummary>();
    const grid = buildCalendarMonthGrid(
      2026,
      9,
      '2026-09-15',
      '2026-09-15',
      hijriService,
      undefined,
      emptyTaskMap
    );

    expect(grid.cells).toHaveLength(35);
    for (const cell of grid.cells) {
      expect(cell.hasTasks).toBe(false);
      expect(cell.taskSummary.total).toBe(0);
      expect(cell.taskSummary.completed).toBe(0);
      expect(cell.taskSummary.pending).toBe(0);
      expect(cell.taskSummary.missed).toBe(0);
      if (cell.isCurrentMonth) {
        expect(cell.accessibleLabel).toContain('No tasks');
      }
    }
  });

  it('CAL-08: (UNIT) Filler day tap (day outside current month): handled gracefully; no crash', () => {
    const grid = buildCalendarMonthGrid(2026, 9, '2026-09-15', '2026-09-15', hijriService);

    // Cell 0 is August 30, 2026 (a leading filler cell)
    const fillerCell = grid.cells[0];
    expect(fillerCell.isCurrentMonth).toBe(false);
    expect(fillerCell.date).toBe('2026-08-30');
    expect(fillerCell.hasTasks).toBe(false);
    expect(fillerCell.accessibleLabel).toContain('Adjacent month');

    // Tapping filler navigates to or selects that date: building grid for that date should work smoothly
    expect(() => {
      const navigatedGrid = buildCalendarMonthGrid(
        2026,
        8,
        '2026-09-15',
        fillerCell.date,
        hijriService
      );
      expect(navigatedGrid.month).toBe(8);
      const selected = navigatedGrid.cells.find(c => c.isSelected);
      expect(selected).toBeDefined();
      expect(selected!.date).toBe('2026-08-30');
    }).not.toThrow();
  });
});
