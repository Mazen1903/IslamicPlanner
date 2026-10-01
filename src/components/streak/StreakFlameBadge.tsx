import React from 'react';
import { LottieFlameBadge } from './LottieFlameBadge';
import { SvgFlameBadge } from './SvgFlameBadge';
import { SkiaFlameBadge } from './SkiaFlameBadge';

export interface StreakFlameBadgeProps {
  count: number;
  size?: number;
  engine?: 'svg' | 'skia' | 'lottie';
  testID?: string;
}

/**
 * StreakFlameBadge – renders the animated streak flame with count inside.
 * Powered by Lottie for fluid, realistic flame animation.
 * Explicit engine="svg" | "skia" prop is supported for legacy/test isolation.
 */
export function StreakFlameBadge({
  count,
  size = 36,
  engine,
  testID,
}: StreakFlameBadgeProps) {
  if (count < 0) {
    return null;
  }

  // Explicit engine prop overrides (e.g. for unit tests)
  if (engine === 'skia') {
    return (
      <SkiaFlameBadge
        count={count}
        size={size}
        testID={testID ?? 'streak-flame-badge'}
      />
    );
  }

  if (engine === 'svg') {
    return (
      <SvgFlameBadge
        count={count}
        size={size}
        testID={testID ?? 'streak-flame-badge'}
      />
    );
  }

  // Default to Lottie fluid flame
  return (
    <LottieFlameBadge
      count={count}
      size={size}
      testID={testID ?? 'streak-flame-badge'}
    />
  );
}
