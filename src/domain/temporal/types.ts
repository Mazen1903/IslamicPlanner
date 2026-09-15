import type { DateTime } from 'luxon';

/**
 * Result kind of resolving a wall-clock time in an IANA timezone with DST awareness.
 * - 'NORMAL': Unambiguous local time exists.
 * - 'SPRING_FORWARD_SHIFTED': Nonexistent local time (falls in DST gap); resolved to first valid instant after gap.
 * - 'FALL_BACK_FIRST': Ambiguous local time (falls in DST overlap); resolved to earlier absolute occurrence.
 */
export type WallClockResolutionKind =
  | 'NORMAL'
  | 'SPRING_FORWARD_SHIFTED'
  | 'FALL_BACK_FIRST';

/**
 * Result of resolving a wall-clock time in an IANA timezone with DST awareness.
 */
export interface WallClockResolution {
  /** The resolved absolute DateTime. */
  resolvedTime: DateTime;
  /** How the resolution was performed. */
  resolution: WallClockResolutionKind;
}
