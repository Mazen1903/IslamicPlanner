import { DateTime } from 'luxon';
import { HijriService } from './HijriService';
import {
  HIJRI_MONTH_NAMES,
  type HijriAdjustmentConfig,
  type HijriDate,
  type HijriMonthNumber,
} from './types';

export interface TaskDaySummary {
  total: number;
  completed: number;
  pending: number;
  missed: number;
}

export interface CalendarDayCellModel {
  /** Civil date in YYYY-MM-DD format */
  date: string;
  /** Day of the month (1..31) */
  dayNumber: number;
  /** True if this cell belongs to the currently browsed Gregorian month */
  isCurrentMonth: boolean;
  /** Canonical Hijri date */
  hijriDate: HijriDate;
  /** Hijri day of the month (1..30) */
  hijriDayNumber: number;
  /** True if this date matches the planner-local civil today */
  isCivilToday: boolean;
  /** True if this date matches the user's currently selected date */
  isSelected: boolean;
  /** True if this date has at least one visible non-CANCELLED task (in-month cells only) */
  hasTasks: boolean;
  /** Detailed task count breakdown for accessibility */
  taskSummary: TaskDaySummary;
  /** Full accessible label for screen readers */
  accessibleLabel: string;
}

export interface CalendarMonthGridModel {
  year: number;
  month: number; // 1..12
  monthStart: string; // YYYY-MM-01
  monthEnd: string;   // YYYY-MM-DD
  rowCount: 4 | 5 | 6;
  totalCells: 28 | 35 | 42;
  cells: CalendarDayCellModel[];
  gregorianTitle: string; // e.g. "September 2026"
  hijriHeaderSpan: string; // e.g. "Rabi' al-Awwal – Rabi' al-Thani 1448"
}

/**
 * Builds the Hijri header span label derived strictly from the visible Gregorian monthStart through monthEnd.
 * Invariant (M14 §9): Adjacent-month filler cells MUST NOT influence this header span.
 */
export function buildHijriHeaderSpan(
  monthStart: string,
  monthEnd: string,
  hijriService: HijriService,
  adjustmentConfig?: HijriAdjustmentConfig
): string {
  const startHijri = hijriService.toEffectiveHijri(monthStart, adjustmentConfig);
  const endHijri = hijriService.toEffectiveHijri(monthEnd, adjustmentConfig);

  const startMonthName = HIJRI_MONTH_NAMES[startHijri.month as HijriMonthNumber];
  const endMonthName = HIJRI_MONTH_NAMES[endHijri.month as HijriMonthNumber];

  if (startHijri.year === endHijri.year) {
    if (startHijri.month === endHijri.month) {
      return `${startMonthName} ${startHijri.year}`;
    }
    return `${startMonthName} – ${endMonthName} ${startHijri.year}`;
  }

  return `${startMonthName} ${startHijri.year} – ${endMonthName} ${endHijri.year}`;
}

/**
 * Generates an accessible label for a calendar day cell.
 */
export function buildCellAccessibleLabel(
  date: string,
  hijriDate: HijriDate,
  isCurrentMonth: boolean,
  isCivilToday: boolean,
  isSelected: boolean,
  taskSummary: TaskDaySummary
): string {
  const dt = DateTime.fromISO(date);
  const gregorianFormatted = dt.toFormat('cccc, MMMM d, yyyy');
  const hijriMonthName = HIJRI_MONTH_NAMES[hijriDate.month as HijriMonthNumber];
  const hijriFormatted = `${hijriDate.day} ${hijriMonthName} ${hijriDate.year} AH`;

  const parts: string[] = [];

  if (isCivilToday) parts.push('Today');
  if (isSelected) parts.push('Selected');
  if (!isCurrentMonth) parts.push('Adjacent month');

  parts.push(gregorianFormatted);
  parts.push(hijriFormatted);

  if (isCurrentMonth) {
    if (taskSummary.total === 0) {
      parts.push('No tasks');
    } else {
      const taskDetails: string[] = [];
      if (taskSummary.completed > 0) {
        taskDetails.push(`${taskSummary.completed} completed`);
      }
      if (taskSummary.pending > 0) {
        taskDetails.push(`${taskSummary.pending} pending`);
      }
      if (taskSummary.missed > 0) {
        taskDetails.push(`${taskSummary.missed} missed`);
      }
      parts.push(
        `${taskSummary.total} ${taskSummary.total === 1 ? 'task' : 'tasks'}: ${taskDetails.join(', ')}`
      );
    }
  }

  return parts.join(', ');
}

