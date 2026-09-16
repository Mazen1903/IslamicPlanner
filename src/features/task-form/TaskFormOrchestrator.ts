import { TaskEngine } from '@/domain/task/TaskEngine';
import { taskEngine as defaultTaskEngine } from '@/domain/task';
import type { TaskDefinition } from '@/domain/task/types';
import type { TodayTemporalInputProvider } from '@/services/types';
import { M7BootstrapInputProvider } from '@/services/TodayTemporalInputProvider';
import type {
  EditScope,
  FormState,
  OrchestratorResult,
  SyncCounts,
  SyncIssue,
} from './types';
import {
  mapStateToCreateParams,
  mapStateToOverrideData,
  mapStateToUpdatePatch,
} from './taskDraftMapper';
import { TaskFormSyncService, taskFormSyncService, computeSyncHorizon } from './syncService';
import { RecurringHorizonSync, recurringHorizonSync as defaultRecurringHorizonSync } from './recurringHorizonSync';

interface CommittedSaveIdentity {
  kind: 'CREATE' | 'THIS_OCCURRENCE' | 'THIS_AND_FUTURE' | 'SERIES_UPDATE';
  definitionId: string;
  seriesId: string;
  scope?: EditScope;
  preDef?: TaskDefinition;
  postDef?: TaskDefinition;
}

export class TaskFormOrchestrator {
  private isSubmitting = false;
  private committedIdentity: CommittedSaveIdentity | null = null;

  constructor(
    private taskEngine: TaskEngine = defaultTaskEngine,
    private syncService: TaskFormSyncService = taskFormSyncService,
    private horizonSync: RecurringHorizonSync = defaultRecurringHorizonSync,
    private inputProvider: TodayTemporalInputProvider = new M7BootstrapInputProvider()
  ) {}

  /**
   * Returns current flight state.
   */
  get isInFlight(): boolean {
    return this.isSubmitting;
  }

  /**
   * Returns committed identity if Phase 1 has succeeded.
   */
  get committed(): CommittedSaveIdentity | null {
    return this.committedIdentity;
  }

  /**
   * Resets flight state and committed identity (e.g. on unmount or clean reset).
   */
  resetFlight(): void {
    this.isSubmitting = false;
    this.committedIdentity = null;
  }

  /**
   * Executes the Two-Phase Save Contract with Single-Flight Concurrency Protection.
   *
   * Phase 1: Authoritative Definition Mutation (throws if fails).
   * Phase 2: Best-effort Derived Occurrence Synchronization (idempotently retryable).
   */
  async submit(state: FormState): Promise<OrchestratorResult> {
    // Single-Flight Latch Check: Synchronous check before first await
    if (this.isSubmitting) {
      throw new Error('Save operation already in flight');
    }
    if (this.committedIdentity) {
      // If already committed, Phase 1 cannot be re-executed; run Phase 2 retry only
      return await this.retrySync();
    }

    this.isSubmitting = true;

    try {
      // ==========================================
      // PHASE 1: DEFINITION MUTATION (Authoritative)
      // ==========================================
      let identity: CommittedSaveIdentity;

      if (state.mode === 'CREATE') {
        const params = mapStateToCreateParams(state);
        const createdDef = await this.taskEngine.createTask(params);
        identity = {
          kind: 'CREATE',
          definitionId: createdDef.id,
          seriesId: createdDef.seriesId,
          postDef: createdDef,
        };
      } else {
        // Edit mode
        const preDef = state.initialDefinition;
        if (!preDef) {
          throw new Error('Initial TaskDefinition is required in EDIT mode');
        }

        if (state.editScope === 'THIS_OCCURRENCE') {
          if (!state.initialOccurrence) {
            throw new Error('Initial TaskOccurrence is required for THIS_OCCURRENCE edit');
          }
          const overrideData = mapStateToOverrideData(state);
          await this.taskEngine.updateOccurrenceOverride(
            state.initialOccurrence.id,
            overrideData
          );
          identity = {
            kind: 'THIS_OCCURRENCE',
            definitionId: preDef.id,
            seriesId: preDef.seriesId,
            scope: 'THIS_OCCURRENCE',
            preDef,
            postDef: preDef,
          };
        } else if (state.editScope === 'THIS_AND_FUTURE') {
          const splitDate = state.civilSeedDate;
          const patch = mapStateToUpdatePatch(state);
          const splitResult = await this.taskEngine.splitSeriesAndFuture(
            preDef.seriesId,
            splitDate,
            patch
          );
          identity = {
            kind: 'THIS_AND_FUTURE',
            definitionId: splitResult.newVersion.id,
            seriesId: splitResult.newVersion.seriesId,
            scope: 'THIS_AND_FUTURE',
            preDef,
            postDef: splitResult.newVersion,
          };
        } else {
          // ALL_OCCURRENCES or non-recurring edit
          const patch = mapStateToUpdatePatch(state);
          const updatedDef = await this.taskEngine.updateEntireSeries(
            preDef.seriesId,
            patch
          );
          identity = {
            kind: 'SERIES_UPDATE',
            definitionId: updatedDef.id,
            seriesId: updatedDef.seriesId,
            scope: state.editScope ?? 'ALL_OCCURRENCES',
            preDef,
            postDef: updatedDef,
          };
        }
      }

      // Latch committed identity immediately upon Phase 1 success
      this.committedIdentity = identity;
    } finally {
      this.isSubmitting = false;
    }

    // ==========================================
    // PHASE 2: DERIVED OCCURRENCE SYNCHRONIZATION
    // ==========================================
    return await this.executePhase2(this.committedIdentity);
  }

