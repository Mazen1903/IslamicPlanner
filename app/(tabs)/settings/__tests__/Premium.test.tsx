import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeProvider } from '@/theme';
import PremiumScreen, { PREMIUM_NOTIFY_KEY } from '../premium';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('PremiumScreen', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('renders header, hero card, and honest feature comparison', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <PremiumScreen />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('section-header-premium')).toBeTruthy();
    });

    expect(getByText('Islamic Planner Premium')).toBeTruthy();
    expect(getByText('Custom day start time (e.g. 4:00 AM)')).toBeTruthy();
    expect(getByText('Midnight day boundary (12:00 AM)')).toBeTruthy();
    expect(getByText('Compare Plans')).toBeTruthy();
    expect(getByText('Support Our Mission')).toBeTruthy();
  });

  it('allows opting in to notifications and stores key in SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <PremiumScreen />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByText('Notify Me When Available')).toBeTruthy();
    });

    fireEvent.press(getByTestId('premium-upgrade-button'));

    await waitFor(() => {
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(PREMIUM_NOTIFY_KEY, 'true');
      expect(getByText("You're on the list ✓")).toBeTruthy();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'You are on the list! 🌙',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('loads previously saved notification preference and allows opting out', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');

    let optOutAction: any;
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons: any) => {
      if (buttons && buttons[1]?.onPress) {
        optOutAction = buttons[1].onPress;
      }
    });

    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <PremiumScreen />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByText("You're on the list ✓")).toBeTruthy();
    });

    fireEvent.press(getByTestId('premium-upgrade-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Notification Preference',
      expect.any(String),
      expect.any(Array)
    );

    expect(optOutAction).toBeDefined();
    await optOutAction();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(PREMIUM_NOTIFY_KEY);
    await waitFor(() => {
      expect(getByText('Notify Me When Available')).toBeTruthy();
    });
  });
});
