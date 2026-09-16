import { DateTime } from 'luxon';
import { PRAYER_ORDER, PRAYER_NAMES, type Prayer } from '@/constants/prayers';
import type { PrayerTimeline, PrayerPeriodInstance } from '@/domain/prayer/types';
import type { PlanningDay } from '@/domain/planning-day/types';
import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';
import type {
  TodayViewModel,
  PrayerTabViewModel,
  TaskCardViewModel,
  PrayerTabTemporalState,
  EmptyStateType,
} from './types';
import { getCurrentPrayer, getNextPrayer } from '@/domain/prayer/PrayerEngine';

export const PRAYER_ARABIC_NAMES: Record<Prayer, string> = {
  FAJR: 'الفجر',
  DHUHR: 'الظهر',
  ASR: 'العصر',
  MAGHRIB: 'المغرب',
  ISHA: 'العشاء',
};

/**
 * Derives the materialization seed range [seedStart, seedEnd]
 * based on the sourceDate coverage of the PrayerTimeline.
 */
export function deriveTimelineSeedRange(timeline: PrayerTimeline): {
  seedStart: string;
  seedEnd: string;
} {
  const dates = Array.from(new Set(timeline.periods.map(p => p.sourceDate))).sort();
  if (dates.length === 0) {
    throw new Error('PrayerTimeline has no periods to derive seed range from');
  }
  return {
    seedStart: dates[0],
    seedEnd: dates[dates.length - 1],
  };
}

/**
 * Computes which prayer tabs a PENDING PRAYER_WINDOW occurrence is visible in.
 * Intersects [windowStart, windowEnd) with concrete fragments in the active PlanningDay.
 * The end prayer is always exclusive.
 */
export function computeVisibleTabs(
  occ: TaskOccurrence,
  planningDay: PlanningDay
): Prayer[] {
  if (!occ.windowStart || !occ.windowEnd) {
    return [];
  }

  const windowStartMs = DateTime.fromISO(occ.windowStart, { zone: 'utc' }).toMillis();
  const windowEndMs = DateTime.fromISO(occ.windowEnd, { zone: 'utc' }).toMillis();

  const visible = new Set<Prayer>();
  for (const fragment of planningDay.periods) {
    const fragStart = fragment.start.toMillis();
    const fragEnd = fragment.end.toMillis();
    const intersectStart = Math.max(fragStart, windowStartMs);
    const intersectEnd = Math.min(fragEnd, windowEndMs);

    if (intersectStart < intersectEnd) {
      visible.add(fragment.prayer);
    }
  }

  return PRAYER_ORDER.filter(p => visible.has(p));
}

/**
 * Computes the projection-specific sortInstant for a PRAYER_WINDOW task in a specific tab.
 * Returns the start of the concrete window × fragment intersection for that tab.
 */
export function getIntersectionStartForPrayer(
  occ: TaskOccurrence,
  planningDay: PlanningDay,
  prayer: Prayer
): string | null {
  if (!occ.windowStart || !occ.windowEnd) {
    return null;
  }

  const windowStartMs = DateTime.fromISO(occ.windowStart, { zone: 'utc' }).toMillis();
  const windowEndMs = DateTime.fromISO(occ.windowEnd, { zone: 'utc' }).toMillis();

  let earliestIntersectStart: number | null = null;

  for (const fragment of planningDay.periods) {
    if (fragment.prayer !== prayer) continue;

    const fragStart = fragment.start.toMillis();
    const fragEnd = fragment.end.toMillis();
    const intersectStart = Math.max(fragStart, windowStartMs);
    const intersectEnd = Math.min(fragEnd, windowEndMs);

    if (intersectStart < intersectEnd) {
      if (earliestIntersectStart === null || intersectStart < earliestIntersectStart) {
        earliestIntersectStart = intersectStart;
      }
    }
  }

  if (earliestIntersectStart === null) return null;
  return DateTime.fromMillis(earliestIntersectStart, { zone: 'utc' }).toISO();
}

/**
 * Formats a user-facing schedule display label for a task.
 */
