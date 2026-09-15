import { runInTransaction } from '@/data/db';
import {
  taskOccurrenceRepository,
  TaskOccurrenceRepository,
  type PlacementUpdateResult,
} from '@/data/repositories/TaskOccurrenceRepository';
import {
  taskDefinitionRepository,
  TaskDefinitionRepository,
} from '@/data/repositories/TaskDefinitionRepository';
import { SchedulingEngine } from '@/domain/scheduling/SchedulingEngine';
import {
  SchedulingResolutionError,
  type SchedulingContext,
  type ResolvedPlacement,
  type SchedulingEngineAPI,
} from '@/domain/scheduling/types';
import type { DerivedPlacement, TaskDefinition } from '@/domain/task/types';
import { getEffectiveTimezone } from '@/domain/temporal/timezoneUtils';
import {
  assertValidCivilDate,
  isValidCivilDate,
  canonicalizeIsoInstant,
} from '@/utils/dateValidation';
import {
  DefinitionVersionConflictError,
  DataIntegrityError,
  TaskValidationError,
} from '@/domain/task/errors';
import {
  MaterializationError,
  type MaterializationEngineAPI,
  type MaterializationRequest,
  type MaterializationResult,
  type MaterializationSummary,
} from './types';

function wrapUnexpectedError(err: unknown): MaterializationError {
  if (err instanceof MaterializationError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new MaterializationError('PERSISTENCE_FAILED', `Persistence operation failed: ${message}`, {
    cause: err,
  });
}

export class MaterializationEngine implements MaterializationEngineAPI {
  constructor(
    private readonly occurrenceRepo: TaskOccurrenceRepository = taskOccurrenceRepository,
    private readonly definitionRepo: TaskDefinitionRepository = taskDefinitionRepository,
    private readonly schedulingEngine: SchedulingEngineAPI = SchedulingEngine
  ) {}

  /**
   * Sole mutation algorithm: materializes or refreshes a single TaskOccurrence.
   *
   * Order of execution:
   * 1. Public request validation
   * 2. Transaction isolation
   * 3. Logical occurrence lookup by (seriesId, seedDate)
   * 4. Terminal short-circuit (COMPLETED, MISSED, CANCELLED tombstones) before temporal context access
   * 5. Governing version selection
   * 6. Version conflict check for existing PENDING row
   * 7. M5 SchedulingEngine resolution & canonical UTC mapping
   * 8. Guarded PENDING placement update with terminal race handling
   * 9. Occurrence creation with concurrency protection
   */
  async materializeOne(
    request: MaterializationRequest,
    context: SchedulingContext
  ): Promise<MaterializationResult> {
    // 1. Validate public request boundary
    if (!request || typeof request !== 'object') {
      throw new MaterializationError('INVALID_REQUEST', 'MaterializationRequest must be an object');
    }
    if (!request.seriesId || typeof request.seriesId !== 'string' || request.seriesId.trim() === '') {
      throw new MaterializationError('INVALID_REQUEST', 'seriesId must be a non-empty string');
    }
    if (!request.seedDate || typeof request.seedDate !== 'string' || !isValidCivilDate(request.seedDate)) {
      throw new MaterializationError(
        'INVALID_SEED_DATE',
        `seedDate must be a valid civil date (YYYY-MM-DD). Received: ${request.seedDate}`
      );
    }

    // 2. Execute within canonical transaction
    return await runInTransaction(async (tx) => {
      // 3. Logical occurrence lookup by natural key
      let existing = await this.occurrenceRepo.findBySeriesAndDate(
        request.seriesId,
        request.seedDate,
        tx
      );

      // 4. TERMINAL SHORT-CIRCUIT: Handled BEFORE version lookup, timezone, or M5 scheduling
      if (existing) {
        if (existing.status === 'COMPLETED') {
          return {
            seriesId: request.seriesId,
            seedDate: request.seedDate,
            action: 'SKIPPED_COMPLETED',
            occurrenceId: existing.id,
          };
        }
        if (existing.status === 'MISSED') {
          return {
            seriesId: request.seriesId,
            seedDate: request.seedDate,
            action: 'SKIPPED_MISSED',
            occurrenceId: existing.id,
          };
        }
        if (existing.status === 'CANCELLED') {
          return {
            seriesId: request.seriesId,
            seedDate: request.seedDate,
            action: 'SKIPPED_CANCELLED',
            occurrenceId: existing.id,
          };
        }
      }

      // 5. Governing version selection
      let governing: TaskDefinition | null;
      try {
        governing = await this.definitionRepo.findVersionForSeedDate(
          request.seriesId,
          request.seedDate,
          tx
        );
      } catch (err) {
        if (err instanceof DefinitionVersionConflictError) {
          throw new MaterializationError(
            'DEFINITION_VERSION_CONFLICT',
            err.message,
            { cause: err }
          );
        }
        throw wrapUnexpectedError(err);
      }

      if (!governing) {
        throw new MaterializationError(
          'NO_GOVERNING_VERSION',
          `No governing TaskDefinition version found for series ${request.seriesId} on seed date ${request.seedDate}`
        );
      }

      // 6. Version conflict check for existing PENDING row
      if (existing && existing.taskDefinitionId !== governing.id) {
        throw new MaterializationError(
          'OCCURRENCE_VERSION_CONFLICT',
          `Pending occurrence ${existing.id} references taskDefinitionId ${existing.taskDefinitionId}, but governing version is ${governing.id}`
        );
      }

      // 7. Temporal context access & M5 placement calculation (only when CREATE or UPDATE needed)
      let timezone: string;
      try {
        timezone = getEffectiveTimezone(context.timeline);
      } catch (err) {
        throw new MaterializationError(
          'SCHEDULING_RESOLUTION_FAILED',
          `Failed to derive effective timezone: ${(err as Error).message}`,
          { cause: err }
        );
      }

      let placement: ResolvedPlacement;
      try {
        placement = this.schedulingEngine.resolvePlacement(governing, request.seedDate, context);
      } catch (err) {
        if (err instanceof SchedulingResolutionError) {
          throw new MaterializationError(
            'SCHEDULING_RESOLUTION_FAILED',
            `Scheduling resolution failed: ${err.message}`,
            { cause: err }
          );
        }
        throw wrapUnexpectedError(err);
      }

      const derived = this.placementToDerived(placement, timezone);

      // 8. If PENDING row already exists, perform guarded placement update
      if (existing) {
        let updateResult: PlacementUpdateResult;
        try {
          updateResult = await this.occurrenceRepo.updateDerivedPlacement(existing.id, derived, tx);
        } catch (err) {
          if (err instanceof TaskValidationError || err instanceof DataIntegrityError) {
            throw new MaterializationError('DATA_INTEGRITY', err.message, { cause: err });
          }
          throw wrapUnexpectedError(err);
        }

        if (updateResult.outcome === 'UPDATED') {
          return {
            seriesId: request.seriesId,
            seedDate: request.seedDate,
            action: 'UPDATED',
            occurrenceId: updateResult.occurrence.id,
          };
        }

        if (updateResult.outcome === 'NOT_PENDING') {
          const s = updateResult.occurrence.status;
          if (s === 'COMPLETED') {
            return {
              seriesId: request.seriesId,
              seedDate: request.seedDate,
              action: 'SKIPPED_COMPLETED',
              occurrenceId: updateResult.occurrence.id,
            };
          }
          if (s === 'MISSED') {
            return {
              seriesId: request.seriesId,
              seedDate: request.seedDate,
              action: 'SKIPPED_MISSED',
              occurrenceId: updateResult.occurrence.id,
            };
          }
          if (s === 'CANCELLED') {
            return {
              seriesId: request.seriesId,
              seedDate: request.seedDate,
              action: 'SKIPPED_CANCELLED',
              occurrenceId: updateResult.occurrence.id,
            };
          }
          throw new MaterializationError(
            'DATA_INTEGRITY',
            `Unexpected status ${s} on NOT_PENDING occurrence ${updateResult.occurrence.id}`
          );
        }

        if (updateResult.outcome === 'NOT_FOUND') {
          throw new MaterializationError(
            'DATA_INTEGRITY',
            `Existing occurrence ${existing.id} not found during guarded placement update`
          );
        }
      }

      // 9. No existing row -> create new PENDING occurrence
      try {
        const created = await this.occurrenceRepo.create(
          {
            taskDefinitionId: governing.id,
            seriesId: governing.seriesId,
            localDate: request.seedDate,
            planningDayKey: derived.planningDayKey,
            timezone,
            calculatedStartTime: derived.calculatedStartTime,
            calculatedPrayerSection: derived.calculatedPrayerSection,
            eligiblePrayerSections: derived.eligiblePrayerSections,
            wallClockResolution: derived.wallClockResolution,
            windowStart: derived.windowStart,
            windowEnd: derived.windowEnd,
            status: 'PENDING',
          },
          tx
        );

        return {
          seriesId: request.seriesId,
          seedDate: request.seedDate,
          action: 'CREATED',
          occurrenceId: created.id,
        };
      } catch (err: any) {
        // Concurrency protection: handle UNIQUE constraint race on (seriesId, localDate)
        if (
          err instanceof DataIntegrityError &&
          err.message &&
          err.message.includes('UNIQUE constraint failed')
        ) {
          if (
            err.message.includes('unique_series_date') ||
            err.message.includes('task_occurrences.series_id') ||
            err.message.includes('unique_def_date') ||
            err.message.includes('task_occurrences.task_definition_id')
          ) {
            // Re-read by natural logical key and apply decision matrix
            const concurrent = await this.occurrenceRepo.findBySeriesAndDate(
              request.seriesId,
              request.seedDate,
              tx
            );
            if (concurrent) {
              if (concurrent.status === 'COMPLETED') {
                return {
                  seriesId: request.seriesId,
                  seedDate: request.seedDate,
                  action: 'SKIPPED_COMPLETED',
                  occurrenceId: concurrent.id,
                };
              }
              if (concurrent.status === 'MISSED') {
                return {
                  seriesId: request.seriesId,
                  seedDate: request.seedDate,
                  action: 'SKIPPED_MISSED',
                  occurrenceId: concurrent.id,
                };
              }
              if (concurrent.status === 'CANCELLED') {
                return {
                  seriesId: request.seriesId,
                  seedDate: request.seedDate,
                  action: 'SKIPPED_CANCELLED',
                  occurrenceId: concurrent.id,
                };
              }
              // If PENDING, update placement
              const raceUpdate = await this.occurrenceRepo.updateDerivedPlacement(
                concurrent.id,
                derived,
                tx
              );
              if (raceUpdate.outcome === 'UPDATED') {
                return {
                  seriesId: request.seriesId,
                  seedDate: request.seedDate,
                  action: 'UPDATED',
                  occurrenceId: raceUpdate.occurrence.id,
                };
              }
              if (raceUpdate.outcome === 'NOT_PENDING') {
                const s = raceUpdate.occurrence.status;
                return {
                  seriesId: request.seriesId,
                  seedDate: request.seedDate,
                  action:
                    s === 'COMPLETED'
                      ? 'SKIPPED_COMPLETED'
                      : s === 'MISSED'
                      ? 'SKIPPED_MISSED'
                      : 'SKIPPED_CANCELLED',
                  occurrenceId: raceUpdate.occurrence.id,
                };
              }
            }
          }
        }

        if (err instanceof TaskValidationError || err instanceof DataIntegrityError) {
          throw new MaterializationError('DATA_INTEGRITY', err.message, { cause: err });
        }
        throw wrapUnexpectedError(err);
      }
    });
  }

  /**
   * Materializes a batch of requests with deterministic deduplication and per-item best effort.
   */
  async materializeBatch(
    requests: MaterializationRequest[],
    context: SchedulingContext
  ): Promise<MaterializationSummary> {
    const summary: MaterializationSummary = {
      results: [],
      created: 0,
      updated: 0,
      skippedCompleted: 0,
      skippedMissed: 0,
      skippedCancelled: 0,
      errors: [],
    };

    // Deduplicate by seriesId + seedDate, preserving first-input deterministic order
    const seen = new Set<string>();
    const uniqueRequests: MaterializationRequest[] = [];

    for (const req of requests) {
      const key = `${req.seriesId}::${req.seedDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRequests.push(req);
      }
    }

    for (const req of uniqueRequests) {
      try {
        const result = await this.materializeOne(req, context);
        summary.results.push(result);
        switch (result.action) {
          case 'CREATED':
            summary.created++;
            break;
          case 'UPDATED':
            summary.updated++;
            break;
          case 'SKIPPED_COMPLETED':
            summary.skippedCompleted++;
            break;
          case 'SKIPPED_MISSED':
            summary.skippedMissed++;
            break;
          case 'SKIPPED_CANCELLED':
            summary.skippedCancelled++;
            break;
        }
      } catch (err) {
        const error =
          err instanceof MaterializationError
            ? err
            : wrapUnexpectedError(err);
        summary.errors.push({
          seriesId: req.seriesId,
          seedDate: req.seedDate,
          error,
        });
      }
    }

    return summary;
  }

  /**
   * Discovers and materializes all active non-recurring definitions with startDate in [startDate, endDate].
   */
  async materializeNonRecurring(
    startDate: string,
    endDate: string,
    context: SchedulingContext
  ): Promise<MaterializationSummary> {
    assertValidCivilDate(startDate, 'startDate');
    assertValidCivilDate(endDate, 'endDate');

    const definitions = await this.definitionRepo.findActiveNonRecurringByStartDateRange(
      startDate,
      endDate
    );

    const requests: MaterializationRequest[] = definitions.map(def => ({
      seriesId: def.seriesId,
      seedDate: def.startDate,
    }));

    return this.materializeBatch(requests, context);
  }

  /**
   * Re-evaluates and refreshes derived placement for all PENDING occurrences in [startDate, endDate].
   * Strictly routes through materializeBatch/materializeOne.
   */
  async rematerializePending(
    startDate: string,
    endDate: string,
    context: SchedulingContext
  ): Promise<MaterializationSummary> {
    assertValidCivilDate(startDate, 'startDate');
    assertValidCivilDate(endDate, 'endDate');

    const pendingRows = await this.occurrenceRepo.findPendingByLocalDateRange(
      startDate,
      endDate
    );

    const requests: MaterializationRequest[] = pendingRows.map(row => ({
      seriesId: row.seriesId,
      seedDate: row.localDate,
    }));

    return this.materializeBatch(requests, context);
  }

  /**
   * Internal mapper: converts ResolvedPlacement to DerivedPlacement with canonical UTC instants.
   */
  private placementToDerived(
    placement: ResolvedPlacement,
    timezone: string
  ): DerivedPlacement {
    return {
      calculatedStartTime: placement.calculatedStartTime
        ? canonicalizeIsoInstant(placement.calculatedStartTime.toUTC().toISO()!)
        : null,
      calculatedPrayerSection: placement.calculatedPrayerSection,
      eligiblePrayerSections: placement.eligiblePrayerSections,
      wallClockResolution: placement.wallClockResolution,
      planningDayKey: placement.planningDayKey,
      timezone,
      windowStart: placement.windowStart
        ? canonicalizeIsoInstant(placement.windowStart.toUTC().toISO()!)
        : null,
      windowEnd: placement.windowEnd
        ? canonicalizeIsoInstant(placement.windowEnd.toUTC().toISO()!)
        : null,
    };
  }
}

export const materializationEngine = new MaterializationEngine();
