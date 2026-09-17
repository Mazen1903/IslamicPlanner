import { DateTime } from 'luxon';
import { PRAYER_ORDER, PRAYER_NAMES, type Prayer } from '@/constants/prayers';
import {
  PRAYER_ARABIC_NAMES,
  buildTaskCardViewModel,
  computeVisibleTabs,
  compareScheduledTasks,
  compareAnytimeTasks,
  formatScheduleLabel,
  getRepresentativePeriodForTab,
} from './TodayViewModelProjection';
import {
  buildCalendarMonthGrid,
  type CalendarMonthGridModel,
  type TaskDaySummary,
} from '@/domain/calendar/calendarGrid';
import { HijriService } from '@/domain/calendar/HijriService';
import {
  HIJRI_MONTH_NAMES,
  type HijriAdjustmentConfig,
  type HijriMonthNumber,
} from '@/domain/calendar/types';
import { PlanningDayEngine } from '@/domain/planning-day/PlanningDayEngine';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import {
  TaskDefinitionRepository,
  taskDefinitionRepository as defaultDefRepo,
} from '@/data/repositories/TaskDefinitionRepository';
import {
  TaskOccurrenceRepository,
  taskOccurrenceRepository as defaultOccRepo,
} from '@/data/repositories/TaskOccurrenceRepository';
import {
  RecurringHorizonSync,
  recurringHorizonSync as defaultHorizonSync,
} from '@/features/task-form/recurringHorizonSync';
import {
  LocationAwareTodayTemporalInputProvider,
} from './TodayTemporalInputProvider';
import type {
  TodayTemporalInputProvider,
  TodayTemporalInputs,
  TaskCardViewModel,
} from './types';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';

export interface UpcomingTaskItem {
  occurrenceId: string;
  taskDefinitionId: string;
  title: string;
  planningDayKey: string;
  scheduleType: string;
  scheduleLabel: string;
  priority: string;
  calculatedStartTime: string | null;
  windowStart: string | null;
  createdAt: string;
}

export interface SelectedDayPrayerSection {
  prayer: Prayer;
  name: string;
  arabicName: string;
  startTime: string;
  tasks: TaskCardViewModel[];
}

export interface SelectedDayDetailModel {
  civilDate: string; // YYYY-MM-DD
  planningDayKey: string;
  hijriFormatted: string;
  prayerSections: SelectedDayPrayerSection[]; // exactly 5 in PRAYER_ORDER
  anytimeTasks: TaskCardViewModel[]; // secondary unscheduled area
  totalTasksCount: number;
}

export interface CalendarMonthState {
  status: 'SETUP_REQUIRED' | 'READY' | 'ERROR';
  year: number;
  month: number;
  selectedDate: string;
  plannerLocalCivilDate: string;
  currentPlanningDayKey: string | null;
  grid: CalendarMonthGridModel;
  selectedDayDetail: SelectedDayDetailModel | null;
  upcomingTasks: UpcomingTaskItem[];
  hasMoreUpcoming: boolean;
  error?: string;
}

/**
 * Comparator for sorting Upcoming tasks according to M14 §5:
 * 1. planningDayKey ASC
 * 2. timed Exact / Relative by calculatedStartTime ASC
 * 3. Prayer Window by windowStart ASC
 * 4. Anytime after timed items on same planningDayKey
 * 5. Anytime IMPORTANT first, then stable createdAt/id ordering
 */
export function compareUpcomingTasks(a: UpcomingTaskItem, b: UpcomingTaskItem): number {
  if (a.planningDayKey !== b.planningDayKey) {
    return a.planningDayKey.localeCompare(b.planningDayKey);
  }

  const getGroup = (item: UpcomingTaskItem): number => {
    if (item.calculatedStartTime) return 1; // Group 1: timed Exact / Relative
    if (item.windowStart) return 2;         // Group 2: Prayer Window
    return 3;                              // Group 3: Anytime
  };

  const groupA = getGroup(a);
  const groupB = getGroup(b);

  if (groupA !== groupB) {
    return groupA - groupB;
  }

  if (groupA === 1 && a.calculatedStartTime && b.calculatedStartTime) {
    const diff =
      DateTime.fromISO(a.calculatedStartTime).toMillis() -
      DateTime.fromISO(b.calculatedStartTime).toMillis();
    if (diff !== 0) return diff;
  } else if (groupA === 2 && a.windowStart && b.windowStart) {
    const diff =
      DateTime.fromISO(a.windowStart).toMillis() -
      DateTime.fromISO(b.windowStart).toMillis();
    if (diff !== 0) return diff;
  }

  // Same time or Anytime: IMPORTANT first
  if (a.priority !== b.priority) {
    return a.priority === 'IMPORTANT' ? -1 : 1;
  }

  if (a.createdAt !== b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }

  return a.occurrenceId.localeCompare(b.occurrenceId);
}