export function formatScheduleLabel(
  def: TaskDefinition,
  occ: TaskOccurrence,
  timezone: string
): string {
  switch (def.scheduleType) {
    case 'EXACT_TIME': {
      if (occ.calculatedStartTime) {
        const dt = DateTime.fromISO(occ.calculatedStartTime, { zone: timezone });
        if (dt.isValid) {
          return dt.toFormat('h:mm a');
        }
      }
      const data = def.scheduleData as unknown as { localTime?: string; time?: string };
      const timeStr = data?.localTime ?? data?.time;
      if (timeStr) {
        const parsed = DateTime.fromFormat(timeStr, 'HH:mm');
        if (parsed.isValid) return parsed.toFormat('h:mm a');
        return timeStr;
      }
      return 'Exact Time';
    }
    case 'PRAYER_RELATIVE': {
      const data = def.scheduleData as unknown as {
        anchorPrayer?: Prayer;
        prayer?: Prayer;
        direction?: 'BEFORE' | 'AFTER';
        offsetMinutes?: number;
      };
      const anchor = data.anchorPrayer ?? data.prayer;
      const prayerName = anchor ? (PRAYER_NAMES[anchor] ?? anchor) : 'Prayer';
      const offset = data.offsetMinutes ?? 0;
      const isBefore = data.direction === 'BEFORE' || offset < 0;
      const absOffset = Math.abs(offset);
      if (absOffset === 0) {
        return `At ${prayerName}`;
      } else if (isBefore) {
        return `${prayerName} -${absOffset} min`;
      } else {
        return `${prayerName} +${absOffset} min`;
      }
    }
    case 'PRAYER_WINDOW': {
      const data = def.scheduleData as unknown as { startPrayer: Prayer; endPrayer: Prayer };
      const startName = PRAYER_NAMES[data.startPrayer] ?? data.startPrayer;
      const endName = PRAYER_NAMES[data.endPrayer] ?? data.endPrayer;
      return `${startName} – ${endName}`;
    }
    case 'ANYTIME_TODAY':
      return 'Anytime Today';
    default:
      return '';
  }
}

/**
 * Builds a presentation TaskCardViewModel.
 */
export function buildTaskCardViewModel(
  occ: TaskOccurrence,
  def: TaskDefinition,
  tabPrayer: Prayer,
  planningDay: PlanningDay,
  timezone: string
): TaskCardViewModel {
  let sortInstant: string | null = null;
  if (def.scheduleType === 'EXACT_TIME' || def.scheduleType === 'PRAYER_RELATIVE') {
    sortInstant = occ.calculatedStartTime ?? null;
  } else if (def.scheduleType === 'PRAYER_WINDOW') {
    sortInstant = getIntersectionStartForPrayer(occ, planningDay, tabPrayer);
  } else if (def.scheduleType === 'ANYTIME_TODAY') {
    sortInstant = null;
  }

  return {
    occurrenceId: occ.id,
    taskDefinitionId: def.id,
    title: def.title,
    scheduleType: def.scheduleType,
    scheduleLabel: formatScheduleLabel(def, occ, timezone),
    priority: def.priority,
    status: occ.status,
    estimatedMinutes: def.estimatedMinutes ?? null,
    sortInstant,
    createdAt: def.createdAt,
    completedAt: occ.completedAt ?? null,
    missedAt: occ.missedAt ?? null,
  };
}

/**
 * Determines representative start time and temporalState for a prayer tab.
 */
export function getRepresentativePeriodForTab(
  prayer: Prayer,
  planningDay: PlanningDay,
  now: DateTime
): { period: PrayerPeriodInstance; temporalState: PrayerTabTemporalState } {
  const fragments = planningDay.periods.filter(p => p.prayer === prayer);
  if (fragments.length === 0) {
    throw new Error(`No fragments found for prayer ${prayer} in planning day ${planningDay.key}`);
  }

  // 1. Containing fragment
  const containing = fragments.find(f => f.start <= now && now < f.end);
  if (containing) {
    return { period: containing, temporalState: 'CURRENT' };
  }

  // 2. Nearest future fragment
  const futureFragments = fragments.filter(f => f.start > now);
  if (futureFragments.length > 0) {
    let nearest = futureFragments[0];
    for (let i = 1; i < futureFragments.length; i++) {
      if (futureFragments[i].start < nearest.start) {
        nearest = futureFragments[i];
      }
    }
    return { period: nearest, temporalState: 'FUTURE' };
  }

  // 3. Most recent past fragment
  let mostRecent = fragments[0];
  for (let i = 1; i < fragments.length; i++) {
    if (fragments[i].start > mostRecent.start) {
      mostRecent = fragments[i];
    }
  }
  return { period: mostRecent, temporalState: 'PAST' };
}

