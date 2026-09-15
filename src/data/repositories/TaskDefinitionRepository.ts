import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { taskDefinitions, taskOccurrences } from '@/data/schema';
import { getDatabase, type AppDatabase } from '@/data/db';
import type {
  TaskDefinition,
  TaskDefinitionUpdatePatch,
  ScheduleType,
  ScheduleDataFor,
} from '@/domain/task/types';
import {
  parseScheduleData,
  serializeScheduleData,
} from '@/domain/task/scheduleDataParser';
import {
  parseTags,
  serializeTags,
  parseSubtasks,
  serializeSubtasks,
  parseReminderRule,
  serializeReminderRule,
  parseHijriRecurrence,
  serializeHijriRecurrence,
} from '@/domain/task/jsonBoundary';
import {
  DataIntegrityError,
  TaskValidationError,
  DefinitionVersionConflictError,
} from '@/domain/task/errors';
import {
  assertValidCivilDate,
  assertValidIsoInstant,
  canonicalizeIsoInstant,
} from '@/utils/dateValidation';

export interface NewTaskDefinition {
  id: string;
  title: string;
  startDate: string;
  scheduleType: ScheduleType;
  scheduleData: ScheduleDataFor<ScheduleType>;
  seriesId: string;
  description?: string | null;
  source?: TaskDefinition['source'];
  worshipItemKey?: string | null;
  recurrenceRule?: string | null;
  hijriRecurrence?: TaskDefinition['hijriRecurrence'] | null;
  recurrenceEnd?: string | null;
  seriesVersion?: number;
  effectiveFromDate?: string | null;
  effectiveToDate?: string | null;
  reminderRule?: TaskDefinition['reminderRule'] | null;
  priority?: TaskDefinition['priority'];
  estimatedMinutes?: number | null;
  notes?: string | null;
  tags?: string[];
  subtasks?: TaskDefinition['subtasks'];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function getDb(tx?: any): AppDatabase {
  return tx ?? getDatabase();
}

function mapRowToDomain(row: typeof taskDefinitions.$inferSelect): TaskDefinition {
  try {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.startDate,
      source: row.source as TaskDefinition['source'],
      worshipItemKey: row.worshipItemKey,
      scheduleType: row.scheduleType as ScheduleType,
      scheduleData: parseScheduleData(row.scheduleType as ScheduleType, row.scheduleData),
      recurrenceRule: row.recurrenceRule,
      hijriRecurrence: parseHijriRecurrence(row.hijriRecurrence),
      recurrenceEnd: row.recurrenceEnd,
      seriesId: row.seriesId,
      seriesVersion: row.seriesVersion,
      effectiveFromDate: row.effectiveFromDate,
      effectiveToDate: row.effectiveToDate,
      reminderRule: parseReminderRule(row.reminderRule),
      priority: row.priority as TaskDefinition['priority'],
      estimatedMinutes: row.estimatedMinutes,
      notes: row.notes,
      tags: parseTags(row.tags),
      subtasks: parseSubtasks(row.subtasks),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    if (err instanceof DataIntegrityError) throw err;
    throw new DataIntegrityError(
      `Failed to map task_definition row ${row.id} to domain model: ${(err as Error).message}`,
      { cause: err }
    );
  }
}

export class TaskDefinitionRepository {
  /**
   * Creates a new TaskDefinition.
   */
  async create(def: NewTaskDefinition, tx?: any): Promise<TaskDefinition> {
    if (!def.id || typeof def.id !== 'string' || def.id.trim() === '') {
      throw new TaskValidationError('TaskDefinition id must be a non-empty string');
    }
    if (!def.title || typeof def.title !== 'string' || def.title.trim() === '') {
      throw new TaskValidationError('Task title cannot be empty');
    }
    assertValidCivilDate(def.startDate, 'startDate');
    if (def.effectiveFromDate) {
      assertValidCivilDate(def.effectiveFromDate, 'effectiveFromDate');
    }
    if (def.effectiveToDate) {
      assertValidCivilDate(def.effectiveToDate, 'effectiveToDate');
    }
    if (def.effectiveFromDate && def.effectiveToDate && def.effectiveFromDate > def.effectiveToDate) {
      throw new TaskValidationError(
        `effectiveFromDate (${def.effectiveFromDate}) must be <= effectiveToDate (${def.effectiveToDate})`
      );
    }
    if (def.recurrenceEnd) {
      assertValidCivilDate(def.recurrenceEnd, 'recurrenceEnd');
    }
    if (!def.seriesId || typeof def.seriesId !== 'string' || def.seriesId.trim() === '') {
      throw new TaskValidationError('TaskDefinition seriesId must be a non-empty string');
    }
    const seriesVersion = def.seriesVersion ?? 1;
    if (seriesVersion < 1) {
      throw new TaskValidationError(`TaskDefinition seriesVersion must be >= 1, got ${seriesVersion}`);
    }

    const now = new Date().toISOString();
    let createdAt = now;
    if (def.createdAt != null) {
      assertValidIsoInstant(def.createdAt, 'createdAt');
      createdAt = canonicalizeIsoInstant(def.createdAt);
    }
    let updatedAt = now;
    if (def.updatedAt != null) {
      assertValidIsoInstant(def.updatedAt, 'updatedAt');
      updatedAt = canonicalizeIsoInstant(def.updatedAt);
    }

    const serializedScheduleData = serializeScheduleData(def.scheduleType, def.scheduleData);
    const serializedTags = serializeTags(def.tags ?? []);
    const serializedSubtasks = serializeSubtasks(def.subtasks ?? []);
    const serializedReminder = serializeReminderRule(def.reminderRule ?? null);
    const serializedHijri = serializeHijriRecurrence(def.hijriRecurrence ?? null);

    const client = getDb(tx);
    try {
      client
        .insert(taskDefinitions)
        .values({
          id: def.id,
          title: def.title.trim(),
          description: def.description ?? null,
          startDate: def.startDate,
          source: def.source ?? 'USER',
          worshipItemKey: def.worshipItemKey ?? null,
          scheduleType: def.scheduleType,
          scheduleData: serializedScheduleData,
          recurrenceRule: def.recurrenceRule ?? null,
          hijriRecurrence: serializedHijri,
          recurrenceEnd: def.recurrenceEnd ?? null,
          seriesId: def.seriesId,
          seriesVersion,
          effectiveFromDate: def.effectiveFromDate ?? null,
          effectiveToDate: def.effectiveToDate ?? null,
          reminderRule: serializedReminder,
          priority: def.priority ?? 'NORMAL',
          estimatedMinutes: def.estimatedMinutes ?? null,
          notes: def.notes ?? null,
          tags: serializedTags,
          subtasks: serializedSubtasks,
          isActive: def.isActive !== undefined ? def.isActive : true,
          createdAt,
          updatedAt,
        })
        .run();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new DataIntegrityError(
          `Unique constraint violation creating TaskDefinition: ${err.message}`,
          { cause: err }
        );
      }
      if (err.message && err.message.includes('CHECK constraint failed')) {
        throw new DataIntegrityError(
          `Check constraint violation creating TaskDefinition: ${err.message}`,
          { cause: err }
        );
      }
      throw err;
    }

