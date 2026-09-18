import * as SecureStore from 'expo-secure-store';
import type { SecureStorage } from './JournalKeyManager';

export const JOURNAL_LOCK_PREF_SLOT = 'journal_biometric_lock_enabled_v1';

/**
 * Manages persisted biometric lock preference in SecureStore.
 *
 * Invariants:
 * - Stores strictly boolean preference string ('true' | 'false').
 * - NEVER stores prose, keys, decrypted text, or passwords.
 * - Fails safely to false if SecureStore read encounters an error.
 */
export class JournalLockPreference {
  constructor(private readonly storage: SecureStorage = SecureStore) {}

  async isEnabled(): Promise<boolean> {
    try {
      const val = await this.storage.getItemAsync(JOURNAL_LOCK_PREF_SLOT);
      return val === 'true';
    } catch {
      return false;
    }
  }

  async setEnabled(value: boolean): Promise<void> {
    await this.storage.setItemAsync(
      JOURNAL_LOCK_PREF_SLOT,
      value ? 'true' : 'false'
    );
  }
}

export const journalLockPreference = new JournalLockPreference();
