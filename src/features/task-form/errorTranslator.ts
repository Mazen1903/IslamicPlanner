import type { SyncIssue } from './types';
import { TaskValidationError, DataIntegrityError } from '@/domain/task/errors';
import { RecurrenceError } from '@/domain/recurrence/errors';
import { SchedulingResolutionError } from '@/domain/scheduling/types';

/**
 * Translates domain errors or unknown thrown errors into user-friendly form error messages.
 */
export function translateFormError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  if (error instanceof TaskValidationError) {
    return error.message;
  }

  if (error instanceof RecurrenceError) {
    switch (error.code) {
      case 'INVALID_RULE':
        return 'The repeating rule is invalid. Please check your selections.';
      case 'UNSUPPORTED_RULE_FEATURE':
      case 'UNSUPPORTED_FREQUENCY':
        return 'This repeat pattern is not supported.';
      case 'INVALID_DATE_RANGE':
        return 'The date range is invalid for recurrence generation.';
      default:
        return 'Invalid recurrence configuration.';
    }
  }

  if (error instanceof SchedulingResolutionError) {
    switch (error.code) {
      case 'INVALID_TEMPORAL_CONTEXT':
        return 'Please configure your location in Settings to calculate prayer times.';
      case 'INSUFFICIENT_TIMELINE':
        return 'Prayer times for this date are not currently available.';
      case 'INVALID_SEED_DATE':
        return 'Selected date is invalid.';
      case 'INVALID_PRAYER_WINDOW':
        return 'Prayer window cannot wrap around midnight.';
      default:
        return 'Unable to calculate prayer schedule for this task.';
    }
  }

  if (error instanceof DataIntegrityError) {
    return 'Data format error. Please verify your task details.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Translates sync issues into user-facing partial success copy.
 * Diagnostic details from SyncIssue are kept internal and never displayed raw.
 */
export function translateSyncIssues(issues: SyncIssue[]): string {
  if (!issues || issues.length === 0) {
    return 'Task saved. Schedule will update on next refresh.';
  }

  const hasContextIssue = issues.some(i => i.stage === 'CONTEXT');
  if (hasContextIssue) {
    return 'Task saved. Its schedule will appear once you configure your location in Settings.';
  }

  return 'Task saved. Schedule will update on next refresh.';
}
