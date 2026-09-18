import {
  journalService,
  JournalService,
} from './JournalService';
import type {
  JournalEntry,
  JournalPayload,
} from '@/domain/journal/types';
import { StaleWriteError } from '@/domain/journal/errors';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function createDefaultJournalPayload(): JournalPayload {
  return {
    body: '',
    reflections: {
      gratitude: '',
      wentWell: '',
      improvement: '',
      dua: '',
    },
  };
}

export function isJournalPayloadEmpty(payload?: JournalPayload | null): boolean {
  if (!payload) return true;
  if (payload.body.trim().length > 0) return false;
  const { reflections } = payload;
  if (!reflections) return true;
  return (
    reflections.gratitude.trim().length === 0 &&
    reflections.wentWell.trim().length === 0 &&
    reflections.improvement.trim().length === 0 &&
    reflections.dua.trim().length === 0
  );
}

export function arePayloadsEqual(
  a?: JournalPayload | null,
  b?: JournalPayload | null
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.body === b.body &&
    a.reflections?.gratitude === b.reflections?.gratitude &&
    a.reflections?.wentWell === b.reflections?.wentWell &&
    a.reflections?.improvement === b.reflections?.improvement &&
    a.reflections?.dua === b.reflections?.dua
  );
}

/**
 * Manages debounced, serialized, resilient persistence for Journal entries.
 *
 * Invariants:
 * - Pinned planningDayKey is resolved once at session open and used for all saves.
 * - Edits are debounced by 2000ms.
 * - Only ONE save operation executes at a time (strict serialization).
 * - Newer drafts coalesce and overwrite pending saves; latest draft always wins.
 * - Empty draft safety:
 *   - New entry + empty draft -> no database row is created.
 *   - Existing entry + empty draft -> encrypted empty payload is saved (NEVER auto-deleted).
 *   - Deletion is strictly explicit via deleteEntry().
 * - StaleWrite recovery: on revision mismatch, loads latest revision and retries local draft once.
 * - Local draft is NEVER discarded on failure; error state surfaces "Not saved yet".
 */
export class JournalAutosaveController {
  private _state: SaveState = 'idle';
  private _pinnedPlanningDayKey: string | null = null;
  private _revision: number | undefined = undefined;
  private _persistedEntryId: string | null = null;
  private _isPersisted: boolean = false;
  private _draftPayload: JournalPayload | null = null;
  private _savedPayload: JournalPayload | null = null;
  private _savingPayload: JournalPayload | null = null;
  private _debounceTimer: any = null;
  private _isSaving: boolean = false;
  private _needsAnotherSave: boolean = false;
  private _savePromise: Promise<void> | null = null;

  constructor(
    private readonly service: JournalService = journalService,
    private readonly debounceMs: number = 2000,
    private readonly onStateChange?: (state: SaveState) => void
  ) {}

  get state(): SaveState {
    return this._state;
  }

  get pinnedPlanningDayKey(): string | null {
    return this._pinnedPlanningDayKey;
  }

  get revision(): number | undefined {
    return this._revision;
  }

  get isPersisted(): boolean {
    return this._isPersisted;
  }

  get persistedEntryId(): string | null {
    return this._persistedEntryId;
  }

  get draftPayload(): JournalPayload | null {
    return this._draftPayload;
  }

  private setState(newState: SaveState): void {
    this._state = newState;
    this.onStateChange?.(newState);
  }

  /**
   * Initializes or re-keys the session for a specific planningDayKey.
   * Resolves revision and persistence state from initialEntry.
   */
  beginSession(
    planningDayKey: string,
    initialEntry?: JournalEntry | null
  ): void {
    this.cancelDebounce();
    this._pinnedPlanningDayKey = planningDayKey;

    if (initialEntry) {
      this._revision = initialEntry.revision;
      this._persistedEntryId = initialEntry.id;
      this._isPersisted = true;
      this._draftPayload = {
        body: initialEntry.payload.body,
        reflections: { ...initialEntry.payload.reflections },
      };
      this._savedPayload = {
        body: initialEntry.payload.body,
        reflections: { ...initialEntry.payload.reflections },
      };
    } else {
      this._revision = undefined;
      this._persistedEntryId = null;
      this._isPersisted = false;
      this._draftPayload = createDefaultJournalPayload();
      this._savedPayload = null;
    }

    this._savingPayload = null;
    this.setState('idle');
  }

  /**
   * Enqueues an edit to the draft payload and starts the debounce timer.
   */
  enqueueEdit(payload: JournalPayload): void {
    this._draftPayload = {
      body: payload.body,
      reflections: { ...payload.reflections },
    };

    if (this._isSaving) {
      if (!arePayloadsEqual(this._draftPayload, this._savingPayload)) {
        this._needsAnotherSave = true;
      }
    } else {
      this.setState('dirty');
    }

    this.cancelDebounce();
    this._debounceTimer = setTimeout(() => {
      this._performSave();
    }, this.debounceMs);
  }