export class CalendarMonthOrchestrator {
  constructor(
    private defRepo: TaskDefinitionRepository = defaultDefRepo,
    private occRepo: TaskOccurrenceRepository = defaultOccRepo,
    private horizonSync: RecurringHorizonSync = defaultHorizonSync,
    private temporalProvider: TodayTemporalInputProvider = new LocationAwareTodayTemporalInputProvider(),
    private hijriService: HijriService = new HijriService()
  ) {}

  /**
   * Loads and orchestrates complete Calendar month data.
   *
   * Invariants (M14):
   * 1. Dual date model: derives plannerLocalCivilDate AND currentPlanningDayKey.
   * 2. SETUP_REQUIRED: performs zero sync, calculates zero prayer times, displays grid + Hijri only.
   * 3. Historical safety: if currentPlanningDayKey > monthEnd, executes ZERO syncRange.
   * 4. Candidate range ±2: syncRange called with [monthStart - 2, monthEnd + 2] and createAllowedRange.
   * 5. Single month occurrence query: findNonCancelledByPlanningDayKeyRange(monthStart, monthEnd).
   * 6. Selected day: 5 fixed prayer sections (Fajr..Isha) + secondary Anytime area. Read-only task cards.
   * 7. Upcoming This Month: PENDING, > currentPlanningDayKey, ordered per 5 rules, capped at 50.
   */
  async loadMonth(
    year: number,
    month: number,
    selectedDateOverride?: string,
    hijriAdjustment?: HijriAdjustmentConfig
  ): Promise<CalendarMonthState> {
    const monthStartDt = DateTime.utc(year, month, 1);
    const daysInMonth = monthStartDt.daysInMonth!;
    const monthEndDt = DateTime.utc(year, month, daysInMonth);
    const monthStart = monthStartDt.toISODate()!;
    const monthEnd = monthEndDt.toISODate()!;

    // 1. Check temporal input availability (M14 §10, §11)
    const temporalResult = await this.temporalProvider.getInputs();

    if (temporalResult.status === 'SETUP_REQUIRED') {
      const civilToday = DateTime.now().toISODate()!;
      const selectedDate =
        selectedDateOverride ??
        (year === DateTime.now().year && month === DateTime.now().month
          ? civilToday
          : monthStart);

      const grid = buildCalendarMonthGrid(
        year,
        month,
        civilToday,
        selectedDate,
        this.hijriService,
        hijriAdjustment
      );

      return {
        status: 'SETUP_REQUIRED',
        year,
        month,
        selectedDate,
        plannerLocalCivilDate: civilToday,
        currentPlanningDayKey: null,
        grid,
        selectedDayDetail: null,
        upcomingTasks: [],
        hasMoreUpcoming: false,
      };
    }

    const temporalInputs = temporalResult.inputs;
    const timezone = temporalInputs.params.timezone;

    // 2. Derive plannerLocalCivilDate AND currentPlanningDayKey (M14 §6, §7)
    const now = DateTime.now().setZone(timezone);
    const plannerLocalCivilDate = now.toISODate()!;

    // Build timeline centered on civil today to resolve active planning day
    let currentPlanningDayKey: string;
    try {
      const todayTimeline = buildPrayerTimeline(
        plannerLocalCivilDate,
        temporalInputs.coordinates,
        temporalInputs.params
      );
      const boundaries = PlanningDayEngine.resolvePlanningDayBoundaries(
        temporalInputs.planningDayConfig,
        todayTimeline,
        now
      );
      currentPlanningDayKey = boundaries.key;
    } catch {
      // Fallback if boundary calculation fails
      currentPlanningDayKey = plannerLocalCivilDate;
    }

    const selectedDate =
      selectedDateOverride ??
      (year === now.year && month === now.month ? plannerLocalCivilDate : monthStart);

    // 3. Historical Browsing vs. Range Sync (M14 §2, §3, §6, §12)
    const isEntirelyHistorical = currentPlanningDayKey > monthEnd;

    if (!isEntirelyHistorical) {
      const createTargetStart =
        monthStart > currentPlanningDayKey ? monthStart : currentPlanningDayKey;
      const createAllowedRange = { start: createTargetStart, end: monthEnd };

      const candidateSeedRange = {
        start: DateTime.fromISO(monthStart, { zone: 'utc' }).minus({ days: 2 }).toISODate()!,
        end: DateTime.fromISO(monthEnd, { zone: 'utc' }).plus({ days: 2 }).toISODate()!,
      };

      try {
        await this.horizonSync.syncRange(
          candidateSeedRange,
          createAllowedRange,
          temporalInputs
        );
      } catch {
        // Range sync failures are isolated per-item; overall flow continues
      }
    }

    // 4. Batch query non-cancelled occurrences for the visible month (M14 §14)
    let monthOccurrences: TaskOccurrence[] = [];
    try {
      monthOccurrences = await this.occRepo.findNonCancelledByPlanningDayKeyRange(
        monthStart,
        monthEnd
      );
    } catch {
      monthOccurrences = [];
    }

    // 5. Aggregate task counts per planningDayKey for grid indicators & accessibility
    const tasksByPlanningDay = new Map<string, TaskDaySummary>();
    for (const occ of monthOccurrences) {
      let summary = tasksByPlanningDay.get(occ.planningDayKey);
      if (!summary) {
        summary = { total: 0, completed: 0, pending: 0, missed: 0 };
        tasksByPlanningDay.set(occ.planningDayKey, summary);
      }
      summary.total++;
      if (occ.status === 'COMPLETED') summary.completed++;
      else if (occ.status === 'PENDING') summary.pending++;
      else if (occ.status === 'MISSED') summary.missed++;
    }

    // Build the grid model
    const grid = buildCalendarMonthGrid(
      year,
      month,
      plannerLocalCivilDate,
      selectedDate,
      this.hijriService,
      hijriAdjustment,
      tasksByPlanningDay
    );

    // 6. Compute Upcoming This Month (M14 §5)
    // Filter: PENDING occurrences, planningDayKey in visible month, AND planningDayKey > currentPlanningDayKey
    const upcomingCandidatesRaw = monthOccurrences.filter(
      occ =>
        occ.status === 'PENDING' &&
        occ.planningDayKey >= monthStart &&
        occ.planningDayKey <= monthEnd &&
        occ.planningDayKey > currentPlanningDayKey
    );

    // Fetch definition titles/schedules for upcoming tasks
    const defIds = Array.from(new Set(upcomingCandidatesRaw.map(o => o.taskDefinitionId)));
    const defMap = new Map<string, TaskDefinition>();
    for (const id of defIds) {
      try {
        const def = await this.defRepo.findById(id);
        if (def) defMap.set(id, def);
      } catch {
        // Skip missing definition
      }
    }

    const upcomingItems: UpcomingTaskItem[] = [];
    for (const occ of upcomingCandidatesRaw) {
      const def = defMap.get(occ.taskDefinitionId);
      if (!def) continue;

      upcomingItems.push({
        occurrenceId: occ.id,
        taskDefinitionId: def.id,
        title: def.title,
        planningDayKey: occ.planningDayKey,
        scheduleType: def.scheduleType,
        scheduleLabel: formatScheduleLabel(def, occ, timezone),
        priority: def.priority,
        calculatedStartTime: occ.calculatedStartTime ?? null,
        windowStart: occ.windowStart ?? null,
        createdAt: def.createdAt,
      });
    }

    upcomingItems.sort(compareUpcomingTasks);

    const hasMoreUpcoming = upcomingItems.length > 50;
    const upcomingTasks = upcomingItems.slice(0, 50);

    // 7. Project Selected-Day Detail (M14 §1, §2, §3, §18)
    const selectedDayDetail = await this.projectSelectedDay(
      selectedDate,
      temporalInputs,
      hijriAdjustment
    );

    return {
      status: 'READY',
      year,
      month,
      selectedDate,
      plannerLocalCivilDate,
      currentPlanningDayKey,
      grid,
      selectedDayDetail,
      upcomingTasks,
      hasMoreUpcoming,
    };
  }

