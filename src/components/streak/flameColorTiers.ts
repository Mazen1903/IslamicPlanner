export type FlameTier = 'WARM' | 'BRIGHT' | 'HOT' | 'ELECTRIC';

export interface FlameColorConfig {
  tier: FlameTier;
  outer: string;
  middle: string;
  inner: string;
  glow: string;
  textColor: string;
}

/**
 * Maps streak count to flame tier:
 * - WARM (Animation 1): 1–7 days
 * - BRIGHT (Animation 2): 8–30 days
 * - HOT (Animation 3): 31–99 days
 * - ELECTRIC (Animation 4): 100+ days
 */
export function getFlameColorTier(count: number): FlameTier {
  if (count >= 100) return 'ELECTRIC';
  if (count >= 31) return 'HOT';
  if (count >= 8) return 'BRIGHT';
  return 'WARM';
}

export const FLAME_COLORS: Record<FlameTier, FlameColorConfig> = {
  WARM: {
    tier: 'WARM',
    outer: '#FF7300', // Fire Orange
    middle: '#FF8E3A', // Warm Amber
    inner: '#F8E152', // Golden Core
    glow: 'rgba(255, 142, 58, 0.25)',
    textColor: '#FFFFFF',
  },
  BRIGHT: {
    tier: 'BRIGHT',
    outer: '#FF6F00', // Vivid Orange
    middle: '#FF8E3A', // Bright Core
    inner: '#FFA547', // Light Amber
    glow: 'rgba(255, 111, 0, 0.35)',
    textColor: '#FFFFFF',
  },
  HOT: {
    tier: 'HOT',
    outer: '#D92600', // Crimson Red
    middle: '#FF3C00', // Inferno Red-Orange
    inner: '#FF7247', // Hot Amber
    glow: 'rgba(217, 38, 0, 0.45)',
    textColor: '#FFFFFF',
  },
  ELECTRIC: {
    tier: 'ELECTRIC',
    outer: '#871844', // Deep Berry/Wine
    middle: '#FF3C00', // Solar Flare
    inner: '#FFBF00', // Golden Center
    glow: 'rgba(255, 60, 0, 0.50)',
    textColor: '#FFFFFF',
  },
};
