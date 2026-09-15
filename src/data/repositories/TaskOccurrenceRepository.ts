import { eq, and, gte } from 'drizzle-orm';
import { taskOccurrences, taskDefinitions } from '@/data/schema';
import { getDatabase, type AppDatabase } from '@/data/db';
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
      status: row.status as OccurrenceStatus,
      completedAt: row.completedAt,
      missedAt: row.missedAt,
      overrideData: parseOverrideData(row.overrideData),
    };
  } catch (err) {
    if (err instanceof DataIntegrityError) throw err;
    throw new DataIntegrityError(
      `Failed to map task_occurrence row ${row.id} to domain model: ${(err as Error).message}`,
      { cause: err }
    );
  }
}

export class TaskOccurrenceRepository {
  /**
   * Creates a new TaskOccurrence. Automatically derives and validates seriesId against
   * the referenced TaskDefinition.
   */
  async create(input: NewTaskOccurrenceInput, tx?: any): Promise<TaskOccurrence> {
    const client = getDb(tx);

    if (!input.taskDefinitionId) {
      throw new TaskValidationError('taskDefinitionId is required');
    }
    if (!input.localDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) {
      throw new TaskValidationError(`Invalid localDate: expected 'YYYY-MM-DD', got ${input.localDate}`);
    }
    if (!input.planningDayKey || !/^\d{4}-\d{2}-\d{2}$/.test(input.planningDayKey)) {
      throw new TaskValidationError(`Invalid planningDayKey: expected 'YYYY-MM-DD', got ${input.planningDayKey}`);
    }
    if (!input.timezone) {
      throw new TaskValidationError('timezone is required');
    }

    // Look up referenced TaskDefinition to verify existence and derive seriesId
    const defRows = client
      .select({ id: taskDefinitions.id, seriesId: taskDefinitions.seriesId })
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
          localDate: input.localDate,
          planningDayKey: input.planningDayKey,
          timezone: input.timezone,
          calculatedStartTime: input.calculatedStartTime ?? null,
          calculatedPrayerSection: input.calculatedPrayerSection ?? null,
          eligiblePrayerSections: serializedEligible,
          wallClockResolution: input.wallClockResolution ?? null,
          status: input.status ?? 'PENDING',
          completedAt: input.completedAt ?? null,
          missedAt: input.missedAt ?? null,
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
   */
  async createBatch(occurrences: NewTaskOccurrenceInput[], tx?: any): Promise<TaskOccurrence[]> {
    if (occurrences.length === 0) return [];

    const client = getDb(tx);
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
    } else {
      return (client as any).transaction(async (newTx: any) => {
        return await execute(newTx);
      });
    }
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
   * Queries occurrences belonging to a planning day.
   */
  async findByPlanningDay(planningDayKey: string, tx?: any): Promise<TaskOccurrence[]> {
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

    const effectiveTime = timestamp ?? new Date().toISOString();
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
   * Guarded placement update: updates derived placement fields ONLY for PENDING occurrences.
   * Strictly throws TaskValidationError if the occurrence is COMPLETED, MISSED, or CANCELLED.
   */
  async updateDerivedPlacement(
    id: string,
    placement: DerivedPlacement,
    tx?: any
  ): Promise<TaskOccurrence> {
    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new TaskValidationError(`Cannot update placement for non-existent occurrence ${id}`);
    }

    if (
      existing.status === 'COMPLETED' ||
      existing.status === 'MISSED' ||
      existing.status === 'CANCELLED'
    ) {
      throw new TaskValidationError(
        `Cannot update derived placement for terminal occurrence ${id} (${existing.status}). Historical placement is permanently frozen.`
      );
    }

    const serializedEligible = serializeEligiblePrayerSections(placement.eligiblePrayerSections);
    const patch: Partial<typeof taskOccurrences.$inferInsert> = {
      calculatedStartTime: placement.calculatedStartTime,
      calculatedPrayerSection: placement.calculatedPrayerSection,
      eligiblePrayerSections: serializedEligible,
      wallClockResolution: placement.wallClockResolution,
      planningDayKey: placement.planningDayKey,
    };
    if (placement.timezone) {
      patch.timezone = placement.timezone;
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
   * Physically deletes only PENDING derived future occurrences for a series from fromDate onward.
   * Retains all COMPLETED, MISSED, and CANCELLED historical occurrences.
   */
  async deletePendingFutureOccurrences(
    seriesId: string,
    fromDate: string,
    tx?: any
  ): Promise<number> {
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
}

export const taskOccurrenceRepository = new TaskOccurrenceRepository();
