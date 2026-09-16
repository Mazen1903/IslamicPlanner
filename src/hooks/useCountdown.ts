import { useTodayStore } from '@/stores/useTodayStore';

/**
 * Pure countdown formatter. Formats millisecond duration into human-readable countdown string.
 * Example: "1h 23m 45s", "14m 20s", "45s".
 */
export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return '0s';
  }
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Hook to access the current countdown display.
 * Reads directly from the single-ticker store field.
 * CRITICAL INVARIANT: Does NOT instantiate any interval.
 */
export function useCountdown(): string | null {
  return useTodayStore(state => state.countdownDisplay);
}
