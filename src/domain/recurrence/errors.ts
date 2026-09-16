/**
 * Error codes produced during recurrence evaluation and parsing.
 */
export type RecurrenceErrorCode =
  | 'INVALID_RULE' // Malformed or unparseable RRULE / HijriRecurrenceData
  | 'INVALID_DATE_RANGE' // range.start > range.end or invalid YYYY-MM-DD
  | 'INVALID_INTERVAL' // interval < 1 or non-integer
  | 'INVALID_SEED_DATE' // seedDate not a valid YYYY-MM-DD
  | 'UNSUPPORTED_FREQUENCY' // e.g. YEARLY, HOURLY
  | 'UNSUPPORTED_RULE_FEATURE' // COUNT, UNTIL, BYSETPOS, ordinal BYDAY, unknown keys
  | 'HIJRI_RESOLUTION_FAILED' // HijriService error or missing required context
  | 'OUT_OF_HIJRI_RANGE'; // Candidate date outside HijriService supported range

/**
 * Domain error class for recurrence operations.
 */
export class RecurrenceError extends Error {
  readonly code: RecurrenceErrorCode;

  constructor(
    code: RecurrenceErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = 'RecurrenceError';
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
