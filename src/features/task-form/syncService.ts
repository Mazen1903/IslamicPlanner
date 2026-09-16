import { DateTime } from 'luxon';
import { TaskOccurrenceRepository, taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { MaterializationEngine, materializationEngine as defaultMaterializationEngine } from '@/domain/materialization/MaterializationEngine';
import { RecurrenceEngine } from '@/domain/recurrence/RecurrenceEngine';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import type { SchedulingContext } from '@/domain/scheduling/types';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';
import type { CivilDateRange } from '@/domain/recurrence/types';
import type { TodayTemporalInputs } from '@/services/types';
import type { SyncCounts, SyncIssue } from './types';
import { RecurringHorizonSync, recurringHorizonSync as defaultRecurringHorizonSync } from './recurringHorizonSync';

/**
 * Derives canonical ±7 day horizon centered on a civil date.
 */
export function computeSyncHorizon(centerCivilDate: string): CivilDateRange {
  const dt = DateTime.fromISO(centerCivilDate, { zone: 'utc' });
  const start = dt.minus({ days: 7 }).toISODate()!;
  const end = dt.plus({ days: 7 }).toISODate()!;
  return { start, end };
}

export class TaskFormSyncService {
  constructor(
    private occRepo: TaskOccurrenceRepository = taskOccurrenceRepository,
    private matEngine: MaterializationEngine = defaultMaterializationEngine,
    private recEngine: RecurrenceEngine = new RecurrenceEngine(),
    private horizonSync: RecurringHorizonSync = defaultRecurringHorizonSync
  ) {}

  /**
   * Dedicated two-point reconciliation for NON_RECURRING -> NON_RECURRING date edits.
   *
   * Invariants (M10 §24):
   * 1. If oldStartDate === newStartDate: materializeOne at that seed.
   * 2. If changed:
   *    - Find old occurrence.
   *    - If old occurrence is PENDING: physically delete it.
   *    - If old occurrence is terminal (COMPLETED, MISSED, CANCELLED): permanently frozen and untouched.
   *    - Materialize new seed date.
   * 3. Do NOT scan a continuous range between far-apart dates.
   */
  async reconcileNonRecurringMove(
    seriesId: string,
    oldStartDate: string,
    newStartDate: string,
    temporalInputs: TodayTemporalInputs
  ): Promise<{ sync: SyncCounts; issues: SyncIssue[] }> {
    const issues: SyncIssue[] = [];
    let created = 0;
    let retained = 0;
    let deleted = 0;

    // Build context for newStartDate
    let newContext: SchedulingContext;
    try {
      const timeline = buildPrayerTimeline(
        newStartDate,
        temporalInputs.coordinates,
        temporalInputs.params
      );
      newContext = {
        timeline,
        planningDayConfig: temporalInputs.planningDayConfig,
      };
    } catch (err: any) {
      issues.push({
        stage: 'CONTEXT',
        seriesId,
        seedDate: newStartDate,
        message: `Failed to build scheduling context for ${newStartDate}: ${err?.message ?? err}`,
      });
      return { sync: { created: 0, retained: 0, deleted: 0 }, issues };
    }

    if (oldStartDate === newStartDate) {
      try {
        const res = await this.matEngine.materializeOne({ seriesId, seedDate: newStartDate }, newContext);
        if (res.action === 'CREATED') created++;
        else retained++;
      } catch (err: any) {
        issues.push({
          stage: 'MATERIALIZE',
          seriesId,
          seedDate: newStartDate,
          message: `Failed to materialize non-recurring task on ${newStartDate}: ${err?.message ?? err}`,
        });
      }
      return { sync: { created, retained, deleted }, issues };
    }

    // Dates differ: find old occurrence
    let oldOcc: TaskOccurrence | null = null;
    try {
      oldOcc = await this.occRepo.findBySeriesAndDate(seriesId, oldStartDate);
    } catch (err: any) {
      issues.push({
        stage: 'DISCOVERY',
        seriesId,
        seedDate: oldStartDate,
        message: `Failed to look up old occurrence on ${oldStartDate}: ${err?.message ?? err}`,
      });
    }

    if (oldOcc && oldOcc.status === 'PENDING') {
      try {
        await this.occRepo.delete(oldOcc.id);
        deleted++;
      } catch (err: any) {
        issues.push({
          stage: 'DELETE',
          seriesId,
          seedDate: oldStartDate,
          message: `Failed to delete old pending occurrence on ${oldStartDate}: ${err?.message ?? err}`,
        });
      }
    }
    // Note: If oldOcc is COMPLETED, MISSED, or CANCELLED, it is frozen and untouched.

    // Materialize new seed date
    try {
      const res = await this.matEngine.materializeOne({ seriesId, seedDate: newStartDate }, newContext);
      if (res.action === 'CREATED') created++;
      else retained++;
    } catch (err: any) {
      issues.push({
        stage: 'MATERIALIZE',
        seriesId,
        seedDate: newStartDate,
        message: `Failed to materialize occurrence on new date ${newStartDate}: ${err?.message ?? err}`,
      });
    }

    return { sync: { created, retained, deleted }, issues };
  }

  /**
   * Synchronizes occurrences after a CREATE operation.
   */
  async syncOccurrencesAfterCreate(
    definition: TaskDefinition,
    temporalInputs: TodayTemporalInputs
  ): Promise<{ sync: SyncCounts; issues: SyncIssue[] }> {
    const kind = this.recEngine.classifyRecurrence(definition);

    if (kind === 'NON_RECURRING') {
      let context: SchedulingContext;
      try {
        const timeline = buildPrayerTimeline(
          definition.startDate,
          temporalInputs.coordinates,
          temporalInputs.params
        );
        context = {
          timeline,
          planningDayConfig: temporalInputs.planningDayConfig,
        };
      } catch (err: any) {
        return {
          sync: { created: 0, retained: 0, deleted: 0 },
          issues: [
            {
              stage: 'CONTEXT',
              seriesId: definition.seriesId,
              seedDate: definition.startDate,
              message: `Failed to build context for ${definition.startDate}: ${err?.message ?? err}`,
            },
          ],
        };
      }

      try {
        const res = await this.matEngine.materializeOne(
          { seriesId: definition.seriesId, seedDate: definition.startDate },
          context
        );
        return {
          sync: {
            created: res.action === 'CREATED' ? 1 : 0,
            retained: res.action !== 'CREATED' ? 1 : 0,
            deleted: 0,
          },
          issues: [],
        };
      } catch (err: any) {
        return {
          sync: { created: 0, retained: 0, deleted: 0 },
          issues: [
            {
              stage: 'MATERIALIZE',
              seriesId: definition.seriesId,
              seedDate: definition.startDate,
              message: `Materialization failed: ${err?.message ?? err}`,
            },
          ],
        };
      }
    }

    // Recurring (Gregorian or Hijri): full horizon sync for this series
    const horizon = computeSyncHorizon(definition.startDate);
    const res = await this.horizonSync.syncSeries(definition.seriesId, horizon, temporalInputs);
    return {
      sync: { created: res.created, retained: res.retained, deleted: res.deleted },
      issues: res.issues,
    };
  }

  /**
   * Dispatches synchronization after a definition edit according to pre- and post-edit recurrence kinds.
   *
   * Invariant (M10 §23):
   * Capture pre-edit TaskDefinition before mutation.
   * Dispatch:
   * - NON_RECURRING -> NON_RECURRING => reconcileNonRecurringMove()
   * - NON_RECURRING -> RECURRING => full horizon reconciliation
   * - RECURRING -> RECURRING => full horizon reconciliation
   * - RECURRING -> NON_RECURRING => full horizon reconciliation
   */
  async reconcileAfterEdit(
    preDef: TaskDefinition,
    postDef: TaskDefinition,
    temporalInputs: TodayTemporalInputs
  ): Promise<{ sync: SyncCounts; issues: SyncIssue[] }> {
    const preKind = this.recEngine.classifyRecurrence(preDef);
    const postKind = this.recEngine.classifyRecurrence(postDef);

    if (preKind === 'NON_RECURRING' && postKind === 'NON_RECURRING') {
      return await this.reconcileNonRecurringMove(
        postDef.seriesId,
        preDef.startDate,
        postDef.startDate,
        temporalInputs
      );
    }

    // All other transitions: full horizon sync for this series
    const centerDate = postDef.startDate;
    const horizon = computeSyncHorizon(centerDate);
    const res = await this.horizonSync.syncSeries(postDef.seriesId, horizon, temporalInputs);

    return {
      sync: { created: res.created, retained: res.retained, deleted: res.deleted },
      issues: res.issues,
    };
  }
}

export const taskFormSyncService = new TaskFormSyncService();
