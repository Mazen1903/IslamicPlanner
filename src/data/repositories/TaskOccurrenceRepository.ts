import { eq, and, gte, lte, or, ne, isNotNull, gt } from 'drizzle-orm';
import { taskOccurrences, taskDefinitions } from '@/data/schema';
import { getDatabase, runInTransaction, type AppDatabase } from '@/data/db';
import type {
  TaskOccurrence,
  NewTaskOccurrenceInput,
  OccurrenceStatus,
  OccurrenceOverrideData,
  DerivedPlacement,
  Prayer,
} from '@/domain/task/types';
import {
  parseEligiblePrayerSections,
  serializeEligiblePrayerSections,
  parseOverrideData,
  serializeOverrideData,
} from '@/domain/task/jsonBoundary';
import { DataIntegrityError, TaskValidationError } from '@/domain/task/errors';
import { generateUuid } from '@/utils/uuid';
import {
  assertValidCivilDate,
  assertValidIsoInstant,
  canonicalizeIsoInstant,
  assertValidIanaTimezone,
} from '@/utils/dateValidation';

export type PlacementUpdateResult =
  | { outcome: 'UPDATED'; occurrence: TaskOccurrence }
  | { outcome: 'NOT_PENDING'; occurrence: TaskOccurrence }
  | { outcome: 'NOT_FOUND' };

function getDb(tx?: any): AppDatabase {
  return tx ?? getDatabase();
}

function generateId(): string {
  return generateUuid();
}

function mapRowToDomain(row: typeof taskOccurrences.$inferSelect): TaskOccurrence {
  try {
    return {
      id: row.id,
      taskDefinitionId: row.taskDefinitionId,
      seriesId: row.seriesId,
      localDate: row.localDate,
      planningDayKey: row.planningDayKey,
      timezone: row.timezone,
      calculatedStartTime: row.calculatedStartTime,
      calculatedPrayerSection: row.calculatedPrayerSection as Prayer | null,
      eligiblePrayerSections: parseEligiblePrayerSections(row.eligiblePrayerSections),
      wallClockResolution: row.wallClockResolution as TaskOccurrence['wallClockResolution'],
      windowStart: row.windowStart ?? null,
      windowEnd: row.windowEnd ?? null,
      status: row.status as OccurrenceStatus,
      completedAt: row.completedAt,
      missedAt: row.missedAt,
      overrideData: parseOverrideData(row.overrideData),
    };
  } catch (err) {
    throw new DataIntegrityError(
      `Failed to map task_occurrence row ${row.id} to domain model: ${(err as Error).message}`,
      { cause: err }
    );
  }
}

function validateOccurrenceInvariants(input: NewTaskOccurrenceInput): {
  localDate: string;
  planningDayKey: string;
  timezone: string;
  status: OccurrenceStatus;
  completedAt: string | null;
  missedAt: string | null;
  calculatedStartTime: string | null;
} {
  if (!input.taskDefinitionId) {
    throw new TaskValidationError('taskDefinitionId is required');
  }

  assertValidCivilDate(input.localDate, 'localDate');
  assertValidCivilDate(input.planningDayKey, 'planningDayKey');
  assertValidIanaTimezone(input.timezone, 'timezone');

  const status = input.status ?? 'PENDING';
  let completedAt = input.completedAt ?? null;
  let missedAt = input.missedAt ?? null;
  let calculatedStartTime = input.calculatedStartTime ?? null;

  if (completedAt != null) {
    assertValidIsoInstant(completedAt, 'completedAt');
    completedAt = canonicalizeIsoInstant(completedAt);
  }
  if (missedAt != null) {
    assertValidIsoInstant(missedAt, 'missedAt');
    missedAt = canonicalizeIsoInstant(missedAt);
  }
  if (calculatedStartTime != null) {
    assertValidIsoInstant(calculatedStartTime, 'calculatedStartTime');
    calculatedStartTime = canonicalizeIsoInstant(calculatedStartTime);
  }

  // Terminal status timestamp invariants
  if (status === 'PENDING') {
    if (completedAt != null || missedAt != null) {
      throw new TaskValidationError(
        `PENDING occurrence cannot have completedAt (${completedAt}) or missedAt (${missedAt}). Both must be null.`
      );
    }
  } else if (status === 'COMPLETED') {
    if (completedAt == null || missedAt != null) {
      throw new TaskValidationError(
        `COMPLETED occurrence must have completedAt populated and missedAt null. Got completedAt: ${completedAt}, missedAt: ${missedAt}.`
      );
    }
  } else if (status === 'MISSED') {
    if (missedAt == null || completedAt != null) {
      throw new TaskValidationError(
        `MISSED occurrence must have missedAt populated and completedAt null. Got completedAt: ${completedAt}, missedAt: ${missedAt}.`
      );
    }
  } else if (status === 'CANCELLED') {
    if (completedAt != null || missedAt != null) {
      throw new TaskValidationError(
        `CANCELLED occurrence cannot have completedAt (${completedAt}) or missedAt (${missedAt}). Both must be null.`
      );
    }
  }

  return {
    localDate: input.localDate,
    planningDayKey: input.planningDayKey,
    timezone: input.timezone,
    status,
    completedAt,
    missedAt,
    calculatedStartTime,
  };
}

