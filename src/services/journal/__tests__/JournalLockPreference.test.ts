import {
  JournalLockPreference,
  JOURNAL_LOCK_PREF_SLOT,
} from '../JournalLockPreference';
import type { SecureStorage } from '../JournalKeyManager';

describe('JournalLockPreference', () => {
  let mockStorage: jest.Mocked<SecureStorage>;
  let pref: JournalLockPreference;

  beforeEach(() => {
    mockStorage = {
      getItemAsync: jest.fn(),
      setItemAsync: jest.fn(),
      deleteItemAsync: jest.fn(),
    };
    pref = new JournalLockPreference(mockStorage);
  });

  it('defaults to false when slot is null or empty', async () => {
    mockStorage.getItemAsync.mockResolvedValueOnce(null);
    expect(await pref.isEnabled()).toBe(false);

    mockStorage.getItemAsync.mockResolvedValueOnce('');
    expect(await pref.isEnabled()).toBe(false);
  });

  it('returns true when stored value is "true"', async () => {
    mockStorage.getItemAsync.mockResolvedValueOnce('true');
    expect(await pref.isEnabled()).toBe(true);
    expect(mockStorage.getItemAsync).toHaveBeenCalledWith(JOURNAL_LOCK_PREF_SLOT);
  });

  it('returns false when stored value is "false"', async () => {
    mockStorage.getItemAsync.mockResolvedValueOnce('false');
    expect(await pref.isEnabled()).toBe(false);
  });

  it('returns false on SecureStore read failure without throwing', async () => {
    mockStorage.getItemAsync.mockRejectedValueOnce(new Error('SecureStore failure'));
    expect(await pref.isEnabled()).toBe(false);
  });

  it('sets "true" when enabled', async () => {
    await pref.setEnabled(true);
    expect(mockStorage.setItemAsync).toHaveBeenCalledWith(
      JOURNAL_LOCK_PREF_SLOT,
      'true'
    );
  });

  it('sets "false" when disabled', async () => {
    await pref.setEnabled(false);
    expect(mockStorage.setItemAsync).toHaveBeenCalledWith(
      JOURNAL_LOCK_PREF_SLOT,
      'false'
    );
  });
});
