import { DateTime } from 'luxon';
import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';
import type { TaskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import type { TaskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import type { TodayTemporalInputs } from './types';
import type { PrayerTimeline } from '@/domain/prayer/types';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import { PlanningDayEngine } from '@/domain/planning-day/PlanningDayEngine';

export interface LifecycleSweepError {
  occurrenceId: string;
  error: unknown;
}

export interface LifecycleSweepResult {
  evaluatedCount: number;
  expiredCount: number;
  mutatedCount: number;
  errors: LifecycleSweepError[];
}

export interface OccurrenceLifecycleServiceAPI {
  sweepExpired(now: DateTime, inputs?: TodayTemporalInputs): Promise<LifecycleSweepResult>;
}

/**
 * OccurrenceLifecycleService manages the lifecycle evaluation and state transitions
 * of materialized task occurrences.
 *
 * Invariants:
 * 1. Queries all already-materialized PENDING occurrences (no planningDayKey or horizon filter).
 * 2. Never creates occurrences; never modifies terminal rows (COMPLETED, MISSED, CANCELLED).
 * 3. Uses fresh TodayTemporalInputs provided per execution (no stale process-lifetime state).
 * 4. Resolves EXACT_TIME and PRAYER_RELATIVE missed boundaries using date-scoped timelines
 *    centered on the local civil date containing calculatedStartTime in the configured timezone.
 * 5. Resolves ANYTIME_TODAY missed boundaries using PlanningDayEngine.resolvePlanningDayBoundaries
 *    with the occurrence's planningDayKey under current configured PlanningDay rule.
 * 6. Resolves PRAYER_WINDOW missed boundaries using stored windowEnd.
 * 7. Half-open expiry: now >= missedBoundary => expired.
 * 8. Transitions expired occurrences to MISSED via atomic updateStatus SQL guard.
 * 9. Caches PrayerTimeline instances by civil date within a single sweep.
 */
export class OccurrenceLifecycleService implements OccurrenceLifecycleServiceAPI {
  constructor(
    private readonly occRepo: TaskOccurrenceRepository = taskOccurrenceRepository,
    private readonly defRepo: TaskDefinitionRepository = taskDefinitionRepository,
    private readonly defaultInputs?: TodayTemporalInputs
  ) {}

  /**
   * Sweeps all materialized PENDING occurrences and transitions any that are past their
   * missed boundary to MISSED status atomically.
   */
  async sweepExpired(now: DateTime, inputs?: TodayTemporalInputs): Promise<LifecycleSweepResult> {
    const effectiveInputs = inputs ?? this.defaultInputs;
    if (!effectiveInputs) {
      throw new Error('TodayTemporalInputs must be provided to sweepExpired or constructor');
    }

    const pendingOccurrences = await this.occRepo.findAllMaterializedPending();
    if (pendingOccurrences.length === 0) {
      return {
        evaluatedCount: 0,
        expiredCount: 0,
        mutatedCount: 0,
        errors: [],
      };
    }

    // Batch load referenced TaskDefinitions
    const uniqueDefIds = Array.from(new Set(pendingOccurrences.map(occ => occ.taskDefinitionId)));
    const defMap = new Map<string, TaskDefinition>();
    await Promise.all(
      uniqueDefIds.map(async id => {
        const def = await this.defRepo.findById(id);
        if (def) {
          defMap.set(id, def);
        }
      })
    );

    // Timeline cache scoped to this single sweep operation
    const timelineCache = new Map<string, PrayerTimeline>();

    const getTimelineForDate = (dateStr: string): PrayerTimeline => {
      let timeline = timelineCache.get(dateStr);
      if (!timeline) {
        timeline = buildPrayerTimeline(
          dateStr,
          effectiveInputs.coordinates,
          effectiveInputs.params
        );
        timelineCache.set(dateStr, timeline);
      }
      return timeline;
    };

    let evaluatedCount = 0;
    let expiredCount = 0;
    let mutatedCount = 0;
    const errors: LifecycleSweepError[] = [];

    const nowMs = now.toMillis();

    for (const occ of pendingOccurrences) {
      evaluatedCount++;

      const def = defMap.get(occ.taskDefinitionId);
      if (!def) {
        continue;
      }

      const missedBoundary = this.resolveMissedBoundary(
        occ,
        def,
        effectiveInputs,
        getTimelineForDate
      );

      if (!missedBoundary || !missedBoundary.isValid) {
        continue;
      }

      // Half-open comparison: now >= missedBoundary => expired
      if (nowMs >= missedBoundary.toMillis()) {
        expiredCount++;
        try {
          await this.occRepo.updateStatus(occ.id, 'MISSED', missedBoundary.toISO()!);
          mutatedCount++;
        } catch (err) {
          // If another terminal transition won (e.g. concurrent user completion),
          // preserve the winner and record the error
          errors.push({ occurrenceId: occ.id, error: err });
        }
      }
    }

    return {
      evaluatedCount,
      expiredCount,
      mutatedCount,
      errors,
    };
  }

  /**
   * Resolves the concrete missed boundary for an occurrence based on its schedule type.
   */
  private resolveMissedBoundary(
    occ: TaskOccurrence,
    def: TaskDefinition,
    inputs: TodayTemporalInputs,
    getTimelineForDate: (dateStr: string) => PrayerTimeline
  ): DateTime | null {
    switch (def.scheduleType) {
      case 'EXACT_TIME':
      case 'PRAYER_RELATIVE': {
        if (!occ.calculatedStartTime) {
          return null;
        }

        // Canonical sequence (Clarification A):
        // 1. Parse calculatedStartTime as stored UTC instant
        const instantUtc = DateTime.fromISO(occ.calculatedStartTime, { zone: 'utc' });
        if (!instantUtc.isValid) {
          return null;
        }

        // 2. Convert to configured current temporal timezone
        const localInstant = instantUtc.setZone(inputs.params.timezone);

        // 3. Derive local civil date containing calculatedStartTime
        const localCivilDate = localInstant.toISODate();
        if (!localCivilDate) {
          return null;
        }

        // 4. Build/retrieve PrayerTimeline centered on THAT local civil date
        const timeline = getTimelineForDate(localCivilDate);

        // 5. Find concrete PrayerPeriodInstance whose [start, end) contains calculatedStartTime
        try {
          const concretePeriod = timeline.findPeriod(instantUtc);
          // 6. missedBoundary = concretePeriod.end
          return concretePeriod.end;
        } catch {
          return null;
        }
      }

      case 'PRAYER_WINDOW': {
        if (!occ.windowEnd) {
          return null;
        }
        const windowEndDt = DateTime.fromISO(occ.windowEnd, { zone: 'utc' });
        return windowEndDt.isValid ? windowEndDt : null;
      }

      case 'ANYTIME_TODAY': {
        if (!occ.planningDayKey) {
          return null;
        }

        // Build/retrieve timeline centered on occurrence.planningDayKey
        const timeline = getTimelineForDate(occ.planningDayKey);

        try {
          const boundaries = PlanningDayEngine.resolvePlanningDayBoundaries(
            inputs.planningDayConfig,
            timeline,
            occ.planningDayKey
          );
          return boundaries.end;
        } catch {
          return null;
        }
      }

      default:
        return null;
    }
  }
}

export const occurrenceLifecycleService = new OccurrenceLifecycleService();
