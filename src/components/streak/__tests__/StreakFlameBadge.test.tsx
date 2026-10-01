import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { StreakFlameBadge } from '../StreakFlameBadge';
import { getFlameColorTier, FLAME_COLORS } from '../flameColorTiers';

describe('Streak Flame Color Tiers', () => {
  it('maps counts correctly to flame tiers', () => {
    // Warm tier: 1 - 7
    expect(getFlameColorTier(0)).toBe('WARM');
    expect(getFlameColorTier(1)).toBe('WARM');
    expect(getFlameColorTier(7)).toBe('WARM');

    // Bright tier: 8 - 30
    expect(getFlameColorTier(8)).toBe('BRIGHT');
    expect(getFlameColorTier(15)).toBe('BRIGHT');
    expect(getFlameColorTier(30)).toBe('BRIGHT');

    // Hot tier: 31 - 99
    expect(getFlameColorTier(31)).toBe('HOT');
    expect(getFlameColorTier(50)).toBe('HOT');
    expect(getFlameColorTier(99)).toBe('HOT');

    // Electric tier: 100+
    expect(getFlameColorTier(100)).toBe('ELECTRIC');
    expect(getFlameColorTier(365)).toBe('ELECTRIC');
  });

  it('defines distinct palette colors and glow effects for all tiers', () => {
    const tiers = ['WARM', 'BRIGHT', 'HOT', 'ELECTRIC'] as const;
    tiers.forEach((tier) => {
      const config = FLAME_COLORS[tier];
      expect(config.outer).toBeTruthy();
      expect(config.middle).toBeTruthy();
      expect(config.inner).toBeTruthy();
      expect(config.glow).toBeTruthy();
      expect(config.textColor).toBeTruthy();
    });

    // Verify distinct characteristic hues
    expect(FLAME_COLORS.WARM.outer).toBe('#FF7300');
    expect(FLAME_COLORS.BRIGHT.outer).toBe('#FF6F00');
    expect(FLAME_COLORS.HOT.outer).toBe('#D92600');
    expect(FLAME_COLORS.ELECTRIC.outer).toBe('#871844');
  });
});

describe('StreakFlameBadge Component', () => {
  it('renders flame badge when count is 0 (initial streak)', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <StreakFlameBadge count={0} testID="test-badge-zero" />
      </ThemeProvider>
    );
    expect(getByTestId('test-badge-zero')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });

  it('renders nothing when count is negative', async () => {
    const { queryByTestId } = await render(
      <ThemeProvider>
        <StreakFlameBadge count={-1} testID="test-badge-neg" />
      </ThemeProvider>
    );
    expect(queryByTestId('test-badge-neg')).toBeNull();
  });

  it('renders flame badge when count is >= 1', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <StreakFlameBadge count={5} testID="test-badge" />
      </ThemeProvider>
    );

    expect(getByTestId('test-badge')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('renders 3-digit streak count legibly inside the flame', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <StreakFlameBadge count={120} testID="test-badge-120" />
      </ThemeProvider>
    );

    expect(getByTestId('test-badge-120')).toBeTruthy();
    expect(getByText('120')).toBeTruthy();
  });

  it('supports explicit engine="svg" rendering', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <StreakFlameBadge count={7} engine="svg" testID="test-svg" />
      </ThemeProvider>
    );

    expect(getByTestId('test-svg')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
  });

  it('supports explicit engine="skia" rendering (graceful fallback in test env)', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <StreakFlameBadge count={30} engine="skia" testID="test-skia" />
      </ThemeProvider>
    );

    expect(getByTestId('test-skia')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
  });
});
