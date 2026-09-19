import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PremiumLockedInfo } from '../PremiumLockedInfo';

describe('PremiumLockedInfo', () => {
  it('renders calm informational copy when visible', async () => {
    const handleClose = jest.fn();

    await render(
      <ThemeProvider>
        <PremiumLockedInfo visible={true} onClose={handleClose} />
      </ThemeProvider>
    );

    expect(screen.getByText('Premium Feature')).toBeTruthy();
    expect(
      screen.getByText(/Custom planning-day boundaries let you choose exactly when your day begins/i)
    ).toBeTruthy();
    expect(
      screen.getByText('Purchasing will be available in a future update.')
    ).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();

    // Verify absence of marketing/checkout copy
    expect(screen.queryByText(/upgrade now/i)).toBeNull();
    expect(screen.queryByText(/subscribe/i)).toBeNull();
    expect(screen.queryByText(/price/i)).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it('calls onClose when OK button is pressed', async () => {
    const handleClose = jest.fn();

    await render(
      <ThemeProvider>
        <PremiumLockedInfo visible={true} onClose={handleClose} />
      </ThemeProvider>
    );

    const okButton = screen.getByTestId('premium-locked-info-ok');
    fireEvent.press(okButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is pressed', async () => {
    const handleClose = jest.fn();

    await render(
      <ThemeProvider>
        <PremiumLockedInfo visible={true} onClose={handleClose} />
      </ThemeProvider>
    );

    const backdrop = screen.getByTestId('premium-locked-info-backdrop', {
      includeHiddenElements: true,
    });
    fireEvent.press(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
