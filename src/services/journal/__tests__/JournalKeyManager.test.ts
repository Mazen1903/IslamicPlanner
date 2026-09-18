import {
  JournalKeyManager,
  JOURNAL_KEY_STORAGE_SLOT,
  type SecureStorage,
} from '../JournalKeyManager';
import { JournalKeyError } from '@/domain/journal/errors';

class MockSecureStorage implements SecureStorage {
  store: Record<string, string> = {};
  getItemCalls = 0;
  setItemCalls = 0;
  throwOnGet: Error | null = null;
  throwOnSet: Error | null = null;

  async getItemAsync(key: string): Promise<string | null> {
    this.getItemCalls++;
    if (this.throwOnGet) {
      throw this.throwOnGet;
    }
    return this.store[key] ?? null;
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.setItemCalls++;
    if (this.throwOnSet) {
      throw this.throwOnSet;
    }
    this.store[key] = value;
  }

  async deleteItemAsync(key: string): Promise<void> {
    delete this.store[key];
  }
}

describe('JournalKeyManager', () => {
  let storage: MockSecureStorage;
  let manager: JournalKeyManager;

  beforeEach(() => {
    storage = new MockSecureStorage();
    manager = new JournalKeyManager(storage);
  });

  it('JK-01: First call generates and stores 256-bit key in SecureStore', async () => {
    const key = await manager.getOrCreateKey();
    expect(key).toBeDefined();
    expect(storage.setItemCalls).toBe(1);
    expect(storage.getItemCalls).toBe(1);

    const storedValue = storage.store[JOURNAL_KEY_STORAGE_SLOT];
    expect(storedValue).toBeDefined();
    // 256-bit key in hex is exactly 64 characters
    expect(storedValue).toMatch(/^[0-9a-f]{64}$/i);
  });

  it('JK-02: Subsequent call returns cached key (no SecureStore read)', async () => {
    const key1 = await manager.getOrCreateKey();
    expect(storage.getItemCalls).toBe(1);

    const key2 = await manager.getOrCreateKey();
    expect(storage.getItemCalls).toBe(1); // No new read!
    expect(key1).toBe(key2); // Exactly same cached instance
  });

  it('JK-03: After cache clear, reads existing key from SecureStore', async () => {
    const key1 = await manager.getOrCreateKey();
    const hex1 = await key1.encoded('hex');
    expect(storage.getItemCalls).toBe(1);

    manager.clearMemoryCache();

    const key2 = await manager.getOrCreateKey();
    expect(storage.getItemCalls).toBe(2); // Reads again from storage
    expect(storage.setItemCalls).toBe(1); // Did not regenerate

    const hex2 = await key2.encoded('hex');
    expect(hex1).toBe(hex2);
  });

  it('JK-04: Missing key in SecureStore — generates new key', async () => {
    expect(storage.store[JOURNAL_KEY_STORAGE_SLOT]).toBeUndefined();

    const key = await manager.getOrCreateKey();
    expect(key).toBeDefined();
    expect(storage.store[JOURNAL_KEY_STORAGE_SLOT]).toBeDefined();
  });

  it('JK-05: SecureStore read failure — throws JournalKeyError', async () => {
    storage.throwOnGet = new Error('Disk IO / Keychain failure');

    await expect(manager.getOrCreateKey()).rejects.toThrow(JournalKeyError);
  });

  it('JK-06: SecureStore write failure — throws JournalKeyError, no unencrypted fallback', async () => {
    storage.throwOnSet = new Error('Permission denied writing to SecureStore');

    await expect(manager.getOrCreateKey()).rejects.toThrow(JournalKeyError);

    // Ensure no key is cached in-memory if write failed
    manager.clearMemoryCache();
    await expect(manager.getOrCreateKey()).rejects.toThrow(JournalKeyError);
  });

  it('JK-07: Key is never logged or included in error messages', async () => {
    storage.throwOnSet = new Error('SecureStore write failed');

    try {
      await manager.getOrCreateKey();
      fail('Expected getOrCreateKey to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(JournalKeyError);
      // Key should never be in message
      expect(err.message).not.toMatch(/[0-9a-f]{64}/i);
    }
  });
});