  /**
   * Projects selected-day detail into exactly 5 fixed prayer sections + Anytime secondary area.
   */
  private async projectSelectedDay(
    selectedDate: string,
    temporalInputs: TodayTemporalInputs,
    hijriAdjustment?: HijriAdjustmentConfig
  ): Promise<SelectedDayDetailModel> {
    const timezone = temporalInputs.params.timezone;

    // Build date-scoped timeline for selected date
    let timeline: import('@/domain/prayer/types').PrayerTimeline;
    try {
      timeline = buildPrayerTimeline(
        selectedDate,
        temporalInputs.coordinates,
        temporalInputs.params
      );
    } catch {
      // Fallback
      timeline = buildPrayerTimeline(
        selectedDate,
        temporalInputs.coordinates,
        temporalInputs.params
      );
    }

    // Resolve PlanningDay
    const planningDay = PlanningDayEngine.buildPlanningDay(
      temporalInputs.planningDayConfig,
      timeline,
      selectedDate
    );

    // Query non-cancelled occurrences for selected date
    let occurrences: TaskOccurrence[] = [];
    try {
      occurrences = await this.occRepo.findNonCancelledByPlanningDayKeyRange(
        selectedDate,
        selectedDate
      );
    } catch {
      occurrences = [];
    }

    // Load definitions
    const defIds = Array.from(new Set(occurrences.map(o => o.taskDefinitionId)));
    const defMap = new Map<string, TaskDefinition>();
    for (const id of defIds) {
      try {
        const def = await this.defRepo.findById(id);
        if (def) defMap.set(id, def);
      } catch {
        // Ignore
      }
    }

    // Initialize map for exactly 5 prayer sections in PRAYER_ORDER
    const sectionTasks = new Map<Prayer, TaskCardViewModel[]>();
    for (const prayer of PRAYER_ORDER) {
      sectionTasks.set(prayer, []);
    }

    const anytimeTasks: TaskCardViewModel[] = [];

    // Project each occurrence into sections
    for (const occ of occurrences) {
      const def = defMap.get(occ.taskDefinitionId);
      if (!def) continue;

      if (def.scheduleType === 'ANYTIME_TODAY') {
        const card = buildTaskCardViewModel(occ, def, 'FAJR', planningDay, timezone, timeline);
        anytimeTasks.push(card);
        continue;
      }

      if (def.scheduleType === 'PRAYER_WINDOW') {
        let targetPrayers: Prayer[];
        if (occ.status === 'PENDING') {
          targetPrayers = computeVisibleTabs(occ, planningDay);
        } else {
          targetPrayers = occ.eligiblePrayerSections ?? [];
        }

        for (const prayer of targetPrayers) {
          const list = sectionTasks.get(prayer);
          if (!list) continue;
          const card = buildTaskCardViewModel(occ, def, prayer, planningDay, timezone, timeline);
          list.push(card);
        }
        continue;
      }

      // EXACT_TIME or PRAYER_RELATIVE
      const targetPrayer = occ.calculatedPrayerSection;
      if (targetPrayer && sectionTasks.has(targetPrayer)) {
        const card = buildTaskCardViewModel(occ, def, targetPrayer, planningDay, timezone, timeline);
        sectionTasks.get(targetPrayer)!.push(card);
      }
    }

    // Sort tasks in each prayer section and anytime list
    const prayerSections: SelectedDayPrayerSection[] = PRAYER_ORDER.map(prayer => {
      const tasks = sectionTasks.get(prayer)!;
      tasks.sort(compareScheduledTasks);

      // Derive representative start time for the prayer section
      const rep = getRepresentativePeriodForTab(prayer, planningDay, DateTime.fromISO(selectedDate + 'T12:00:00', { zone: timezone }));
      const startTime = rep.period.start.setZone(timezone).toFormat('h:mm a');

      return {
        prayer,
        name: PRAYER_NAMES[prayer],
        arabicName: PRAYER_ARABIC_NAMES[prayer],
        startTime,
        tasks,
      };
    });

    anytimeTasks.sort(compareAnytimeTasks);

    // Format Hijri date for header
    const hijriDate = this.hijriService.toEffectiveHijri(selectedDate, hijriAdjustment);
    const hijriMonthName = HIJRI_MONTH_NAMES[hijriDate.month as HijriMonthNumber];
    const hijriFormatted = `${hijriDate.day} ${hijriMonthName} ${hijriDate.year} AH`;

    return {
      civilDate: selectedDate,
      planningDayKey: planningDay.key,
      hijriFormatted,
      prayerSections,
      anytimeTasks,
      totalTasksCount: occurrences.length,
    };
  }
}

export const calendarMonthOrchestrator = new CalendarMonthOrchestrator();
