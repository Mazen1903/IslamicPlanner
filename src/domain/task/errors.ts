/**
 * Thrown when raw data (from SQLite, JSON payloads, or external input) violates
 * schema expectations, corrupts domain invariants, or fails boundary parsing.
 */
export class DataIntegrityError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DataIntegrityError';
    Object.setPrototypeOf(this, DataIntegrityError.prototype);
  }
}

/**
 * Thrown when task parameters, guarded status transitions, subtask operations,
 * or series constraints violate business and domain rules.
 */
export class TaskValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TaskValidationError';
    Object.setPrototypeOf(this, TaskValidationError.prototype);
  }
}
