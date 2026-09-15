import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Icon } from '../Icon';

describe('Icon Component', () => {
  it('renders without crashing with default props', async () => {
    await render(
      <ThemeProvider>
        <Icon name="prayer" accessibilityLabel="Prayer Compass" />
      </ThemeProvider>,
    );

    expect(screen.getByRole('image')).toBeTruthy();
  });

  it('supports custom size and color', async () => {
    await render(
      <ThemeProvider>
        <Icon name="check" size="lg" color="#1B7A4D" />
      </ThemeProvider>,
    );

    expect(screen.getByRole('image')).toBeTruthy();
  });
});
