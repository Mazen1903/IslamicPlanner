import * as SecureStore from 'expo-secure-store';
import { AESEncryptionKey } from 'expo-crypto';
import { JournalKeyError, JournalKeyLostError } from '@/domain/journal/errors';

export const JOURNAL_KEY_STORAGE_SLOT = 'journal_encryption_key_v1';

export interface SecureStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync?(key: string): Promise<void>;
}

/**
 * Manages the lifecycle of the AES-256 journal encryption key.
 *
 * Invariants:
 * - Key is generated on first access and stored in SecureStore (slot: journal_encryption_key_v1).
 * - Key is cached in-memory during the active app session.
 * - Key is never stored in SQLite.
 * - Key is never hardcoded, logged, or included in error messages.
 * - If SecureStore returns null while encrypted entries exist in SQLite, throws JournalKeyLostError
 *   rather than silently overwriting with a new key and corrupting existing data.
 * - Single-flight promise deduplication prevents concurrent key initialization races.
 * - On SecureStore read/write failure, throws JournalKeyError without fallback.
 */
export class JournalKeyManager {
  private cachedKey: AESEncryptionKey | null = null;
  private readonly storage: SecureStorage;
  private readonly hasEncryptedEntriesCheck?: () => Promise<boolean>;
  private inFlightPromise: Promise<AESEncryptionKey> | null = null;

  constructor(
    storage: SecureStorage = SecureStore,
    hasEncryptedEntriesCheck?: () => Promise<boolean>
  ) {
    this.storage = storage;
    this.hasEncryptedEntriesCheck = hasEncryptedEntriesCheck;
  }

  /**
   * Retrieves the existing AES encryption key from memory or SecureStore,
   * or generates and persists a new 256-bit key on first access.
   */
  async getOrCreateKey(): Promise<AESEncryptionKey> {
    if (this.cachedKey) {
      return this.cachedKey;
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = this.performGetOrCreateKey().finally(() => {
      this.inFlightPromise = null;
    });

    return this.inFlightPromise;
  }

  private async performGetOrCreateKey(): Promise<AESEncryptionKey> {
    // 1. Return cached in-memory key if present
    if (this.cachedKey) {
      return this.cachedKey;
    }

    // 2. Attempt to load existing key from SecureStore
    let storedHex: string | null = null;
    try {
      storedHex = await this.storage.getItemAsync(JOURNAL_KEY_STORAGE_SLOT);
    } catch (err) {
      throw new JournalKeyError('Failed to read journal encryption key from SecureStore', {
        cause: err,
      });
    }

    if (storedHex && storedHex.trim().length > 0) {
      try {
        const key = await AESEncryptionKey.import(storedHex.trim(), 'hex');
        this.cachedKey = key;
        return key;
      } catch (err) {
        throw new JournalKeyError('Failed to import existing journal encryption key', {
          cause: err,
        });
      }
    }

    // 3. Key is absent from SecureStore. Verify if encrypted rows exist in the database!
    const hasExistingEntries = await this.hasEncryptedEntries();
    if (hasExistingEntries) {
      // Retry once after 150ms in case of Android Keystore transient sync lag
      try {
        await new Promise(resolve => setTimeout(resolve, 150));
        storedHex = await this.storage.getItemAsync(JOURNAL_KEY_STORAGE_SLOT);
        if (storedHex && storedHex.trim().length > 0) {
          const key = await AESEncryptionKey.import(storedHex.trim(), 'hex');
          this.cachedKey = key;
          return key;
        }
      } catch {
        // fall through to JournalKeyLostError
      }

      throw new JournalKeyLostError(
        'Journal encryption key is missing or invalid in SecureStore while encrypted entries exist.'
      );
    }

    // 4. Generate new 256-bit AES key if absent (fresh install or clean database)
    let newKey: AESEncryptionKey;
    let hexString: string;
    try {
      newKey = await AESEncryptionKey.generate(256);
      hexString = await newKey.encoded('hex');
    } catch (err) {
      throw new JournalKeyError('Failed to generate new AES encryption key', {
        cause: err,
      });
    }

    // 5. Persist key to SecureStore before caching
    try {
      await this.storage.setItemAsync(JOURNAL_KEY_STORAGE_SLOT, hexString);
    } catch (err) {
      throw new JournalKeyError(
        'Failed to persist new journal encryption key to SecureStore',
        { cause: err }
      );
    }

    this.cachedKey = newKey;
    return newKey;
  }

  private async hasEncryptedEntries(): Promise<boolean> {
    if (this.hasEncryptedEntriesCheck) {
      return this.hasEncryptedEntriesCheck();
    }
    try {
      const { journalRepository } = await import('@/data/repositories/JournalRepository');
      const count = await journalRepository.count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clears the in-memory cached key (e.g. for testing or app lock).
   */
  clearMemoryCache(): void {
    this.cachedKey = null;
    this.inFlightPromise = null;
  }
}

export const journalKeyManager = new JournalKeyManager();