/**
 * Computes the complete Sunday-first calendar grid for a given Gregorian year and month.
 *
 * Invariants (M14):
 * - Sunday-first: Sunday is column 0, Saturday is column 6.
 * - Natural row counts: 4 rows (28 cells), 5 rows (35 cells), or 6 rows (42 cells).
 * - Per-cell Hijri date derived for all cells (including leading/trailing fillers).
 * - Filler cells have hasTasks = false (no task indicator dots).
 * - Hijri header span strictly derived from [monthStart, monthEnd].
 */
export function buildCalendarMonthGrid(
  year: number,
  month: number, // 1..12
  civilToday: string, // YYYY-MM-DD
  selectedDate: string, // YYYY-MM-DD
  hijriService: HijriService,
  adjustmentConfig?: HijriAdjustmentConfig,
  tasksByPlanningDay?: Map<string, TaskDaySummary>
): CalendarMonthGridModel {
  const monthStartDt = DateTime.utc(year, month, 1);
  const daysInMonth = monthStartDt.daysInMonth!;
  const monthEndDt = DateTime.utc(year, month, daysInMonth);

  const monthStart = monthStartDt.toISODate()!;
  const monthEnd = monthEndDt.toISODate()!;

  // Sunday-first weekday offset: in Luxon 1=Mon..7=Sun.
  // Sunday (7) % 7 = 0. Monday (1) % 7 = 1. Saturday (6) % 7 = 6.
  const firstDayWeekday = monthStartDt.weekday % 7;
  const leadingFillerCount = firstDayWeekday;

  const totalDaysNeeded = leadingFillerCount + daysInMonth;

  let rowCount: 4 | 5 | 6;
  let totalCells: 28 | 35 | 42;

  if (totalDaysNeeded <= 28) {
    rowCount = 4;
    totalCells = 28;
  } else if (totalDaysNeeded <= 35) {
    rowCount = 5;
    totalCells = 35;
  } else {
    rowCount = 6;
    totalCells = 42;
  }

  const cells: CalendarDayCellModel[] = [];

  // Start date for cell 0: monthStart minus leadingFillerCount days
  const gridStartDt = monthStartDt.minus({ days: leadingFillerCount });

  for (let i = 0; i < totalCells; i++) {
    const currentDt = gridStartDt.plus({ days: i });
    const dateStr = currentDt.toISODate()!;
    const isCurrentMonth = currentDt.month === month && currentDt.year === year;

    const hijriDate = hijriService.toEffectiveHijri(dateStr, adjustmentConfig);
    const hijriDayNumber = hijriDate.day;

    const isCivilToday = dateStr === civilToday;
    const isSelected = dateStr === selectedDate;

    // Filler cells never show task indicators
    let hasTasks = false;
    let taskSummary: TaskDaySummary = { total: 0, completed: 0, pending: 0, missed: 0 };

    if (isCurrentMonth && tasksByPlanningDay) {
      const summary = tasksByPlanningDay.get(dateStr);
      if (summary && summary.total > 0) {
        hasTasks = true;
        taskSummary = summary;
      }
    }

    const accessibleLabel = buildCellAccessibleLabel(
      dateStr,
      hijriDate,
      isCurrentMonth,
      isCivilToday,
      isSelected,
      taskSummary
    );

    cells.push({
      date: dateStr,
      dayNumber: currentDt.day,
      isCurrentMonth,
      hijriDate,
      hijriDayNumber,
      isCivilToday,
      isSelected,
      hasTasks,
      taskSummary,
      accessibleLabel,
    });
  }

  const gregorianTitle = monthStartDt.toFormat('MMMM yyyy');
  const hijriHeaderSpan = buildHijriHeaderSpan(
    monthStart,
    monthEnd,
    hijriService,
    adjustmentConfig
  );

  return {
    year,
    month,
    monthStart,
    monthEnd,
    rowCount,
    totalCells,
    cells,
    gregorianTitle,
    hijriHeaderSpan,
  };
}
