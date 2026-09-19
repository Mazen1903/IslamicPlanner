import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PremiumBadge } from '../PremiumBadge';

describe('PremiumBadge', () => {
  it('renders badge with correct text and accessibility label', async () => {
    await render(
      <ThemeProvider>
        <PremiumBadge testID="custom-badge" />
      </ThemeProvider>
    );

    const badge = screen.getByTestId('custom-badge');
    expect(badge).toBeTruthy();
    expect(screen.getByText('PREMIUM')).toBeTruthy();
    expect(badge.props.accessibilityLabel).toBe('Premium feature');
  });
});
