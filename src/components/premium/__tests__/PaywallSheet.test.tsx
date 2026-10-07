import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '@/theme';
import { PaywallSheet } from '../PaywallSheet';
import { purchaseService } from '@/services/purchase/PurchaseService';

describe('PaywallSheet component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('renders correctly with packages, feature highlights, and trial CTA', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <PaywallSheet visible={true} onClose={jest.fn()} />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Unlock Islamic Planner Premium')).toBeTruthy();
      expect(screen.getByText('Annual Plan')).toBeTruthy();
      expect(screen.getByText('Monthly Plan')).toBeTruthy();
      expect(screen.getByText('Lifetime Access')).toBeTruthy();
    });

    expect(screen.getByText('Start 7-Day Free Trial')).toBeTruthy();
    expect(screen.getByText('Restore Purchases')).toBeTruthy();
  });

  it('allows selecting different package options', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <PaywallSheet visible={true} onClose={jest.fn()} />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('package-option-monthly')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('package-option-monthly'));
    });

    await waitFor(() => {
      expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
    });
  });

  it('executes purchase flow and invokes onSuccess upon successful subscription', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnClose = jest.fn();
    jest.spyOn(purchaseService, 'purchasePackage').mockResolvedValueOnce({
      success: true,
      isPremium: true,
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <PaywallSheet
            visible={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('paywall-action-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-action-button'));
    });

    await waitFor(() => {
      expect(purchaseService.purchasePackage).toHaveBeenCalledWith('islamic_planner_annual');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Welcome to Premium! 🌙',
        expect.any(String),
        expect.any(Array)
      );
    });

    // Simulate clicking the alert button
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const buttonAction = alertCall[2][0].onPress;
    await act(async () => {
      buttonAction();
    });

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('allows restoring previous purchases', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnClose = jest.fn();
    jest.spyOn(purchaseService, 'restorePurchases').mockResolvedValueOnce({
      success: true,
      isPremium: true,
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <PaywallSheet
            visible={true}
            onClose={mockOnClose}
            onSuccess={mockOnSuccess}
          />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('paywall-restore-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-restore-button'));
    });

    await waitFor(() => {
      expect(purchaseService.restorePurchases).toHaveBeenCalledTimes(1);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Purchases Restored',
        expect.any(String),
        expect.any(Array)
      );
    });
  });
});
