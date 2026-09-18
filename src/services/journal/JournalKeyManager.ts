import * as SecureStore from 'expo-secure-store';
import { AESEncryptionKey } from 'expo-crypto';
import { JournalKeyError } from '@/domain/journal/errors';

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
 * - On SecureStore read/write failure, throws JournalKeyError without fallback.
 */
export class JournalKeyManager {
  private cachedKey: AESEncryptionKey | null = null;
  private readonly storage: SecureStorage;

  constructor(storage: SecureStorage = SecureStore) {
    this.storage = storage;
  }

  /**
   * Retrieves the existing AES encryption key from memory or SecureStore,
   * or generates and persists a new 256-bit key on first access.
   */
  async getOrCreateKey(): Promise<AESEncryptionKey> {
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

    // 3. Generate new 256-bit AES key if absent
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

    // 4. Persist key to SecureStore before caching
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

  /**
   * Clears the in-memory cached key (e.g. for testing or app lock).
   */
  clearMemoryCache(): void {
    this.cachedKey = null;
  }
}

export const journalKeyManager = new JournalKeyManager();
