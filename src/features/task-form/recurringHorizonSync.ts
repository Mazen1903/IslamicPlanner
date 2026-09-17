import { TaskDefinitionRepository, taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { TaskOccurrenceRepository, taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { RecurrenceEngine } from '@/domain/recurrence/RecurrenceEngine';
import { MaterializationEngine, materializationEngine as defaultMaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { HijriService } from '@/domain/calendar/HijriService';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import type { SchedulingContext } from '@/domain/scheduling/types';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';
import type { CivilDateRange, RecurrenceContext } from '@/domain/recurrence/types';
import type { TodayTemporalInputs } from '@/services/types';
import type { HorizonSyncResult, CalendarRangeSyncResult, SyncIssue } from './types';

/**
 * Generates desired seeds for a specific TaskDefinition version within its effective
 * window intersected with the synchronization horizon.
 *
 * Invariant (Rev 6 §2):
 * All seed determination delegates to RecurrenceEngine.generateSeedDates.
 * M10 code MUST NOT implement recurrence membership logic itself for any kind.
 */
export function generateVersionSeeds(
  version: TaskDefinition,
  horizon: CivilDateRange,
  engine: RecurrenceEngine,
  recurrenceCtx?: RecurrenceContext
): string[] {
  const kind = engine.classifyRecurrence(version);

  // Compute version's effective window intersected with horizon (early-exit optimization)
  const versionStart = version.effectiveFromDate ?? version.startDate;
  const versionEnd = version.effectiveToDate ?? horizon.end;
  if (versionStart > horizon.end || versionEnd < horizon.start) {
    return [];
  }

  const windowStart = versionStart > horizon.start ? versionStart : horizon.start;
  const windowEnd = versionEnd < horizon.end ? versionEnd : horizon.end;

  // Delegate to M9 for ALL recurrence kinds (NON_RECURRING, GREGORIAN, HIJRI)
  return engine.generateSeedDates(
    version,
    { start: windowStart, end: windowEnd },
    kind === 'HIJRI' ? recurrenceCtx : undefined
  );
}

export class RecurringHorizonSync {
  constructor(
    private defRepo: TaskDefinitionRepository = taskDefinitionRepository,
    private occRepo: TaskOccurrenceRepository = taskOccurrenceRepository,
    private recEngine: RecurrenceEngine = new RecurrenceEngine(),
    private matEngine: MaterializationEngine = defaultMaterializationEngine,
    private hijri: HijriService = new HijriService()
  ) {}

  /**
   * Synchronizes recurring (and mixed-version) series across the canonical horizon [today - 7, today + 7].
   *
   * Invariants:
   * 1. Two-source discovery: Source A (recurring definitions) UNION Source B (PENDING occurrences).
   * 2. No Source-B skip: Every candidate series proceeds through full PLAN reconciliation.
   * 3. Complete version set: Loads all active versions per series.
   * 4. Plan-before-delete: If ANY step in PLAN fails for a series, ZERO destructive changes occur for it.
   * 5. Terminal immutability: Never deletes or touches COMPLETED, MISSED, or CANCELLED rows.
   * 6. Date-scoped context: Unique PrayerTimeline constructed per seed date.
   */
  async sync(
    horizon: CivilDateRange,
    temporalInputs: TodayTemporalInputs
  ): Promise<HorizonSyncResult> {
    const issues: SyncIssue[] = [];
    let totalCreated = 0;
    let totalRetained = 0;
    let totalDeleted = 0;

    // 1. Two-Source Candidate Discovery
    let recurringDefs: TaskDefinition[] = [];
    try {
      recurringDefs = await this.defRepo.findActiveRecurringIntersectingRange(
        horizon.start,
        horizon.end
      );
    } catch (err: any) {
      issues.push({
        stage: 'DISCOVERY',
        message: `Failed to discover active recurring definitions: ${err?.message ?? err}`,
      });
      return {
        seriesProcessed: 0,
        created: 0,
        retained: 0,
        deleted: 0,
        issues,
      };
    }

    let pendingOccurrences: { seriesId: string }[] = [];
    try {
      pendingOccurrences = await this.occRepo.findPendingByLocalDateRange(
        horizon.start,
        horizon.end
      );
    } catch (err: any) {
      issues.push({
        stage: 'DISCOVERY',
        message: `Failed to discover pending occurrences: ${err?.message ?? err}`,
      });
      return {
        seriesProcessed: 0,
        created: 0,
        retained: 0,
        deleted: 0,
        issues,
      };
    }

    const candidateSeriesIds = Array.from(
      new Set([
        ...recurringDefs.map(d => d.seriesId),
        ...pendingOccurrences.map(o => o.seriesId),
      ])
    );

    let recurrenceCtx: RecurrenceContext | undefined;
    try {
      recurrenceCtx = {
        hijriService: this.hijri,
        hijriAdjustment: { globalAdjustment: 0 },
      };
    } catch (err: any) {
      issues.push({
        stage: 'CONTEXT',
        message: `Failed to initialize Hijri recurrence context: ${err?.message ?? err}`,
      });
    }

    let seriesProcessed = 0;

    for (const seriesId of candidateSeriesIds) {
      const res = await this.syncSeries(
        seriesId,
        horizon,
        temporalInputs,
        recurrenceCtx
      );
      seriesProcessed++;
      totalCreated += res.created;
      totalRetained += res.retained;
      totalDeleted += res.deleted;
      if (res.issues.length > 0) {
        issues.push(...res.issues);
      }
    }

    return {
      seriesProcessed,
      created: totalCreated,
      retained: totalRetained,
      deleted: totalDeleted,
      issues,
    };
  }

  /**
   * Synchronizes a single candidate series across the horizon.
   */
  async syncSeries(
    seriesId: string,
    horizon: CivilDateRange,
    temporalInputs: TodayTemporalInputs,
    recurrenceCtx?: RecurrenceContext
  ): Promise<{ created: number; retained: number; deleted: number; issues: SyncIssue[] }> {
    const issues: SyncIssue[] = [];
    let created = 0;
    let retained = 0;
    let deleted = 0;

    // ==========================================
    // PHASE: PLAN (Must succeed 100% before any mutation)
    // ==========================================
    let activeVersions: TaskDefinition[] = [];
    try {
      const allVersions = await this.defRepo.findBySeriesId(seriesId);
      activeVersions = allVersions.filter(v => v.isActive);
    } catch (err: any) {
      issues.push({
        stage: 'DISCOVERY',
        seriesId,
        message: `PLAN failed loading versions: ${err?.message ?? err}`,
      });
      return { created: 0, retained: 0, deleted: 0, issues };
    }

    const desiredSeeds: string[] = [];
    try {
      for (const version of activeVersions) {
        const seeds = generateVersionSeeds(version, horizon, this.recEngine, recurrenceCtx);
        desiredSeeds.push(...seeds);
      }
    } catch (err: any) {
      issues.push({
        stage: 'RECURRENCE',
        seriesId,
        message: `PLAN failed generating desired recurrence seeds: ${err?.message ?? err}`,
      });
      return { created: 0, retained: 0, deleted: 0, issues };
    }

    const uniqueDesiredSeeds = Array.from(new Set(desiredSeeds)).sort();
    const desiredSet = new Set(uniqueDesiredSeeds);

    let existingPending: import('@/domain/task/types').TaskOccurrence[] = [];
    try {
      existingPending = await this.occRepo.findPendingBySeriesAndDateRange(
        seriesId,
        horizon.start,
        horizon.end
      );
    } catch (err: any) {
      issues.push({
        stage: 'DISCOVERY',
        seriesId,
        message: `PLAN failed querying existing pending occurrences: ${err?.message ?? err}`,
      });
      return { created: 0, retained: 0, deleted: 0, issues };
    }

    const existingPendingByDate = new Map(existingPending.map(o => [o.localDate, o]));
    const toDelete = existingPending.filter(o => !desiredSet.has(o.localDate));
    const toRetain = uniqueDesiredSeeds.filter(d => existingPendingByDate.has(d));
    const toCreate = uniqueDesiredSeeds.filter(d => !existingPendingByDate.has(d));

    // ==========================================
    // PHASE: EXECUTE (PLAN succeeded; execute changes)
    // ==========================================

    // 1. Delete obsolete PENDING occurrences
    for (const occ of toDelete) {
      try {
        await this.occRepo.delete(occ.id);
        deleted++;
      } catch (err: any) {
        issues.push({
          stage: 'DELETE',
          seriesId,
          seedDate: occ.localDate,
          message: `Failed to delete obsolete pending occurrence ${occ.id}: ${err?.message ?? err}`,
        });
      }
    }

    // 2. Materialize retained and new occurrences
    const seedsToMaterialize = [...toRetain, ...toCreate];
    for (const seedDate of seedsToMaterialize) {
      let context: SchedulingContext;
      try {
        const timeline = buildPrayerTimeline(
          seedDate,
          temporalInputs.coordinates,
          temporalInputs.params
        );
        context = {
          timeline,
          planningDayConfig: temporalInputs.planningDayConfig,
        };
      } catch (err: any) {
        issues.push({
          stage: 'CONTEXT',
          seriesId,
          seedDate,
          message: `Failed to build date-scoped scheduling context for ${seedDate}: ${err?.message ?? err}`,
        });
        continue;
      }

      try {
        const res = await this.matEngine.materializeOne({ seriesId, seedDate }, context);
        if (res.action === 'CREATED') {
          created++;
        } else {
          retained++;
        }
      } catch (err: any) {
        issues.push({
          stage: 'MATERIALIZE',
          seriesId,
          seedDate,
          message: `Failed to materialize occurrence for ${seedDate}: ${err?.message ?? err}`,
        });
      }
    }

    return { created, retained, deleted, issues };
  }

  /**
   * Synchronizes occurrences for a Calendar month range (candidateSeedRange = [monthStart - 2, monthEnd + 2]).
   *
   * Invariants (M14):
   * 1. Two-source discovery:
   *    Source A: active recurring defs intersecting candidate range + active non-recurring defs in candidate range
   *    Source B: existing PENDING occurrences via findPendingByLocalDateRange (both recurring and non-recurring)
   * 2. Split create vs. update policy:
   *    - createAllowedPlanningDayKeyRange is passed to materializeOne.
   *    - Missing occurrences are only created if derived planningDayKey is within createAllowedRange.
   *    - Existing PENDING occurrences are always canonically rematerialized even if their new placement
   *      moves out of or into the visible month.
   * 3. Terminal immutability: Never mutates COMPLETED, MISSED, or CANCELLED occurrences.
   * 4. Zero deletion: Calendar never deletes PENDING occurrences.
   * 5. Zero lifecycle sweep: Calendar never runs lifecycle sweep.
   * 6. Error isolation: If scheduling resolution fails (e.g. INSUFFICIENT_TIMELINE for extreme offset),
   *    records a SyncIssue and continues without crashing.
   */
  async syncRange(
    candidateSeedRange: CivilDateRange,
    createAllowedRange: { start: string; end: string },
    temporalInputs: TodayTemporalInputs
  ): Promise<CalendarRangeSyncResult> {
    const issues: SyncIssue[] = [];
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkippedCompleted = 0;
    let totalSkippedMissed = 0;
    let totalSkippedCancelled = 0;
    let totalSkippedCreateOutOfRange = 0;

    // 1. Candidate Discovery
    // A1. Active recurring definitions intersecting candidateSeedRange
    let recurringDefs: TaskDefinition[] = [];
    try {
      recurringDefs = await this.defRepo.findActiveRecurringIntersectingRange(
        candidateSeedRange.start,
        candidateSeedRange.end
      );
    } catch (err: any) {
      issues.push({
        stage: 'DISCOVERY',
        message: `Failed to discover active recurring definitions: ${err?.message ?? err}`,
      });
    }

    // A2. Active non-recurring definitions with startDate in candidateSeedRange
    let nonRecurringDefs: TaskDefinition[] = [];
    try {
      nonRecurringDefs = await this.defRepo.findActiveNonRecurringByStartDateRange(
        candidateSeedRange.start,
        candidateSeedRange.end
      );
    } catch (err: any) {
      issues.push({
        stage: 'DISCOVERY',
        message: `Failed to discover active non-recurring definitions: ${err?.message ?? err}`,
      });
    }

    // B. Existing PENDING occurrences in candidateSeedRange (by stable localDate)
    let pendingOccurrences: TaskOccurrence[] = [];
    try {
      pendingOccurrences = await this.occRepo.findPendingByLocalDateRange(
        candidateSeedRange.start,
        candidateSeedRange.end
      );
    } catch (err: any) {
      issues.push({
        stage: 'DISCOVERY',
        message: `Failed to discover pending occurrences: ${err?.message ?? err}`,
      });
    }

    // Initialize Hijri context if needed for recurrence
    let recurrenceCtx: RecurrenceContext | undefined;
    try {
      recurrenceCtx = {
        hijriService: this.hijri,
        hijriAdjustment: { globalAdjustment: 0 },
      };
    } catch (err: any) {
      issues.push({
        stage: 'CONTEXT',
        message: `Failed to initialize Hijri recurrence context: ${err?.message ?? err}`,
      });
    }

    // Collect all candidate (seriesId, seedDate) pairs to materialize
    // Map of seriesId -> Set<seedDate>
    const candidatesBySeries = new Map<string, Set<string>>();

    const addCandidate = (seriesId: string, seedDate: string) => {
      let set = candidatesBySeries.get(seriesId);
      if (!set) {
        set = new Set<string>();
        candidatesBySeries.set(seriesId, set);
      }
      set.add(seedDate);
    };

    // 1. Add non-recurring definition seeds
    for (const def of nonRecurringDefs) {
      addCandidate(def.seriesId, def.startDate);
    }

    // 2. Add recurring definition desired seeds
    const recurringSeriesIds = Array.from(new Set(recurringDefs.map(d => d.seriesId)));
    for (const seriesId of recurringSeriesIds) {
      try {
        const allVersions = await this.defRepo.findBySeriesId(seriesId);
        const activeVersions = allVersions.filter(v => v.isActive);
        for (const version of activeVersions) {
          const seeds = generateVersionSeeds(version, candidateSeedRange, this.recEngine, recurrenceCtx);
          for (const s of seeds) {
            addCandidate(seriesId, s);
          }
        }
      } catch (err: any) {
        issues.push({
          stage: 'RECURRENCE',
          seriesId,
          message: `Failed generating recurrence seeds for series ${seriesId}: ${err?.message ?? err}`,
        });
      }
    }

    // 3. Add ALL Source-B existing PENDING occurrences (guarantees non-recurring and recurring PENDING are included!)
    for (const occ of pendingOccurrences) {
      addCandidate(occ.seriesId, occ.localDate);
    }

    let seriesProcessed = 0;

    // Process all candidate pairs
    for (const [seriesId, seeds] of candidatesBySeries.entries()) {
      seriesProcessed++;
      const sortedSeeds = Array.from(seeds).sort();

      for (const seedDate of sortedSeeds) {
        let context: SchedulingContext;
        try {
          const timeline = buildPrayerTimeline(
            seedDate,
            temporalInputs.coordinates,
            temporalInputs.params
          );
          context = {
            timeline,
            planningDayConfig: temporalInputs.planningDayConfig,
          };
        } catch (err: any) {
          issues.push({
            stage: 'CONTEXT',
            seriesId,
            seedDate,
            message: `Failed to build date-scoped scheduling context for ${seedDate}: ${err?.message ?? err}`,
          });
          continue;
        }

        try {
          const res = await this.matEngine.materializeOne(
            {
              seriesId,
              seedDate,
              createAllowedPlanningDayKeyRange: createAllowedRange,
            },
            context
          );

          switch (res.action) {
            case 'CREATED':
              totalCreated++;
              break;
            case 'UPDATED':
              totalUpdated++;
              break;
            case 'SKIPPED_COMPLETED':
              totalSkippedCompleted++;
              break;
            case 'SKIPPED_MISSED':
              totalSkippedMissed++;
              break;
            case 'SKIPPED_CANCELLED':
              totalSkippedCancelled++;
              break;
            case 'SKIPPED_CREATE_OUT_OF_RANGE':
              totalSkippedCreateOutOfRange++;
              break;
          }
        } catch (err: any) {
          // Failure isolation: large offsets (INSUFFICIENT_TIMELINE) or other scheduling issues
          // are recorded as per-item sync issues; does not crash the month sync.
          issues.push({
            stage: 'MATERIALIZE',
            seriesId,
            seedDate,
            message: `Failed to materialize occurrence for ${seedDate}: ${err?.message ?? err}`,
          });
        }
      }
    }

    return {
      seriesProcessed,
      created: totalCreated,
      updated: totalUpdated,
      skippedCompleted: totalSkippedCompleted,
      skippedMissed: totalSkippedMissed,
      skippedCancelled: totalSkippedCancelled,
      skippedCreateOutOfRange: totalSkippedCreateOutOfRange,
      issues,
    };
  }
}

export const recurringHorizonSync = new RecurringHorizonSync();
