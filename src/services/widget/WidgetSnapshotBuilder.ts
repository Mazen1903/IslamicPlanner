/**
 * WidgetSnapshotBuilder
 *
 * Pure, injectable, testable service that derives a WidgetSnapshot from
 * canonical planner inputs. Has zero side effects.
 *
 * Preconditions (enforced by WidgetSyncCoordinator, not this service):
 *   - inputs are READY (not SETUP_REQUIRED)
 *   - `now` is a valid Luxon DateTime
 *
 * Privacy guarantees:
 *   - Never reads from Journal service or JournalKeyManager.
 *   - Never calls locationService.getCurrentCoordinates().
 *   - Never emits coordinates, journal content, or task notes.
 *
 * M18 invariants:
 *   - allPrayers always has exactly 5 entries.
 *   - tasks has 0-3 entries ordered by compareScheduledTasks.
 *   - SETUP_REQUIRED input produces isSetupRequired = true snapshot.
 *   - Sunrise is never included in allPrayers, currentPrayer, or nextPrayer.
 */

import { DateTime } from 'luxon';
import { PRAYER_ORDER, PRAYER_NAMES } from '@/constants/prayers';
import {
  PRAYER_ARABIC_NAMES,
  compareScheduledTasks,
  buildTaskCardViewModel,
} from '@/services/TodayViewModelProjection';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import { resolvePlanningDayForTime } from '@/domain/planning-day/PlanningDayEngine';
import { getCurrentPrayer, getNextPrayer } from '@/domain/prayer/PrayerEngine';
import type { TodayTemporalInputs } from '@/services/types';
import {
  todayQueryService,
  TodayQueryService,
} from '@/services/TodayQueryService';
import type {
  WidgetSnapshot,
  WidgetPrayerEntry,
  WidgetPrayer,
} from './types';
import { SETUP_REQUIRED_SNAPSHOT } from './types';

/** Maximum number of tasks shown in the Medium widget. */
const MAX_WIDGET_TASKS = 3;

/**
 * Format a Luxon DateTime to a 12-hour local time string, e.g. "5:23 AM".
 */
function formatLocalTime(dt: DateTime, timezone: string): string {
  return dt.setZone(timezone).toFormat('h:mm a');
}

/**
 * Build a WidgetPrayerEntry from the prayer key and its start time.
 */
function buildPrayerEntry(
  prayer: WidgetPrayer,
  startsAt: DateTime,
  timezone: string
): WidgetPrayerEntry {
  return {
    prayer,
    name: PRAYER_NAMES[prayer],
    arabicName: PRAYER_ARABIC_NAMES[prayer],
    startsAt: startsAt.toUTC().toISO()!,
    startsAtLocal: formatLocalTime(startsAt, timezone),
  };
}

export class WidgetSnapshotBuilder {
  constructor(
    private readonly queryService: TodayQueryService = todayQueryService
  ) {}

  /**
   * Build a WidgetSnapshot for SETUP_REQUIRED state.
   * Stamped with the current UTC time so generatedAt is always set.
   */
  buildSetupRequired(now: DateTime): WidgetSnapshot {
    return {
      ...SETUP_REQUIRED_SNAPSHOT,
      generatedAt: now.toUTC().toISO()!,
      isSetupRequired: true,
    };
  }