  /**
   * Retries occurrence synchronization (Phase 2 ONLY) using latched identity.
   * Never re-executes Phase 1 mutation.
   */
  async retrySync(): Promise<OrchestratorResult> {
    if (!this.committedIdentity) {
      throw new Error('Cannot retry sync: no committed save identity exists');
    }
    return await this.executePhase2(this.committedIdentity);
  }

  private async executePhase2(identity: CommittedSaveIdentity): Promise<OrchestratorResult> {
    const { definitionId, seriesId, scope, kind, preDef, postDef } = identity;

    // Check temporal inputs
    let temporalResult;
    try {
      temporalResult = await this.inputProvider.getInputs();
    } catch (err: any) {
      const issues: SyncIssue[] = [
        {
          stage: 'CONTEXT',
          seriesId,
          message: `Failed to load temporal settings: ${err?.message ?? err}`,
        },
      ];
      return {
        status: 'SAVED_SYNC_INCOMPLETE',
        definitionId,
        seriesId,
        scope,
        sync: { created: 0, retained: 0, deleted: 0 },
        issues,
      };
    }

    if (temporalResult.status === 'SETUP_REQUIRED') {
      const issues: SyncIssue[] = [
        {
          stage: 'CONTEXT',
          seriesId,
          message: 'Location configuration is required for occurrence synchronization',
        },
      ];
      return {
        status: 'SAVED_SYNC_INCOMPLETE',
        definitionId,
        seriesId,
        scope,
        sync: { created: 0, retained: 0, deleted: 0 },
        issues,
      };
    }

    const temporalInputs = temporalResult.inputs;
    let syncRes: { sync: SyncCounts; issues: SyncIssue[] };

    if (kind === 'CREATE') {
      syncRes = await this.syncService.syncOccurrencesAfterCreate(postDef!, temporalInputs);
    } else if (kind === 'THIS_OCCURRENCE') {
      syncRes = { sync: { created: 0, retained: 1, deleted: 0 }, issues: [] };
    } else if (kind === 'THIS_AND_FUTURE') {
      // Successor horizon sync
      const horizon = computeSyncHorizon(postDef!.startDate);
      const res = await this.horizonSync.syncSeries(postDef!.seriesId, horizon, temporalInputs);
      syncRes = {
        sync: { created: res.created, retained: res.retained, deleted: res.deleted },
        issues: res.issues,
      };
    } else {
      // SERIES_UPDATE
      syncRes = await this.syncService.reconcileAfterEdit(preDef!, postDef!, temporalInputs);
    }

    if (syncRes.issues.length === 0) {
      return {
        status: 'SAVED_AND_SYNCED',
        definitionId,
        seriesId,
        scope,
        sync: syncRes.sync,
      };
    }

    return {
      status: 'SAVED_SYNC_INCOMPLETE',
      definitionId,
      seriesId,
      scope,
      sync: syncRes.sync,
      issues: syncRes.issues,
    };
  }
}

export const taskFormOrchestrator = new TaskFormOrchestrator();

