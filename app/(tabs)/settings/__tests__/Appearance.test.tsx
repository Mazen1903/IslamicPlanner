import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import AppearanceScreen from '../appearance';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('AppearanceScreen', () => {
  it('renders SYSTEM, LIGHT, and DARK options', async () => {
    await render(
      <ThemeProvider>
        <AppearanceScreen />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-option-system')).toBeTruthy();
    expect(screen.getByTestId('theme-option-light')).toBeTruthy();
    expect(screen.getByTestId('theme-option-dark')).toBeTruthy();

    expect(screen.getByText('System Default')).toBeTruthy();
    expect(screen.getByText('Light Mode')).toBeTruthy();
    expect(screen.getByText('Dark Mode')).toBeTruthy();
  });

  it('calls setThemeMode when an option is selected', async () => {
    const mockOnModeChange = jest.fn();

    await render(
      <ThemeProvider onModeChange={mockOnModeChange}>
        <AppearanceScreen />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('theme-option-dark'));
    expect(mockOnModeChange).toHaveBeenCalledWith('DARK');

    fireEvent.press(screen.getByTestId('theme-option-light'));
    expect(mockOnModeChange).toHaveBeenCalledWith('LIGHT');

    fireEvent.press(screen.getByTestId('theme-option-system'));
    expect(mockOnModeChange).toHaveBeenCalledWith('SYSTEM');
  });
});