    const created = await this.findById(def.id, tx);
    if (!created) {
      throw new DataIntegrityError(`Failed to retrieve newly created TaskDefinition ${def.id}`);
    }
    return created;
  }

  /**
   * Finds a TaskDefinition by its primary key id.
   */
  async findById(id: string, tx?: any): Promise<TaskDefinition | null> {
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskDefinitions)
      .where(eq(taskDefinitions.id, id))
      .all();

    if (rows.length === 0) return null;
    return mapRowToDomain(rows[0]);
  }

  /**
   * Finds all versions of a logical series by seriesId, ordered by seriesVersion ascending.
   */
  async findBySeriesId(seriesId: string, tx?: any): Promise<TaskDefinition[]> {
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskDefinitions)
      .where(eq(taskDefinitions.seriesId, seriesId))
      .all();

    return rows
      .map(mapRowToDomain)
      .sort((a, b) => a.seriesVersion - b.seriesVersion);
  }

  /**
   * Finds the active, open version of a series (isActive = true and effectiveToDate IS NULL).
   */
  async findActiveBySeriesId(seriesId: string, tx?: any): Promise<TaskDefinition | null> {
    const client = getDb(tx);
    const rows = client
      .select()
      .from(taskDefinitions)
      .where(
        and(
          eq(taskDefinitions.seriesId, seriesId),
          eq(taskDefinitions.isActive, true),
          isNull(taskDefinitions.effectiveToDate)
        )
      )
      .all();

    if (rows.length === 0) return null;
    return mapRowToDomain(rows[0]);
  }

  /**
   * Finds the governing TaskDefinition version for a series on a specific seed date.
   *
   * Invariants (M4 semantics):
   * - Recurring definitions (recurrenceRule != null || hijriRecurrence != null):
   *   isActive === true
   *   effectiveFromDate <= seedDate
   *   startDate <= seedDate
   *   (effectiveToDate == null || seedDate <= effectiveToDate)
   * - Non-recurring definitions (recurrenceRule == null && hijriRecurrence == null):
   *   isActive === true
   *   seedDate === startDate
   *
   * Outcomes:
   * - 0 candidates: returns null
   * - 1 candidate: returns definition
   * - >1 candidates: throws DefinitionVersionConflictError (typed, never brittle string parsing)
   */
  async findVersionForSeedDate(
    seriesId: string,
    seedDate: string,
    tx?: any
  ): Promise<TaskDefinition | null> {
    assertValidCivilDate(seedDate, 'seedDate');
    const versions = await this.findBySeriesId(seriesId, tx);

    const candidates = versions.filter(def => {
      if (!def.isActive) return false;

      const isRecurring = def.recurrenceRule != null || def.hijriRecurrence != null;
      if (isRecurring) {
        const effectiveFrom = def.effectiveFromDate ?? def.startDate;
        const matchesFrom = effectiveFrom <= seedDate;
        const matchesStart = def.startDate <= seedDate;
        const matchesTo = def.effectiveToDate == null || seedDate <= def.effectiveToDate;
        return matchesFrom && matchesStart && matchesTo;
      } else {
        return seedDate === def.startDate;
      }
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    throw new DefinitionVersionConflictError(seriesId, seedDate, candidates.length);
  }

  /**
   * Finds active non-recurring TaskDefinitions whose startDate falls within [startDate, endDate].
   */
  async findActiveNonRecurringByStartDateRange(
    startDate: string,
    endDate: string,
    tx?: any
  ): Promise<TaskDefinition[]> {
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
      .from(taskDefinitions)
      .where(
        and(
          eq(taskDefinitions.isActive, true),
          isNull(taskDefinitions.recurrenceRule),
          isNull(taskDefinitions.hijriRecurrence),
          gte(taskDefinitions.startDate, startDate),
          lte(taskDefinitions.startDate, endDate)
        )
      )
      .all();

    return rows.map(mapRowToDomain);
  }

  /**
   * Guarded update: updates mutable fields only.
   * Throws TaskValidationError if callers attempt to mutate invariant identity or version fields.
   */
  async update(id: string, patch: TaskDefinitionUpdatePatch, tx?: any): Promise<TaskDefinition> {
    const forbiddenFields = ['id', 'seriesId', 'seriesVersion', 'createdAt', 'effectiveFromDate', 'effectiveToDate'];
    for (const field of forbiddenFields) {
      if (field in (patch as any)) {
        throw new TaskValidationError(
          `Cannot mutate invariant field '${field}' on TaskDefinition via update(). Use dedicated series operations.`
        );
      }
    }

    const existing = await this.findById(id, tx);
    if (!existing) {
      throw new TaskValidationError(`Cannot update non-existent TaskDefinition ${id}`);
    }

    if (patch.title !== undefined && patch.title.trim() === '') {
      throw new TaskValidationError('Task title cannot be empty');
    }
    if (patch.startDate !== undefined) {
      assertValidCivilDate(patch.startDate, 'startDate');
    }
    if (patch.recurrenceEnd !== undefined && patch.recurrenceEnd !== null) {
      assertValidCivilDate(patch.recurrenceEnd, 'recurrenceEnd');
    }

    const updateValues: Partial<typeof taskDefinitions.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (patch.title !== undefined) updateValues.title = patch.title.trim();
    if (patch.description !== undefined) updateValues.description = patch.description;
    if (patch.startDate !== undefined) updateValues.startDate = patch.startDate;
    if (patch.source !== undefined) updateValues.source = patch.source;
    if (patch.worshipItemKey !== undefined) updateValues.worshipItemKey = patch.worshipItemKey;
    if (patch.scheduleType !== undefined && patch.scheduleData !== undefined) {
      updateValues.scheduleType = patch.scheduleType;
      updateValues.scheduleData = serializeScheduleData(patch.scheduleType, patch.scheduleData);
    } else if (patch.scheduleData !== undefined) {
      updateValues.scheduleData = serializeScheduleData(existing.scheduleType, patch.scheduleData);
    } else if (patch.scheduleType !== undefined) {
      throw new TaskValidationError('When changing scheduleType, scheduleData must also be provided');
    }

    if (patch.recurrenceRule !== undefined) updateValues.recurrenceRule = patch.recurrenceRule;
    if (patch.hijriRecurrence !== undefined) {
      updateValues.hijriRecurrence = serializeHijriRecurrence(patch.hijriRecurrence);
    }
    if (patch.recurrenceEnd !== undefined) updateValues.recurrenceEnd = patch.recurrenceEnd;
    if (patch.reminderRule !== undefined) updateValues.reminderRule = serializeReminderRule(patch.reminderRule);
    if (patch.priority !== undefined) updateValues.priority = patch.priority;
    if (patch.estimatedMinutes !== undefined) updateValues.estimatedMinutes = patch.estimatedMinutes;
    if (patch.notes !== undefined) updateValues.notes = patch.notes;
    if (patch.tags !== undefined) updateValues.tags = serializeTags(patch.tags);
    if (patch.subtasks !== undefined) updateValues.subtasks = serializeSubtasks(patch.subtasks);
    if (patch.isActive !== undefined) updateValues.isActive = patch.isActive;

    const client = getDb(tx);
    client
      .update(taskDefinitions)
      .set(updateValues)
      .where(eq(taskDefinitions.id, id))
      .run();

    const updated = await this.findById(id, tx);
    return updated!;
  }

  /**
   * Internal/series method to close an existing version's effective range.
   */
  async closeVersion(id: string, effectiveToDate: string, tx?: any): Promise<void> {
    assertValidCivilDate(effectiveToDate, 'effectiveToDate');

    const existing = await this.findById(id, tx);
    if (existing && existing.effectiveFromDate && existing.effectiveFromDate > effectiveToDate) {
      throw new TaskValidationError(
        `effectiveToDate (${effectiveToDate}) cannot precede effectiveFromDate (${existing.effectiveFromDate})`
      );
    }

    const client = getDb(tx);
    client
      .update(taskDefinitions)
      .set({
        effectiveToDate,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(taskDefinitions.id, id))
      .run();
  }

  /**
   * Guarded delete: permanently deletes a TaskDefinition ONLY if no terminal historical
   * occurrences (COMPLETED, MISSED, CANCELLED) exist.
   */
  async delete(id: string, tx?: any): Promise<void> {
    const client = getDb(tx);
    // Check for any terminal occurrences
    const occurrences = client
      .select({ id: taskOccurrences.id, status: taskOccurrences.status })
      .from(taskOccurrences)
      .where(eq(taskOccurrences.taskDefinitionId, id))
      .all();

    const hasTerminal = occurrences.some(
      o => o.status === 'COMPLETED' || o.status === 'MISSED' || o.status === 'CANCELLED'
    );
    if (hasTerminal) {
      throw new TaskValidationError(
        `Cannot hard-delete TaskDefinition ${id}: terminal historical occurrences exist. Deactivate the series instead.`
      );
    }

    client.delete(taskDefinitions).where(eq(taskDefinitions.id, id)).run();
  }

  /**
   * Deactivates all TaskDefinition versions of a logical series.
   */
  async deactivateSeries(seriesId: string, tx?: any): Promise<void> {
    const client = getDb(tx);
    client
      .update(taskDefinitions)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(taskDefinitions.seriesId, seriesId))
      .run();
  }
}

export const taskDefinitionRepository = new TaskDefinitionRepository();
