/**
 * Base error class for all Hijri calendar domain operations.
 */
export class HijriDateError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HijriDateError';
    Object.setPrototypeOf(this, HijriDateError.prototype);
  }
}

/**
 * Error codes for Hijri date conversions.
 */
export type HijriConversionErrorCode =
  | 'OUT_OF_RANGE'
  | 'ADJUSTED_OUT_OF_RANGE'
  | 'ADAPTER_ERROR';

/**
 * Thrown when a date conversion cannot be performed because it lies outside
 * the supported converter range, when an adjustment shifts a date out of range,
 * or when an underlying adapter operation fails unexpectedly.
 */
export class HijriConversionError extends HijriDateError {
  readonly code: HijriConversionErrorCode;

  constructor(
    code: HijriConversionErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'HijriConversionError';
    this.code = code;
    Object.setPrototypeOf(this, HijriConversionError.prototype);
  }
}

/**
 * Error codes for Hijri/Gregorian date validation.
 */
export type HijriValidationErrorCode =
  | 'INVALID_DATE_FORMAT'
  | 'INVALID_HIJRI_DATE'
  | 'YEAR_OUT_OF_RANGE'
  | 'MONTH_OUT_OF_RANGE'
  | 'DAY_OUT_OF_RANGE'
  | 'INVALID_STRUCTURE';

/**
 * Thrown when an input date fails syntax, structural, or calendar boundary validation.
 */
export class HijriValidationError extends HijriDateError {
  readonly code: HijriValidationErrorCode;

  constructor(
    code: HijriValidationErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'HijriValidationError';
    this.code = code;
    Object.setPrototypeOf(this, HijriValidationError.prototype);
  }
}

/**
 * Error codes for adjustment configuration validation.
 */
export type HijriAdjustmentErrorCode =
  | 'INVALID_GLOBAL_ADJUSTMENT'
  | 'INVALID_OVERRIDE';

/**
 * Thrown when an adjustment configuration contains invalid values or formats.
 */
export class HijriAdjustmentError extends HijriDateError {
  readonly code: HijriAdjustmentErrorCode;

  constructor(
    code: HijriAdjustmentErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'HijriAdjustmentError';
    this.code = code;
    Object.setPrototypeOf(this, HijriAdjustmentError.prototype);
  }
}

/**
 * Thrown when an unsupported Hijri calculation base method is requested.
 */
export class HijriUnsupportedMethodError extends HijriDateError {
  readonly method: string;

  constructor(method: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HijriUnsupportedMethodError';
    this.method = method;
    Object.setPrototypeOf(this, HijriUnsupportedMethodError.prototype);
  }
}