  private cancelDebounce(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  /**
   * Performs the save with serialization and queueing.
   */
  private async _performSave(): Promise<void> {
    this.cancelDebounce();

    if (this._isSaving) {
      if (!arePayloadsEqual(this._draftPayload, this._savingPayload)) {
        this._needsAnotherSave = true;
      }
      return this._savePromise ?? Promise.resolve();
    }

    if (!this._pinnedPlanningDayKey || !this._draftPayload) {
      return;
    }

    const payloadToSave: JournalPayload = {
      body: this._draftPayload.body,
      reflections: { ...this._draftPayload.reflections },
    };

    // EMPTY DRAFT SAFETY:
    // Case 1: Untouched blank entry that was never persisted -> do NOT create row
    if (!this._isPersisted && isJournalPayloadEmpty(payloadToSave)) {
      if (this._state === 'dirty') {
        this.setState('idle');
      }
      return;
    }

    this._isSaving = true;
    this._savingPayload = payloadToSave;
    this.setState('saving');

    this._savePromise = (async () => {
      try {
        const saved = await this.service.saveEntry({
          planningDayKey: this._pinnedPlanningDayKey!,
          payload: payloadToSave,
          revision: this._revision,
        });

        this._revision = saved.revision;
        this._persistedEntryId = saved.id;
        this._isPersisted = true;
        this._savedPayload = payloadToSave;

        if (
          !this._needsAnotherSave &&
          this._draftPayload &&
          arePayloadsEqual(this._draftPayload, payloadToSave)
        ) {
          this.setState('saved');
        }
      } catch (err) {
        if (err instanceof StaleWriteError) {
          await this._handleStaleWrite(payloadToSave);
        } else {
          // Any other error: retain local draft in memory, state = error
          this.setState('error');
        }
      }
    })().finally(async () => {
      this._isSaving = false;
      this._savingPayload = null;
      this._savePromise = null;

      if (this._needsAnotherSave) {
        this._needsAnotherSave = false;
        await this._performSave();
      }
    });

    return this._savePromise;
  }

  /**
   * StaleWrite recovery:
   * 1. Retain local draft
   * 2. Reload latest entry/revision from DB
   * 3. Retry local draft once using latest revision
   * 4. If retry fails again, set error state (never overwrite local draft)
   */
  private async _handleStaleWrite(payload: JournalPayload): Promise<void> {
    try {
      const latest = await this.service.loadEntry(this._pinnedPlanningDayKey!);
      if (latest) {
        this._revision = latest.revision;
        this._persistedEntryId = latest.id;
        this._isPersisted = true;
      }

      // Retry once with local draft (prefer latest draft if updated)
      const retryPayload = this._draftPayload
        ? {
            body: this._draftPayload.body,
            reflections: { ...this._draftPayload.reflections },
          }
        : payload;

      const retried = await this.service.saveEntry({
        planningDayKey: this._pinnedPlanningDayKey!,
        payload: retryPayload,
        revision: this._revision,
      });

      this._revision = retried.revision;
      this._persistedEntryId = retried.id;
      this._isPersisted = true;
      this._savedPayload = retryPayload;

      if (
        !this._needsAnotherSave &&
        this._draftPayload &&
        arePayloadsEqual(this._draftPayload, retryPayload)
      ) {
        this.setState('saved');
      }
    } catch {
      // Second failure: stop retrying, keep local draft, state = error
      this.setState('error');
    }
  }

  /**
   * Immediately flushes any pending dirty changes.
   */
  async flush(): Promise<void> {
    this.cancelDebounce();

    if (this._isSaving) {
      if (
        this._draftPayload &&
        !arePayloadsEqual(this._draftPayload, this._savingPayload)
      ) {
        this._needsAnotherSave = true;
      }
      if (this._savePromise) {
        await this._savePromise;
      }
      return;
    }

    if (
      this._draftPayload &&
      (!this._savedPayload ||
        !arePayloadsEqual(this._draftPayload, this._savedPayload))
    ) {
      await this._performSave();
    }
  }

  /**
   * Explicitly deletes the current persisted entry row after user confirmation.
   * Never called automatically due to blank content.
   */
  async deleteCurrentEntry(): Promise<boolean> {
    this.cancelDebounce();

    if (this._persistedEntryId) {
      const success = await this.service.deleteEntry(this._persistedEntryId);
      if (success) {
        this._persistedEntryId = null;
        this._isPersisted = false;
        this._revision = undefined;
        this._draftPayload = createDefaultJournalPayload();
        this._savedPayload = null;
        this._savingPayload = null;
        this.setState('idle');
        return true;
      }
      return false;
    }

    // Not persisted yet; clear local state
    this._draftPayload = createDefaultJournalPayload();
    this._savedPayload = null;
    this._savingPayload = null;
    this.setState('idle');
    return true;
  }

  /**
   * Resets all controller session state.
   */
  reset(): void {
    this.cancelDebounce();
    this._pinnedPlanningDayKey = null;
    this._revision = undefined;
    this._persistedEntryId = null;
    this._isPersisted = false;
    this._draftPayload = null;
    this._savedPayload = null;
    this._savingPayload = null;
    this._isSaving = false;
    this._needsAnotherSave = false;
    this._savePromise = null;
    this.setState('idle');
  }
}