  /**
   * Build a full WidgetSnapshot from canonical temporal inputs.
   *
   * @param inputs - READY temporal inputs from LocationAwareTodayTemporalInputProvider
   * @param now - Current wall-clock time (Luxon DateTime)
   * @returns WidgetSnapshot with prayer data and pending tasks
   */
  async build(inputs: TodayTemporalInputs, now: DateTime): Promise<WidgetSnapshot> {
    const { coordinates, params, planningDayConfig } = inputs;
    const timezone = params.timezone;

    // Build 3-day prayer timeline centred on today
    const todayCivil = now.setZone(timezone).toISODate()!;
    const timeline = buildPrayerTimeline(todayCivil, coordinates, params);

    // Resolve planning day
    const planningDay = resolvePlanningDayForTime(planningDayConfig, timeline, now);
    const planningDayKey = planningDay.key;

    // Determine current and next prayer (canonical functions, no Sunrise)
    const currentPrayerKey = getCurrentPrayer(now, timeline) as WidgetPrayer;
    const nextPrayerRaw = getNextPrayer(now, timeline);

    // Build allPrayers (exactly 5, in canonical PRAYER_ORDER).
    // Use timeline periods within the planning day span.
    const planningDayPeriods = timeline.periods.filter(p =>
      p.start.toMillis() >= planningDay.start.toMillis() &&
      p.start.toMillis() < planningDay.end.toMillis() &&
      (PRAYER_ORDER as readonly string[]).includes(p.prayer)
    );

    const periodByPrayer = new Map<string, DateTime>();
    for (const period of planningDayPeriods) {
      if (!periodByPrayer.has(period.prayer)) {
        periodByPrayer.set(period.prayer, period.start);
      }
    }

    // Fallback: fill missing prayers from entire timeline (polar/edge case)
    if (periodByPrayer.size < 5) {
      for (const period of timeline.periods) {
        if (
          (PRAYER_ORDER as readonly string[]).includes(period.prayer) &&
          !periodByPrayer.has(period.prayer)
        ) {
          periodByPrayer.set(period.prayer, period.start);
        }
        if (periodByPrayer.size === 5) break;
      }
    }

    const allPrayers: WidgetPrayerEntry[] = PRAYER_ORDER.map(prayer =>
      buildPrayerEntry(
        prayer,
        // If still missing (should not happen), fall back to now
        periodByPrayer.get(prayer) ?? now,
        timezone
      )
    );

    // Current prayer entry
    const currentPeriod = timeline.findPeriod(now);
    const currentPrayer = buildPrayerEntry(currentPrayerKey, currentPeriod.start, timezone);

    // Next prayer entry
    let nextPrayer: WidgetPrayerEntry | null = null;
    if (
      nextPrayerRaw &&
      (PRAYER_ORDER as readonly string[]).includes(nextPrayerRaw.prayer)
    ) {
      nextPrayer = buildPrayerEntry(
        nextPrayerRaw.prayer as WidgetPrayer,
        nextPrayerRaw.time,
        timezone
      );
    }

    // Build task entries (0-3 pending tasks)
    const tasks = await this._buildTasks(planningDayKey, planningDay, timeline, now, timezone);

    return {
      schemaVersion: 1,
      generatedAt: now.toUTC().toISO()!,
      planningDayKey,
      timezone,
      currentPrayer,
      nextPrayer,
      allPrayers,
      tasks,
      isSetupRequired: false,
    };
  }

  /**
   * Query and select the next 3 pending tasks for the widget.
   * Reuses buildTaskCardViewModel + compareScheduledTasks for consistent
   * Today screen ordering semantics.
   *
   * Privacy: only occurrenceId, title, scheduleLabel, priority, sortInstant
   * are extracted. No notes, no descriptions, no coordinates.
   */
  private async _buildTasks(
    planningDayKey: string,
    planningDay: any,
    timeline: any,
    now: DateTime,
    timezone: string
  ) {
    try {
      const { occurrences, definitions } = await this.queryService.queryTodayCandidates(
        planningDayKey,
        now.toUTC().toISO()!
      );

      // Only PENDING occurrences; exclude CANCELLED, COMPLETED, MISSED
      const pendingOccs = occurrences.filter(occ => occ.status === 'PENDING');

      // Build minimal TaskCardViewModels using canonical buildTaskCardViewModel
      // (uses FAJR as tabPrayer for ANYTIME_TODAY tasks - correct for widget ordering)
      const cards = pendingOccs.flatMap(occ => {
        const def = definitions.get(occ.taskDefinitionId);
        if (!def) return [];
        return [buildTaskCardViewModel(occ, def, 'FAJR', planningDay, timezone, timeline)];
      });

      // Apply canonical compareScheduledTasks ordering (same as Today screen)
      cards.sort(compareScheduledTasks);

      // Select first 3 and extract only widget-safe fields (no notes, no coordinates)
      return cards.slice(0, MAX_WIDGET_TASKS).map(c => ({
        occurrenceId: c.occurrenceId,
        title: c.title,
        scheduleLabel: c.scheduleLabel,
        priority: c.priority,
        sortInstant: c.sortInstant,
      }));
    } catch {
      // If task query fails, return empty (widget shows "No pending tasks")
      return [];
    }
  }
}

export const widgetSnapshotBuilder = new WidgetSnapshotBuilder();
