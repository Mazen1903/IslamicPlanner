import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { StreakBanner } from '../StreakBanner';
import { ThemeProvider } from '@/theme';

describe('StreakBanner', () => {
  it('renders start streak state when streak is 0', async () => {
    await render(
      <ThemeProvider>
        <StreakBanner streak={0} />
      </ThemeProvider>
    );

    expect(screen.getByText('Start your streak')).toBeTruthy();
  });

  it('renders streak count when streak > 0', async () => {
    await render(
      <ThemeProvider>
        <StreakBanner streak={5} />
      </ThemeProvider>
    );

    expect(screen.getByText('5 Day Streak')).toBeTruthy();
  });

  it('renders milestone message for 7 days', async () => {
    await render(
      <ThemeProvider>
        <StreakBanner streak={7} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('streak-banner-milestone')).toBeTruthy();
    expect(screen.getByText(/1 week streak/i)).toBeTruthy();
  });

  it('fires onPress callback when provided and pressed', async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <StreakBanner streak={3} onPress={onPress} />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
