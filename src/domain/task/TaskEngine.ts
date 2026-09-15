import { generateUuid } from '@/utils/uuid';
import { runInTransaction } from '@/data/db';
import {
  taskDefinitionRepository,
  TaskDefinitionRepository,
} from '@/data/repositories/TaskDefinitionRepository';
import {
  taskOccurrenceRepository,
  TaskOccurrenceRepository,
} from '@/data/repositories/TaskOccurrenceRepository';
import type {
  TaskDefinition,
  TaskOccurrence,
  CreateTaskParams,
  TaskDefinitionUpdatePatch,
  OccurrenceOverrideData,
  SubtaskTemplate,
} from '@/domain/task/types';
import { TaskValidationError } from '@/domain/task/errors';
import { assertValidCivilDate, subtractCivilDay } from '@/utils/dateValidation';

export class TaskEngine {
  constructor(
    private defRepo: TaskDefinitionRepository = taskDefinitionRepository,
    private occRepo: TaskOccurrenceRepository = taskOccurrenceRepository
  ) {}

  /**
   * Creates a new TaskDefinition (USER, WORSHIP, or ROUTINE).
   * For non-recurring tasks, seriesId === id.
   * For recurring tasks, seriesId is a stable UUID shared across versions.
   */
  async createTask(params: CreateTaskParams, tx?: any): Promise<TaskDefinition> {
    if (!params.title || params.title.trim() === '') {
      throw new TaskValidationError('Task title cannot be empty');
    }
    assertValidCivilDate(params.startDate, 'startDate');
    if (params.recurrenceEnd) {
      assertValidCivilDate(params.recurrenceEnd, 'recurrenceEnd');
    }

    const id = params.id ?? generateUuid();
    const isRecurring = params.isRecurring ?? Boolean(params.recurrenceRule || params.hijriRecurrence);
    const seriesId = params.seriesId ?? (isRecurring ? generateUuid() : id);

    // Validate and assign subtask template IDs if missing
    let subtasks: SubtaskTemplate[] = [];
    if (params.subtasks && params.subtasks.length > 0) {
      const seenIds = new Set<string>();
      subtasks = params.subtasks.map(item => {
        const subtaskId = item.id && item.id.trim() !== '' ? item.id : generateUuid();
        if (seenIds.has(subtaskId)) {
          throw new TaskValidationError(`Duplicate subtask ID in template: ${subtaskId}`);
        }
        seenIds.add(subtaskId);
        return {
          id: subtaskId,
          title: item.title.trim(),
        };
      });
    }

    return await this.defRepo.create(
      {
        id,
        title: params.title.trim(),
        description: params.description ?? null,
        startDate: params.startDate,
        source: params.source ?? 'USER',
        worshipItemKey: params.worshipItemKey ?? null,
        scheduleType: params.scheduleType,
        scheduleData: params.scheduleData,
        recurrenceRule: params.recurrenceRule ?? null,
        hijriRecurrence: params.hijriRecurrence ?? null,
        recurrenceEnd: params.recurrenceEnd ?? null,
        seriesId,
        seriesVersion: 1,
        effectiveFromDate: isRecurring ? params.startDate : null,
        effectiveToDate: null,
        reminderRule: params.reminderRule ?? null,
        priority: params.priority ?? 'NORMAL',
        estimatedMinutes: params.estimatedMinutes ?? null,
        notes: params.notes ?? null,
        tags: params.tags ?? [],
        subtasks,
        isActive: params.isActive ?? true,
      },
      tx
    );
  }

  /**
   * RS-01: "This occurrence" edit. Writes overrides to overrideData on the occurrence.
   * Definition is completely unchanged.
   */
  async updateOccurrenceOverride(
    occurrenceId: string,
    overrides: OccurrenceOverrideData,
    tx?: any
  ): Promise<TaskOccurrence> {
    return await this.occRepo.updateOverrideData(occurrenceId, overrides, tx);
  }

