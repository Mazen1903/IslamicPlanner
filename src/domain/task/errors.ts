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

/**
 * Thrown when multiple governing TaskDefinition versions overlap for a given seed date.
 * Indicates corrupted effective date ranges within a series.
 */
export class DefinitionVersionConflictError extends Error {
  readonly seriesId: string;
  readonly seedDate: string;
  readonly candidateCount: number;

  constructor(seriesId: string, seedDate: string, candidateCount: number) {
    super(
      `Multiple governing versions (${candidateCount}) found for series ${seriesId} on seed date ${seedDate}`
    );
    this.name = 'DefinitionVersionConflictError';
    this.seriesId = seriesId;
    this.seedDate = seedDate;
    this.candidateCount = candidateCount;
    Object.setPrototypeOf(this, DefinitionVersionConflictError.prototype);
  }
}

