import type { SchedulingContext } from '@/domain/scheduling/types';

export interface MaterializationRequest {
  seriesId: string;
  seedDate: string; // 'YYYY-MM-DD'
}

export type MaterializationAction =
  | 'CREATED'
  | 'UPDATED'
  | 'SKIPPED_COMPLETED'
  | 'SKIPPED_MISSED'
  | 'SKIPPED_CANCELLED';

export interface MaterializationResult {
  seriesId: string;
  seedDate: string;
  action: MaterializationAction;
  occurrenceId: string;
}

export interface MaterializationItemError {
  seriesId: string;
  seedDate: string;
  error: MaterializationError;
}

export interface MaterializationSummary {
  results: MaterializationResult[];
  created: number;
  updated: number;
  skippedCompleted: number;
  skippedMissed: number;
  skippedCancelled: number;
  errors: MaterializationItemError[];
}

export type MaterializationErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_SEED_DATE'
  | 'NO_GOVERNING_VERSION'
  | 'DEFINITION_VERSION_CONFLICT'
  | 'OCCURRENCE_VERSION_CONFLICT'
  | 'SCHEDULING_RESOLUTION_FAILED'
  | 'DATA_INTEGRITY'
  | 'PERSISTENCE_FAILED';

export class MaterializationError extends Error {
  readonly code: MaterializationErrorCode;

  constructor(
    code: MaterializationErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'MaterializationError';
    this.code = code;
    Object.setPrototypeOf(this, MaterializationError.prototype);
  }
}

export interface MaterializationEngineAPI {
  materializeOne(
    request: MaterializationRequest,
    context: SchedulingContext
  ): Promise<MaterializationResult>;

  materializeBatch(
    requests: MaterializationRequest[],
    context: SchedulingContext
  ): Promise<MaterializationSummary>;

  materializeNonRecurring(
    startDate: string,
    endDate: string,
    context: SchedulingContext
  ): Promise<MaterializationSummary>;

  rematerializePending(
    startDate: string,
    endDate: string,
    context: SchedulingContext
  ): Promise<MaterializationSummary>;
}