/**
 * Sorting comparator for scheduled tasks in a prayer tab:
 * 1. sortInstant ASC
 * 2. IMPORTANT before NORMAL
 * 3. createdAt ASC
 * 4. occurrenceId ASC
 */
export function compareScheduledTasks(a: TaskCardViewModel, b: TaskCardViewModel): number {
  if (a.sortInstant && b.sortInstant) {
    const diff =
      DateTime.fromISO(a.sortInstant).toMillis() - DateTime.fromISO(b.sortInstant).toMillis();
    if (diff !== 0) return diff;
  } else if (a.sortInstant && !b.sortInstant) {
    return -1;
  } else if (!a.sortInstant && b.sortInstant) {
    return 1;
  }

  if (a.priority !== b.priority) {
    return a.priority === 'IMPORTANT' ? -1 : 1;
  }

  if (a.createdAt !== b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }

  return a.occurrenceId.localeCompare(b.occurrenceId);
}

/**
 * Sorting comparator for anytime tasks:
 * 1. IMPORTANT before NORMAL
 * 2. createdAt ASC
 * 3. occurrenceId ASC
 */
export function compareAnytimeTasks(a: TaskCardViewModel, b: TaskCardViewModel): number {
  if (a.priority !== b.priority) {
    return a.priority === 'IMPORTANT' ? -1 : 1;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }
  return a.occurrenceId.localeCompare(b.occurrenceId);
}

/**
 * Sorting comparator for missed tasks:
 * 1. sortInstant ASC
 * 2. IMPORTANT before NORMAL
 * 3. createdAt ASC
 * 4. occurrenceId ASC
 */
export function compareMissedTasks(a: TaskCardViewModel, b: TaskCardViewModel): number {
  return compareScheduledTasks(a, b);
}

/**
 * Sorting comparator for completed tasks:
 * 1. completedAt ASC
 * 2. createdAt ASC
 * 3. occurrenceId ASC
 */
export function compareCompletedTasks(a: TaskCardViewModel, b: TaskCardViewModel): number {
  if (a.completedAt && b.completedAt) {
    const diff =
      DateTime.fromISO(a.completedAt).toMillis() - DateTime.fromISO(b.completedAt).toMillis();
    if (diff !== 0) return diff;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }
  return a.occurrenceId.localeCompare(b.occurrenceId);
}

/**
 * Determines empty-state classification for a tab.
 * ANYTIME_TODAY tasks do not influence scheduled-prayer empty-state classification.
 */
export function computeEmptyState(tab: PrayerTabViewModel): EmptyStateType {
  const hasScheduled = tab.scheduledTasks.length > 0;
  const hasMissed = tab.missedTasks.length > 0;
  const hasCompleted = tab.completedTasks.length > 0;

  if (!hasScheduled && !hasMissed && !hasCompleted) {
    return 'NOTHING_SCHEDULED';
  }
  if (!hasScheduled && !hasMissed && hasCompleted) {
    return 'ALL_DONE';
  }
  // If any MISSED or PENDING: no empty state
  return null;
}

/**
 * Generates context-sensitive copy for tab empty states.
 */
export function getEmptyStateMessage(
  emptyType: EmptyStateType,
  selectedPrayer: Prayer,
  currentPrayer: Prayer,
  nextPrayer: Prayer | null
): string {
  const nextPrayerName = nextPrayer ? PRAYER_NAMES[nextPrayer] : '';
  const selectedPrayerName = PRAYER_NAMES[selectedPrayer];

  if (emptyType === 'NOTHING_SCHEDULED') {
    if (selectedPrayer === currentPrayer && nextPrayerName) {
      return `Nothing scheduled until ${nextPrayerName}.`;
    }
    return `Nothing scheduled for ${selectedPrayerName}.`;
  }

  if (emptyType === 'ALL_DONE') {
    if (selectedPrayer === currentPrayer && nextPrayerName) {
      return `All done until ${nextPrayerName}.`;
    }
    return `All done for ${selectedPrayerName}.`;
  }

  return '';
}

/**
 * Projects raw candidate TaskOccurrences and TaskDefinitions into the TodayViewModel.
 */