export class TaskOccurrenceRepository {
  /**
   * Creates a new TaskOccurrence. Automatically derives and validates seriesId against
   * the referenced TaskDefinition.
   */
  async create(input: NewTaskOccurrenceInput, tx?: any): Promise<TaskOccurrence> {
    const client = getDb(tx);
    const validated = validateOccurrenceInvariants(input);

    // Look up referenced TaskDefinition to verify existence, derive seriesId, and check scheduleType
    const defRows = client
      .select({
        id: taskDefinitions.id,
        seriesId: taskDefinitions.seriesId,
        scheduleType: taskDefinitions.scheduleType,
      })
      .from(taskDefinitions)
      .where(eq(taskDefinitions.id, input.taskDefinitionId))
      .all();

    if (defRows.length === 0) {
      throw new TaskValidationError(
        `Cannot create TaskOccurrence: referenced TaskDefinition ${input.taskDefinitionId} does not exist`
      );
    }
    const def = defRows[0];

    // If seriesId was provided by caller, strictly assert it matches
    if (input.seriesId && input.seriesId !== def.seriesId) {
      throw new TaskValidationError(
        `Occurrence seriesId (${input.seriesId}) does not match referenced TaskDefinition seriesId (${def.seriesId})`
      );
    }
    const seriesId = def.seriesId;

    let windowStart: string | null = null;
    let windowEnd: string | null = null;

    if (def.scheduleType === 'PRAYER_WINDOW') {
      if (input.windowStart == null || input.windowEnd == null) {
        throw new TaskValidationError(
          `PRAYER_WINDOW occurrence must have non-null windowStart and windowEnd. Got windowStart: ${input.windowStart}, windowEnd: ${input.windowEnd}`
        );
      }
      assertValidIsoInstant(input.windowStart, 'windowStart');
      assertValidIsoInstant(input.windowEnd, 'windowEnd');
      windowStart = canonicalizeIsoInstant(input.windowStart);
      windowEnd = canonicalizeIsoInstant(input.windowEnd);
      if (windowStart >= windowEnd) {
        throw new TaskValidationError(
          `windowStart (${windowStart}) must be strictly before windowEnd (${windowEnd})`
        );
      }
    } else {
      if (input.windowStart != null || input.windowEnd != null) {
        throw new TaskValidationError(
          `Non-PRAYER_WINDOW occurrence (${def.scheduleType}) must have null windowStart and windowEnd. Got windowStart: ${input.windowStart}, windowEnd: ${input.windowEnd}`
        );
      }
    }

    const id = input.id ?? generateId();
    const serializedEligible = serializeEligiblePrayerSections(input.eligiblePrayerSections);
    const serializedOverride = serializeOverrideData(input.overrideData);

    try {
      client
        .insert(taskOccurrences)
        .values({
          id,
          taskDefinitionId: input.taskDefinitionId,
          seriesId,
          localDate: validated.localDate,
          planningDayKey: validated.planningDayKey,
          timezone: validated.timezone,
          calculatedStartTime: validated.calculatedStartTime,
          calculatedPrayerSection: input.calculatedPrayerSection ?? null,
          eligiblePrayerSections: serializedEligible,
          wallClockResolution: input.wallClockResolution ?? null,
          windowStart,
          windowEnd,
          status: validated.status,
          completedAt: validated.completedAt,
          missedAt: validated.missedAt,
          overrideData: serializedOverride,
        })
        .run();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new DataIntegrityError(
          `Unique constraint violation creating TaskOccurrence: ${err.message}`,
          { cause: err }
        );
      }
      if (err.message && err.message.includes('CHECK constraint failed')) {
        throw new DataIntegrityError(
          `Check constraint violation creating TaskOccurrence: ${err.message}`,
          { cause: err }
        );
      }
      throw err;
    }

