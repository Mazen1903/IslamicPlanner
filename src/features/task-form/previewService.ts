import { DateTime } from 'luxon';
import { PRAYER_NAMES, PRAYER_ORDER } from '@/constants/prayers';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import { resolvePlacement } from '@/domain/scheduling/SchedulingEngine';
import type { SchedulingContext } from '@/domain/scheduling/types';
import type { TaskDefinition } from '@/domain/task/types';
import type { TodayTemporalInputs } from '@/services/types';
import type { FormState, SchedulePreviewResult } from './types';
import { deriveScheduleDataFromState, deriveStartDateFromState } from './taskDraftMapper';

/**
 * Creates a transient TaskDefinition for preview placement resolution.
 */
function createPreviewDefinition(state: FormState): TaskDefinition {
  const startDate = deriveStartDateFromState(state);
  const { scheduleType, scheduleData } = deriveScheduleDataFromState(state);

  return {
    id: 'preview-task-def',
    title: state.title || 'Preview Task',
    description: null,
    startDate,
    source: 'USER',
    worshipItemKey: null,
    scheduleType,
    scheduleData,
    recurrenceRule: null,
    hijriRecurrence: null,
    recurrenceEnd: null,
    seriesId: 'preview-series',
    seriesVersion: 1,
    effectiveFromDate: null,
    effectiveToDate: null,
    reminderRule: null,
    priority: 'NORMAL',
    estimatedMinutes: null,
    notes: null,
    tags: [],
    subtasks: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Computes live schedule preview for the current form state and selected date.
 * Returns derived preview or typed error/unavailable state.
 * Never throws. Never persists.
 */
export function computeSchedulePreview(
  state: FormState,
  temporalInputs: TodayTemporalInputs | null
): SchedulePreviewResult {
  // 1. Anytime Today
  if (state.scheduleMode === 'ANYTIME_TODAY') {
    return {
      status: 'READY',
      primaryLabel: 'Anytime Today',
      secondaryLabel: 'Flexible placement in active prayer',
    };
  }

  // 2. Prayer Window
  if (state.scheduleMode === 'PRAYER_WINDOW') {
    const { startPrayer, endPrayer } = state.windowDraft;
    if (!startPrayer || !endPrayer) {
      return { status: 'INVALID', reason: 'Select start and end prayers' };
    }
    if (startPrayer === endPrayer) {
      return { status: 'INVALID', reason: 'Start and end prayer cannot be the same' };
    }
    const startIdx = PRAYER_ORDER.indexOf(startPrayer);
    const endIdx = PRAYER_ORDER.indexOf(endPrayer);
    if (startIdx >= endIdx) {
      return { status: 'INVALID', reason: 'Prayer window cannot wrap around midnight in v1' };
    }

    const eligiblePrayers = PRAYER_ORDER.slice(startIdx, endIdx);
    const startName = PRAYER_NAMES[startPrayer];
    const endName = PRAYER_NAMES[endPrayer];

    return {
      status: 'READY',
      primaryLabel: `${startName} → ${endName}`,
      secondaryLabel: `Visible during ${eligiblePrayers.map(p => PRAYER_NAMES[p]).join(', ')}`,
    };
  }

  // Temporal inputs check for Exact Time & Prayer Relative
  if (!temporalInputs || !temporalInputs.coordinates || !temporalInputs.params) {
    return {
      status: 'CONTEXT_UNAVAILABLE',
      reason: 'Configure location in Settings to calculate prayer schedule',
    };
  }

  const seedDate = state.civilSeedDate;

  // 3. Exact Time
  if (state.scheduleMode === 'EXACT_TIME') {
    const time = state.exactDraft.localTime?.trim();
    if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return { status: 'INVALID', reason: 'Invalid time format (HH:mm)' };
    }

    try {
      const timeline = buildPrayerTimeline(
        seedDate,
        temporalInputs.coordinates,
        temporalInputs.params
      );
      const context: SchedulingContext = {
        timeline,
        planningDayConfig: temporalInputs.planningDayConfig,
      };

      const previewDef = createPreviewDefinition(state);
      const placement = resolvePlacement(previewDef, seedDate, context);

      const parsedTime = DateTime.fromFormat(time, 'HH:mm');
      const formattedTime = parsedTime.isValid ? parsedTime.toFormat('h:mm a') : time;
      const prayerSection = placement.calculatedPrayerSection
        ? PRAYER_NAMES[placement.calculatedPrayerSection]
        : null;

      return {
        status: 'READY',
        primaryLabel: prayerSection ? `${formattedTime} · ${prayerSection}` : formattedTime,
        secondaryLabel: `Exact wall-clock time on ${seedDate}`,
      };
    } catch (err: any) {
      return {
        status: 'INVALID',
        reason: err?.message ?? 'Unable to resolve schedule placement',
      };
    }
  }

  // 4. Relative to Prayer
  if (state.scheduleMode === 'PRAYER_RELATIVE') {
    const { prayer, relation, offsetMinutes } = state.relativeDraft;
    if (!prayer || (prayer as string) === 'SUNRISE') {
      return { status: 'INVALID', reason: 'Invalid prayer anchor' };
    }
    if (typeof offsetMinutes !== 'number' || isNaN(offsetMinutes) || offsetMinutes < 0) {
      return { status: 'INVALID', reason: 'Offset must be a non-negative integer' };
    }

    try {
      const timeline = buildPrayerTimeline(
        seedDate,
        temporalInputs.coordinates,
        temporalInputs.params
      );
      const context: SchedulingContext = {
        timeline,
        planningDayConfig: temporalInputs.planningDayConfig,
      };

      const previewDef = createPreviewDefinition(state);
      const placement = resolvePlacement(previewDef, seedDate, context);

      const prayerName = PRAYER_NAMES[prayer];
      let offsetStr: string;
      if (offsetMinutes === 0) {
        offsetStr = `At ${prayerName}`;
      } else {
        offsetStr = `${offsetMinutes} min ${relation.toLowerCase()} ${prayerName}`;
      }

      let timeStr = '';
      if (placement.calculatedStartTime) {
        const dt = placement.calculatedStartTime.setZone(temporalInputs.params.timezone);
        if (dt.isValid) {
          timeStr = dt.toFormat('h:mm a');
        }
      }

      const calculatedSection = placement.calculatedPrayerSection
        ? PRAYER_NAMES[placement.calculatedPrayerSection]
        : null;

      const secondary = calculatedSection && timeStr
        ? `${timeStr} · ${calculatedSection}`
        : timeStr || `Anchored to ${prayerName}`;

      return {
        status: 'READY',
        primaryLabel: offsetStr,
        secondaryLabel: secondary,
      };
    } catch (err: any) {
      return {
        status: 'INVALID',
        reason: err?.message ?? 'Unable to resolve prayer placement',
      };
    }
  }

  return { status: 'INVALID', reason: 'Unsupported schedule mode' };
}