export function projectTodayViewModel(
  occurrences: TaskOccurrence[],
  definitions: Map<string, TaskDefinition>,
  planningDay: PlanningDay,
  timeline: PrayerTimeline,
  now: DateTime,
  timezone: string
): TodayViewModel {
  // 1. Initialize empty tab builders for exactly 5 prayer tabs
  const tabBuilders = new Map<
    Prayer,
    {
      scheduled: TaskCardViewModel[];
      missed: TaskCardViewModel[];
      completed: TaskCardViewModel[];
      anytime: TaskCardViewModel[];
    }
  >();

  for (const prayer of PRAYER_ORDER) {
    tabBuilders.set(prayer, {
      scheduled: [],
      missed: [],
      completed: [],
      anytime: [],
    });
  }

  // 2. Project each occurrence
  for (const occ of occurrences) {
    // CANCELLED occurrences are excluded from display
    if (occ.status === 'CANCELLED') {
      continue;
    }

    const def = definitions.get(occ.taskDefinitionId);
    if (!def) {
      continue;
    }

    // A. ANYTIME_TODAY: project to anytime section of all 5 tabs
    if (def.scheduleType === 'ANYTIME_TODAY') {
      const card = buildTaskCardViewModel(occ, def, 'FAJR', planningDay, timezone);
      for (const prayer of PRAYER_ORDER) {
        tabBuilders.get(prayer)!.anytime.push(card);
      }
      continue;
    }

    // B. PRAYER_WINDOW:
    if (def.scheduleType === 'PRAYER_WINDOW') {
      let targetPrayers: Prayer[];
      if (occ.status === 'PENDING') {
        targetPrayers = computeVisibleTabs(occ, planningDay);
      } else {
        // COMPLETED or MISSED: use frozen persisted eligiblePrayerSections
        targetPrayers = occ.eligiblePrayerSections ?? [];
      }

      for (const prayer of targetPrayers) {
        const builder = tabBuilders.get(prayer);
        if (!builder) continue;

        const card = buildTaskCardViewModel(occ, def, prayer, planningDay, timezone);
        if (occ.status === 'PENDING') {
          builder.scheduled.push(card);
        } else if (occ.status === 'MISSED') {
          builder.missed.push(card);
        } else if (occ.status === 'COMPLETED') {
          builder.completed.push(card);
        }
      }
      continue;
    }

    // C. EXACT_TIME or PRAYER_RELATIVE: single tab
    const targetPrayer = occ.calculatedPrayerSection;
    if (targetPrayer && tabBuilders.has(targetPrayer)) {
      const builder = tabBuilders.get(targetPrayer)!;
      const card = buildTaskCardViewModel(occ, def, targetPrayer, planningDay, timezone);
      if (occ.status === 'PENDING') {
        builder.scheduled.push(card);
      } else if (occ.status === 'MISSED') {
        builder.missed.push(card);
      } else if (occ.status === 'COMPLETED') {
        builder.completed.push(card);
      }
    }
  }

  // 3. Assemble tab view models with sorted tasks
  const tabs: PrayerTabViewModel[] = PRAYER_ORDER.map(prayer => {
    const rep = getRepresentativePeriodForTab(prayer, planningDay, now);
    const builder = tabBuilders.get(prayer)!;

    builder.scheduled.sort(compareScheduledTasks);
    builder.missed.sort(compareMissedTasks);
    builder.completed.sort(compareCompletedTasks);
    builder.anytime.sort(compareAnytimeTasks);

    return {
      prayer,
      name: PRAYER_NAMES[prayer],
      arabicName: PRAYER_ARABIC_NAMES[prayer],
      startTime: rep.period.start.setZone(timezone).toFormat('h:mm a'),
      startDateTime: rep.period.start.toISO()!,
      temporalState: rep.temporalState,
      scheduledTasks: builder.scheduled,
      missedTasks: builder.missed,
      completedTasks: builder.completed,
      anytimeTasks: builder.anytime,
    };
  });

  // 4. Derive currentPrayer and nextPrayer
  const currentPrayer = getCurrentPrayer(now, timeline);
  let nextPrayerInfo: { prayer: Prayer; time: string } | null = null;
  try {
    const next = getNextPrayer(now, timeline);
    nextPrayerInfo = {
      prayer: next.prayer,
      time: next.time.toISO()!,
    };
  } catch {
    // End of timeline coverage
  }

  return {
    planningDayKey: planningDay.key,
    planningDay,
    currentPrayer,
    tabs,
    nextPrayer: nextPrayerInfo,
  };
}