    const created = await this.findById(id, tx);
    if (!created) {
      throw new DataIntegrityError(`Failed to retrieve newly created TaskOccurrence ${id}`);
    }
    return created;
  }

  /**
   * Atomically creates a batch of TaskOccurrences within a single transaction.
   * When tx is supplied, executes directly inside tx.
   * When tx is not supplied, uses canonical runInTransaction.
   */
  async createBatch(occurrences: NewTaskOccurrenceInput[], tx?: any): Promise<TaskOccurrence[]> {
    if (occurrences.length === 0) return [];

    const execute = async (activeTx: any) => {
      const results: TaskOccurrence[] = [];
      for (const occ of occurrences) {
        const created = await this.create(occ, activeTx);
        results.push(created);
      }
      return results;
    };

    if (tx) {
      return await execute(tx);
    }

    return await runInTransaction(async (innerTx) => {
      return await execute(innerTx);
    });
  }

  /**
   * Finds a TaskOccurrence by primary key id.
   */
  async findById(id: string, tx?: any): Promise<TaskOccurrence | null> {
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskOccurrences)
      .where(eq(taskOccurrences.id, id))
      .all();

    if (rows.length === 0) return null;
    return mapRowToDomain(rows[0]);
  }

  /**
   * Finds a TaskOccurrence by definition id and localDate.
   */
  async findByDefinitionAndDate(
    taskDefinitionId: string,
    localDate: string,
    tx?: any
  ): Promise<TaskOccurrence | null> {
    assertValidCivilDate(localDate, 'localDate');
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.taskDefinitionId, taskDefinitionId),
          eq(taskOccurrences.localDate, localDate)
        )
      )
      .all();

    if (rows.length === 0) return null;
    return mapRowToDomain(rows[0]);
  }

  /**
   * Finds a TaskOccurrence by series id and localDate (sole natural occurrence identity).
   */
  async findBySeriesAndDate(
    seriesId: string,
    localDate: string,
    tx?: any
  ): Promise<TaskOccurrence | null> {
    assertValidCivilDate(localDate, 'localDate');
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.seriesId, seriesId),
          eq(taskOccurrences.localDate, localDate)
        )
      )
      .all();

    if (rows.length === 0) return null;
    return mapRowToDomain(rows[0]);
  }

  /**
   * Finds all PENDING TaskOccurrences whose localDate falls within [startDate, endDate].
   */
  async findPendingByLocalDateRange(
    startDate: string,
    endDate: string,
    tx?: any
  ): Promise<TaskOccurrence[]> {
    assertValidCivilDate(startDate, 'startDate');
    assertValidCivilDate(endDate, 'endDate');
    if (startDate > endDate) {
      throw new TaskValidationError(
        `startDate (${startDate}) must be <= endDate (${endDate})`
      );
    }

    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.status, 'PENDING'),
          gte(taskOccurrences.localDate, startDate),
          lte(taskOccurrences.localDate, endDate)
        )
      )
      .all();

    return rows.map(mapRowToDomain);
  }

  /**
   * Queries occurrences belonging to a planning day.
   */
  async findByPlanningDay(planningDayKey: string, tx?: any): Promise<TaskOccurrence[]> {
    assertValidCivilDate(planningDayKey, 'planningDayKey');
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskOccurrences)
      .where(eq(taskOccurrences.planningDayKey, planningDayKey))
      .all();

    return rows.map(mapRowToDomain);
  }

  /**
   * Queries occurrences belonging to a prayer section on a planning day.
   */
  async findByPrayerSection(
    planningDayKey: string,
    prayer: Prayer,
    tx?: any
  ): Promise<TaskOccurrence[]> {
    assertValidCivilDate(planningDayKey, 'planningDayKey');
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.planningDayKey, planningDayKey),
          eq(taskOccurrences.calculatedPrayerSection, prayer)
        )
      )
      .all();

    return rows.map(mapRowToDomain);
  }

  /**
   * Queries all occurrences for a logical series.
   */
  async findBySeriesId(seriesId: string, tx?: any): Promise<TaskOccurrence[]> {
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskOccurrences)
      .where(eq(taskOccurrences.seriesId, seriesId))
      .all();

    return rows.map(mapRowToDomain);
  }

  /**
   * Guarded status transition:
   * Only allows valid transitions: PENDING -> COMPLETED, PENDING -> MISSED, PENDING -> CANCELLED.
   * Terminal statuses cannot transition to other statuses.
   * Idempotent updates (e.g. COMPLETED -> COMPLETED) return the unchanged occurrence.
   */
  async updateStatus(
    id: string,
    newStatus: OccurrenceStatus,
    timestamp?: string,
    tx?: any
  ): Promise<TaskOccurrence> {
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new TaskValidationError(`Cannot update status of non-existent TaskOccurrence ${id}`);
    }

    // Idempotent check
    if (existing.status === newStatus) {
      return existing;
    }

    // Terminal guard: once terminal, no further transitions are allowed
    if (
      existing.status === 'COMPLETED' ||
      existing.status === 'MISSED' ||
      existing.status === 'CANCELLED'
    ) {
      throw new TaskValidationError(
        `Cannot transition terminal occurrence ${id} from ${existing.status} to ${newStatus}. Terminal states are immutable.`
      );
    }

    let effectiveTime: string;
    if (timestamp != null) {
      assertValidIsoInstant(timestamp, 'timestamp');
      effectiveTime = canonicalizeIsoInstant(timestamp);
    } else {
      effectiveTime = new Date().toISOString();
    }

    const patch: Partial<typeof taskOccurrences.$inferInsert> = {
      status: newStatus,
    };

    if (newStatus === 'COMPLETED') {
      patch.completedAt = effectiveTime;
      patch.missedAt = null;
    } else if (newStatus === 'MISSED') {
      patch.missedAt = effectiveTime;
      patch.completedAt = null;
    } else if (newStatus === 'CANCELLED') {
      patch.completedAt = null;
      patch.missedAt = null;
    }

    const client = getDb(tx);
    client
      .update(taskOccurrences)
      .set(patch)
      .where(eq(taskOccurrences.id, id))
      .run();

    const updated = await this.findById(id, tx);
    return updated!;
  }

  /**
   * Updates per-occurrence override data (e.g. completedSubtaskIds).
   */
  async updateOverrideData(
    id: string,
    overrideData: OccurrenceOverrideData,
    tx?: any
  ): Promise<TaskOccurrence> {
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new TaskValidationError(`Cannot update overrideData for non-existent occurrence ${id}`);
    }

    const serialized = serializeOverrideData(overrideData);
    const client = getDb(tx);
    client
      .update(taskOccurrences)
      .set({ overrideData: serialized })
      .where(eq(taskOccurrences.id, id))
      .run();

    const updated = await this.findById(id, tx);
    return updated!;
  }

  /**
   * Guarded placement update: atomically updates derived placement fields ONLY for PENDING occurrences.
   *
   * Invariants:
   * - Validates windowStart and windowEnd according to referenced TaskDefinition.scheduleType
   * - Uses atomic SQL condition: WHERE id = ? AND status = 'PENDING'
   * - Returns typed PlacementUpdateResult:
   *   - { outcome: 'UPDATED', occurrence: updatedOccurrence }
   *   - { outcome: 'NOT_PENDING', occurrence: terminalOccurrence }
   *   - { outcome: 'NOT_FOUND' }
   */
  async updateDerivedPlacement(
    id: string,
    placement: DerivedPlacement,
    tx?: any
  ): Promise<PlacementUpdateResult> {
    const client = getDb(tx);

    // Look up occurrence to verify existence and get taskDefinitionId / status
    const occRows = client
      .select({
        id: taskOccurrences.id,
        taskDefinitionId: taskOccurrences.taskDefinitionId,
        status: taskOccurrences.status,
      })
      .from(taskOccurrences)
      .where(eq(taskOccurrences.id, id))
      .all();

    if (occRows.length === 0) {
      return { outcome: 'NOT_FOUND' };
    }

    const existingRow = occRows[0];
    if (existingRow.status !== 'PENDING') {
      const existingOcc = await this.findById(id, tx);
      return { outcome: 'NOT_PENDING', occurrence: existingOcc! };
    }

    // Load referenced definition for scheduleType window validation
    const defRows = client
      .select({
        id: taskDefinitions.id,
        scheduleType: taskDefinitions.scheduleType,
      })
      .from(taskDefinitions)
      .where(eq(taskDefinitions.id, existingRow.taskDefinitionId))
      .all();

    if (defRows.length === 0) {
      throw new DataIntegrityError(
        `TaskOccurrence ${id} references non-existent TaskDefinition ${existingRow.taskDefinitionId}`
      );
    }
    const def = defRows[0];

    // Validate placement fields
    if (placement.planningDayKey) {
      assertValidCivilDate(placement.planningDayKey, 'planningDayKey');
    }
    if (placement.timezone) {
      assertValidIanaTimezone(placement.timezone, 'timezone');
    }
    let calculatedStartTime = placement.calculatedStartTime ?? null;
    if (calculatedStartTime != null) {
      assertValidIsoInstant(calculatedStartTime, 'calculatedStartTime');
      calculatedStartTime = canonicalizeIsoInstant(calculatedStartTime);
    }

    let windowStart: string | null = null;
    let windowEnd: string | null = null;

    if (def.scheduleType === 'PRAYER_WINDOW') {
      if (placement.windowStart == null || placement.windowEnd == null) {
        throw new TaskValidationError(
          `PRAYER_WINDOW occurrence must have non-null windowStart and windowEnd. Got windowStart: ${placement.windowStart}, windowEnd: ${placement.windowEnd}`
        );
      }
      assertValidIsoInstant(placement.windowStart, 'windowStart');
      assertValidIsoInstant(placement.windowEnd, 'windowEnd');
      windowStart = canonicalizeIsoInstant(placement.windowStart);
      windowEnd = canonicalizeIsoInstant(placement.windowEnd);
      if (windowStart >= windowEnd) {
        throw new TaskValidationError(
          `windowStart (${windowStart}) must be strictly before windowEnd (${windowEnd})`
        );
      }
    } else {
      if (placement.windowStart != null || placement.windowEnd != null) {
        throw new TaskValidationError(
          `Non-PRAYER_WINDOW occurrence (${def.scheduleType}) must have null windowStart and windowEnd`
        );
      }
    }

    const serializedEligible = serializeEligiblePrayerSections(placement.eligiblePrayerSections);
    const patch: Partial<typeof taskOccurrences.$inferInsert> = {
      calculatedStartTime,
      calculatedPrayerSection: placement.calculatedPrayerSection ?? null,
      eligiblePrayerSections: serializedEligible,
      wallClockResolution: placement.wallClockResolution ?? null,
      windowStart,
      windowEnd,
      planningDayKey: placement.planningDayKey,
    };
    if (placement.timezone) {
      patch.timezone = placement.timezone;
    }

    // Atomic update with status guard
    const updateResult = client
      .update(taskOccurrences)
      .set(patch)
      .where(
        and(
          eq(taskOccurrences.id, id),
          eq(taskOccurrences.status, 'PENDING')
        )
      )
      .run() as { changes?: number };

    const changes = updateResult?.changes ?? 0;
    if (changes > 0) {
      const updated = await this.findById(id, tx);
      if (!updated) {
        return { outcome: 'NOT_FOUND' };
      }
      return { outcome: 'UPDATED', occurrence: updated };
    }

    // Atomic update affected 0 rows (concurrent terminal transition or deletion)
    const reread = await this.findById(id, tx);
    if (!reread) {
      return { outcome: 'NOT_FOUND' };
    }
    if (reread.status !== 'PENDING') {
      return { outcome: 'NOT_PENDING', occurrence: reread };
    }

    // If UPDATE affects zero rows but reread occurrence somehow remains PENDING
    throw new DataIntegrityError(
      `Atomic placement update affected 0 rows for PENDING occurrence ${id}`
    );
  }

  /**
   * Physically deletes only PENDING derived future occurrences for a series from fromDate onward.
   * Retains all COMPLETED, MISSED, and CANCELLED historical occurrences.
   */
  async deletePendingFutureOccurrences(
    seriesId: string,
    fromDate: string,
    tx?: any
  ): Promise<number> {
    assertValidCivilDate(fromDate, 'fromDate');
    const client = getDb(tx);
    const pendingRows = client
      .select({ id: taskOccurrences.id })
      .from(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.seriesId, seriesId),
          gte(taskOccurrences.localDate, fromDate),
          eq(taskOccurrences.status, 'PENDING')
        )
      )
      .all();

    if (pendingRows.length === 0) return 0;

    for (const row of pendingRows) {
      client.delete(taskOccurrences).where(eq(taskOccurrences.id, row.id)).run();
    }
    return pendingRows.length;
  }

  /**
   * Cancels ALL remaining PENDING occurrences for an entire series.
   * Retains COMPLETED, MISSED, and already CANCELLED occurrences.
   */
  async cancelAllPendingOccurrences(seriesId: string, tx?: any): Promise<number> {
    const client = getDb(tx);
    const pendingRows = client
      .select({ id: taskOccurrences.id })
      .from(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.seriesId, seriesId),
          eq(taskOccurrences.status, 'PENDING')
        )
      )
      .all();

    if (pendingRows.length === 0) return 0;

    for (const row of pendingRows) {
      client
        .update(taskOccurrences)
        .set({ status: 'CANCELLED' })
        .where(eq(taskOccurrences.id, row.id))
        .run();
    }
    return pendingRows.length;
  }

  /**
   * Cancels future PENDING occurrences from a specific date onward.
   */
  async cancelFutureOccurrences(
    seriesId: string,
    fromDate: string,
    tx?: any
  ): Promise<number> {
    assertValidCivilDate(fromDate, 'fromDate');
    const client = getDb(tx);
    const pendingRows = client
      .select({ id: taskOccurrences.id })
      .from(taskOccurrences)
      .where(
        and(
          eq(taskOccurrences.seriesId, seriesId),
          gte(taskOccurrences.localDate, fromDate),
          eq(taskOccurrences.status, 'PENDING')
        )
      )
      .all();

    if (pendingRows.length === 0) return 0;

    for (const row of pendingRows) {
      client
        .update(taskOccurrences)
        .set({ status: 'CANCELLED' })
        .where(eq(taskOccurrences.id, row.id))
        .run();
    }
    return pendingRows.length;
  }

  /**
   * Guarded delete: permanently deletes a TaskOccurrence ONLY if status is PENDING.
   * Strictly throws TaskValidationError if the occurrence is COMPLETED, MISSED, or CANCELLED.
   */
  async delete(id: string, tx?: any): Promise<void> {
    const existing = await this.findById(id, tx);
    if (!existing) return;

    if (
      existing.status === 'COMPLETED' ||
      existing.status === 'MISSED' ||
      existing.status === 'CANCELLED'
    ) {
      throw new TaskValidationError(
        `Cannot hard-delete terminal historical occurrence ${id} (${existing.status}). Historical records are immutable.`
      );
    }

    const client = getDb(tx);
    client.delete(taskOccurrences).where(eq(taskOccurrences.id, id)).run();
  }

  /**
   * Finds candidate TaskOccurrences for the Today screen.
   *
   * Rule A: All occurrences belonging to activePlanningDayKey (PENDING, COMPLETED, MISSED, CANCELLED).
   * Rule B: Cross-day active PENDING prayer windows:
   *         status == 'PENDING' AND window_start IS NOT NULL AND window_end IS NOT NULL
   *         AND planning_day_key != activePlanningDayKey
   *         AND window_start <= nowUtc AND nowUtc < window_end
   */
  async findTodayCandidates(
    activePlanningDayKey: string,
    nowUtc: string,
    tx?: any
  ): Promise<TaskOccurrence[]> {
    assertValidCivilDate(activePlanningDayKey, 'activePlanningDayKey');
    assertValidIsoInstant(nowUtc, 'nowUtc');
    const canonicalNowUtc = canonicalizeIsoInstant(nowUtc);

    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskOccurrences)
      .where(
        or(
          eq(taskOccurrences.planningDayKey, activePlanningDayKey),
          and(
            eq(taskOccurrences.status, 'PENDING'),
            isNotNull(taskOccurrences.windowStart),
            isNotNull(taskOccurrences.windowEnd),
            ne(taskOccurrences.planningDayKey, activePlanningDayKey),
            lte(taskOccurrences.windowStart, canonicalNowUtc),
            gt(taskOccurrences.windowEnd, canonicalNowUtc)
          )
        )
      )
      .all();

    return rows.map(mapRowToDomain);
  }
}

export const taskOccurrenceRepository = new TaskOccurrenceRepository();
