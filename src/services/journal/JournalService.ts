import { DateTime } from 'luxon';
import { buildPrayerTimeline } from '@/domain/prayer/PrayerTimeline';
import { resolvePlanningDayForTime } from '@/domain/planning-day/PlanningDayEngine';
import {
  journalRepository,
  JournalRepository,
} from '@/data/repositories/JournalRepository';
import {
  journalCryptoService,
  JournalCryptoService,
} from './JournalCryptoService';
import {
  journalKeyManager,
  JournalKeyManager,
} from './JournalKeyManager';
import { LocationAwareTodayTemporalInputProvider } from '@/services/TodayTemporalInputProvider';
import type { TodayTemporalInputProvider } from '@/services/types';
import type {
  JournalEntry,
  JournalEntryMetadata,
  JournalEntrySaveInput,
  JournalListOptions,
} from '@/domain/journal/types';
import { JournalError } from '@/domain/journal/errors';
import { isValidCivilDate } from '@/utils/dateValidation';

/**
 * Primary orchestrator service for the Journal feature.
 * Coordinates planningDayKey resolution, AES-256 encryption, key management, and persistence.
 *
 * Invariants:
 * - Plaintext is encrypted before database transactions begin.
 * - No plaintext content is ever written to SQLite.
 * - Failed encryption aborts save without DB write.
 * - Concurrency protected via repository revision counter and mutex.
 * - Never issues GPS permission prompts.
 */
export class JournalService {
  constructor(
    private readonly repository: JournalRepository = journalRepository,
    private readonly cryptoService: JournalCryptoService = journalCryptoService,
    private readonly keyManager: JournalKeyManager = journalKeyManager,
    private readonly temporalInputProvider: TodayTemporalInputProvider = new LocationAwareTodayTemporalInputProvider()
  ) {}

  /**
   * Resolves the current planning day key for a given point in time
   * using the canonical PlanningDayEngine and TodayTemporalInputProvider.
   * If location/settings are not configured (SETUP_REQUIRED), returns null without prompting for GPS.
   */
  async getCurrentPlanningDayKey(
    now: DateTime = DateTime.now()
  ): Promise<string | null> {
    const result = await this.temporalInputProvider.getInputs();
    if (result.status !== 'READY' || !result.inputs) {
      return null;
    }

    const { inputs } = result;
    const centerDate = now.setZone(inputs.params.timezone).toISODate()!;
    const timeline = buildPrayerTimeline(
      centerDate,
      inputs.coordinates,
      inputs.params
    );

    const planningDay = resolvePlanningDayForTime(
      inputs.planningDayConfig,
      timeline,
      now
    );

    return planningDay.key;
  }

  /**
   * Loads and decrypts the journal entry for a specific planningDayKey.
   * Returns null if no entry exists.
   */
  async loadEntry(planningDayKey: string): Promise<JournalEntry | null> {
    if (!isValidCivilDate(planningDayKey)) {
      throw new JournalError(
        `Invalid planningDayKey: ${planningDayKey}. Expected YYYY-MM-DD civil date.`
      );
    }

    const row = await this.repository.findByPlanningDayKey(planningDayKey);
    if (!row) {
      return null;
    }

    const key = await this.keyManager.getOrCreateKey();
    const payload = await this.cryptoService.decrypt(
      row.encryptedPayload,
      key,
      row.encryptionVersion
    );

    return {
      id: row.id,
      planningDayKey: row.planningDayKey,
      payload,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Encrypts and saves a journal entry with stale-write protection.
   * Encryption is performed BEFORE entering the database transaction.
   */
  async saveEntry(input: JournalEntrySaveInput): Promise<JournalEntry> {
    if (!isValidCivilDate(input.planningDayKey)) {
      throw new JournalError(
        `Invalid planningDayKey: ${input.planningDayKey}. Expected YYYY-MM-DD civil date.`
      );
    }

    // 1. Retrieve or generate the AES-256 encryption key
    const key = await this.keyManager.getOrCreateKey();

    // 2. Encrypt the payload before touching the database
    const encryptedPayload = await this.cryptoService.encrypt(
      input.payload,
      key
    );

    // 3. Persist ciphertext to SQLite with optimistic locking
    const row = await this.repository.save({
      planningDayKey: input.planningDayKey,
      encryptedPayload,
      revision: input.revision,
    });

    return {
      id: row.id,
      planningDayKey: row.planningDayKey,
      payload: input.payload,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Hard-deletes a journal entry row by its UUID.
   */
  async deleteEntry(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * Lists journal entry metadata newest-first without decrypting content.
   */
  async listHistory(
    options?: JournalListOptions
  ): Promise<JournalEntryMetadata[]> {
    return this.repository.listHistory(options);
  }

  /**
   * Finds journal entry metadata within a date range.
   */
  async findByDateRange(
    startKey: string,
    endKey: string
  ): Promise<JournalEntryMetadata[]> {
    return this.repository.findByDateRange(startKey, endKey);
  }
}

export const journalService = new JournalService();
