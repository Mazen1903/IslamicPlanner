import {
  taskOccurrenceRepository,
  TaskOccurrenceRepository,
} from '@/data/repositories/TaskOccurrenceRepository';
import {
  taskDefinitionRepository,
  TaskDefinitionRepository,
} from '@/data/repositories/TaskDefinitionRepository';
import type { TaskOccurrence, TaskDefinition } from '@/domain/task/types';

export interface TodayQueryResult {
  occurrences: TaskOccurrence[];
  definitions: Map<string, TaskDefinition>;
}

export class TodayQueryService {
  constructor(
    private readonly occurrenceRepo: TaskOccurrenceRepository = taskOccurrenceRepository,
    private readonly definitionRepo: TaskDefinitionRepository = taskDefinitionRepository
  ) {}

  /**
   * Fetches all candidate TaskOccurrences for the active planning day (Rule A),
   * cross-day active PENDING prayer windows (Rule B), and prayer-based tasks created
   * for today's civil date before Fajr (Rule C), along with their corresponding
   * TaskDefinitions (loaded in batch, including historical inactive definitions).
   *
   * @param activeCivilDate - Today's wall-clock civil date (YYYY-MM-DD). When it differs
   *   from activePlanningDayKey (Fajr-mode before Fajr), Rule C activates to surface
   *   prayer-based tasks the user created for today that the scheduling engine placed
   *   on the next planningDayKey. Defaults to activePlanningDayKey (no-op).
   */
  async queryTodayCandidates(
    activePlanningDayKey: string,
    nowUtc: string,
    activeCivilDate?: string,
    tx?: any
  ): Promise<TodayQueryResult> {
    const occurrences = await this.occurrenceRepo.findTodayCandidates(
      activePlanningDayKey,
      nowUtc,
      activeCivilDate,
      tx
    );

    const definitionIds = Array.from(
      new Set(occurrences.map(o => o.taskDefinitionId).filter(Boolean))
    );

    const definitionsList = await this.definitionRepo.findByIds(definitionIds, tx);

    const definitions = new Map<string, TaskDefinition>();
    for (const def of definitionsList) {
      definitions.set(def.id, def);
    }

    return {
      occurrences,
      definitions,
    };
  }
}

export const todayQueryService = new TodayQueryService();