  /**
   * RS-02 / TX-01: "This and future" split.
   * Atomically inside a single transaction:
   * 1. Looks up active predecessor version
   * 2. Closes predecessor at splitDate - 1
   * 3. Creates successor with same seriesId, seriesVersion + 1, startDate = splitDate, effectiveFromDate = splitDate
   * 4. Physically deletes pending derived future occurrences from splitDate onward
   * Retains completed, missed, and cancelled historical occurrences.
   */
  async splitSeriesAndFuture(
    seriesId: string,
    splitDate: string,
    changes: Partial<TaskDefinition>,
    tx?: any
  ): Promise<{ predecessor: TaskDefinition; newVersion: TaskDefinition }> {
    assertValidCivilDate(splitDate, 'splitDate');

    const execute = async (activeTx: any) => {
      // 1. Look up current active version inside the transaction
      const predecessor = await this.defRepo.findActiveBySeriesId(seriesId, activeTx);
      if (!predecessor) {
        throw new TaskValidationError(`Cannot split series ${seriesId}: no active version found`);
      }

      // Validate splitDate falls strictly within active version's range
      if (predecessor.effectiveFromDate && splitDate <= predecessor.effectiveFromDate) {
        throw new TaskValidationError(
          `splitDate ${splitDate} must be strictly after active version effectiveFromDate ${predecessor.effectiveFromDate}`
        );
      }
      if (predecessor.effectiveToDate && splitDate > predecessor.effectiveToDate) {
        throw new TaskValidationError(
          `splitDate ${splitDate} exceeds active version effectiveToDate ${predecessor.effectiveToDate}`
        );
      }

      const splitDateMinusOne = subtractCivilDay(splitDate);

      // 2. Close predecessor
      await this.defRepo.closeVersion(predecessor.id, splitDateMinusOne, activeTx);
      const updatedPredecessor = (await this.defRepo.findById(predecessor.id, activeTx))!;

      // 3. Create successor version with startDate = splitDate and effectiveFromDate = splitDate
      const successorId = generateUuid();
      const successor = await this.defRepo.create(
        {
          id: successorId,
          title: changes.title !== undefined ? changes.title.trim() : predecessor.title,
          description: changes.description !== undefined ? changes.description : predecessor.description,
          startDate: splitDate, // Binding Constraint 2: successor startDate equals splitDate
          source: changes.source ?? predecessor.source,
          worshipItemKey: changes.worshipItemKey !== undefined ? changes.worshipItemKey : predecessor.worshipItemKey,
          scheduleType: changes.scheduleType ?? predecessor.scheduleType,
          scheduleData: changes.scheduleData ?? predecessor.scheduleData,
          recurrenceRule: changes.recurrenceRule !== undefined ? changes.recurrenceRule : predecessor.recurrenceRule,
          hijriRecurrence: changes.hijriRecurrence !== undefined ? changes.hijriRecurrence : predecessor.hijriRecurrence,
          recurrenceEnd: changes.recurrenceEnd !== undefined ? changes.recurrenceEnd : predecessor.recurrenceEnd,
          seriesId: predecessor.seriesId,
          seriesVersion: predecessor.seriesVersion + 1,
          effectiveFromDate: splitDate,
          effectiveToDate: null,
          reminderRule: changes.reminderRule !== undefined ? changes.reminderRule : predecessor.reminderRule,
          priority: changes.priority ?? predecessor.priority,
          estimatedMinutes: changes.estimatedMinutes !== undefined ? changes.estimatedMinutes : predecessor.estimatedMinutes,
          notes: changes.notes !== undefined ? changes.notes : predecessor.notes,
          tags: changes.tags ?? predecessor.tags,
          subtasks: changes.subtasks ?? predecessor.subtasks,
          isActive: true,
        },
        activeTx
      );

      // 4. Physically delete only PENDING derived future occurrences from splitDate onward
      await this.occRepo.deletePendingFutureOccurrences(seriesId, splitDate, activeTx);

      return { predecessor: updatedPredecessor, newVersion: successor };
    };

    if (tx) {
      return await execute(tx);
    } else {
      return await runInTransaction(execute);
    }
  }

