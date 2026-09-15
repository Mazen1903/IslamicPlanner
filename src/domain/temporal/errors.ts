/**
 * Error codes for low-level temporal resolution operations.
 */
export type TemporalErrorCode =
  | 'INVALID_TIME_FORMAT'
  | 'INVALID_DATE_FORMAT'
  | 'INVALID_TIMEZONE'
  | 'UNRESOLVABLE_DATETIME';

/**
 * Low-level domain error thrown during wall-clock, timezone, or datetime resolution.
 * Strictly isolated from higher domain modules (planning-day, scheduling).
 */
export class TemporalResolutionError extends Error {
  readonly code: TemporalErrorCode;

  constructor(code: TemporalErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TemporalResolutionError';
    this.code = code;
  }
}
