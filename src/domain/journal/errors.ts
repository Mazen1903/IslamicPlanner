/**
 * Base error class for all Journal domain errors.
 * Invariant: Never include plaintext journal content or raw encryption keys in error messages.
 */
export class JournalError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'JournalError';
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Thrown when encryption or decryption fails (e.g. tampering, corrupt ciphertext, bad key).
 */
export class JournalEncryptionError extends JournalError {
  constructor(message = 'Journal encryption or decryption failed', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'JournalEncryptionError';
  }
}

/**
 * Thrown when an update attempt has a revision that does not match the database row,
 * indicating a concurrent or stale write.
 */
export class StaleWriteError extends JournalError {
  constructor(message = 'Journal entry has been modified by another write; stale revision rejected') {
    super(message);
    this.name = 'StaleWriteError';
  }
}

/**
 * Thrown when key generation, storage, or retrieval via SecureStore fails.
 */
export class JournalKeyError extends JournalError {
  constructor(message = 'Failed to retrieve or store journal encryption key', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'JournalKeyError';
  }
}