  /**
   * RS-03: "Entire series" edit. Updates active definition version in-place.
   * Completed, missed, and cancelled occurrences retain their frozen placement.
   */
  async updateEntireSeries(
    seriesId: string,
    changes: TaskDefinitionUpdatePatch,
    tx?: any
  ): Promise<TaskDefinition> {
    const active = await this.defRepo.findActiveBySeriesId(seriesId, tx);
    if (!active) {
      throw new TaskValidationError(`Cannot update series ${seriesId}: no active version found`);
    }
    return await this.defRepo.update(active.id, changes, tx);
  }

  /**
   * Completes an occurrence (PENDING -> COMPLETED).
   */
  async completeTask(occurrenceId: string, completedAt?: string, tx?: any): Promise<TaskOccurrence> {
    return await this.occRepo.updateStatus(occurrenceId, 'COMPLETED', completedAt, tx);
  }

  /**
   * Marks an occurrence as missed (PENDING -> MISSED).
   */
  async missTask(occurrenceId: string, missedAt?: string, tx?: any): Promise<TaskOccurrence> {
    return await this.occRepo.updateStatus(occurrenceId, 'MISSED', missedAt, tx);
  }

  /**
   * RS-06: Cancels one occurrence (PENDING -> CANCELLED).
   * Occurrence persists as an immutable tombstone exception row.
   */
  async cancelTask(occurrenceId: string, tx?: any): Promise<TaskOccurrence> {
    return await this.occRepo.updateStatus(occurrenceId, 'CANCELLED', undefined, tx);
  }

  /**
   * RS-07: Delete entire series.
   * Atomically deactivates all definitions for seriesId and cancels all remaining PENDING occurrences.
   * Retains COMPLETED, MISSED, and already CANCELLED history.
   */
  async deleteEntireSeries(seriesId: string, tx?: any): Promise<void> {
    const execute = async (activeTx: any) => {
      await this.defRepo.deactivateSeries(seriesId, activeTx);
      await this.occRepo.cancelAllPendingOccurrences(seriesId, activeTx);
    };

    if (tx) {
      await execute(tx);
    } else {
      await runInTransaction(execute);
    }
  }

  /**
   * Binding Constraint 4: Subtask completion toggle.
   * Validates subtaskId exists in definition.subtasks template.
   * Updates only occurrence.overrideData.completedSubtaskIds without mutating the definition template.
   */
  async toggleSubtaskCompletion(
    occurrenceId: string,
    subtaskId: string,
    completed: boolean,
    tx?: any
  ): Promise<TaskOccurrence> {
    const occ = await this.occRepo.findById(occurrenceId, tx);
    if (!occ) {
      throw new TaskValidationError(`Cannot toggle subtask: occurrence ${occurrenceId} not found`);
    }

    const def = await this.defRepo.findById(occ.taskDefinitionId, tx);
    if (!def) {
      throw new TaskValidationError(`Cannot toggle subtask: definition ${occ.taskDefinitionId} not found`);
    }

    // Confirm subtaskId exists in definition.subtasks
    const subtaskExists = def.subtasks.some(s => s.id === subtaskId);
    if (!subtaskExists) {
      throw new TaskValidationError(
        `Subtask ID ${subtaskId} does not exist in TaskDefinition ${def.id} subtasks template`
      );
    }

    const currentCompleted = new Set<string>(occ.overrideData?.completedSubtaskIds ?? []);
    if (completed) {
      currentCompleted.add(subtaskId);
    } else {
      currentCompleted.delete(subtaskId);
    }

    const updatedOverride: OccurrenceOverrideData = {
      ...(occ.overrideData ?? {}),
      completedSubtaskIds: Array.from(currentCompleted),
    };

    return await this.occRepo.updateOverrideData(occurrenceId, updatedOverride, tx);
  }
}

export const taskEngine = new TaskEngine();
