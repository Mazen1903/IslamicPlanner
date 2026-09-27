import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
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

    const { getByTestId } = await render(
      <ThemeProvider onModeChange={mockOnModeChange}>
        <AppearanceScreen />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(getByTestId('theme-option-dark'));
    });
    expect(mockOnModeChange).toHaveBeenCalledWith('DARK');

    await act(async () => {
      fireEvent.press(getByTestId('theme-option-light'));
    });
    expect(mockOnModeChange).toHaveBeenCalledWith('LIGHT');

    await act(async () => {
      fireEvent.press(getByTestId('theme-option-system'));
    });
    expect(mockOnModeChange).toHaveBeenCalledWith('SYSTEM');
  });

  it('renders the Islamic Themes card and all 10 Islamic themes', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <AppearanceScreen />
      </ThemeProvider>
    );

    expect(getByTestId('islamic-themes-section-card')).toBeTruthy();
    expect(getByText('Islamic Themes')).toBeTruthy();

    const expectedThemeIds = [
      'fajr_awakening',
      'rawdah_emerald',
      'tahajjud_noor',
      'andalusian_oasis',
      'sacred_tawaf',
      'blessed_olive',
      'samarkand_turquoise',
      'celestial_caravan',
      'maghrib_lantern',
      'al_aqsa_sunset',
    ];

    expectedThemeIds.forEach((id) => {
      expect(getByTestId(`islamic-theme-${id}`)).toBeTruthy();
    });

    expect(getByText('Fajr Awakening')).toBeTruthy();
    expect(getByText('فجر السكينة')).toBeTruthy();
    expect(getByText('Rawdah Emerald')).toBeTruthy();
    expect(getByText('الروضة الشريفة')).toBeTruthy();
    expect(getByText('Tahajjud Noor')).toBeTruthy();
    expect(getByText('نور الليل')).toBeTruthy();
  });

  it('allows selecting an Islamic theme and displays its tagline banner', async () => {
    const mockOnIslamicChange = jest.fn();

    const { getByTestId, findByText } = await render(
      <ThemeProvider onIslamicThemeChange={mockOnIslamicChange}>
        <AppearanceScreen />
      </ThemeProvider>
    );

    // Select Fajr Awakening
    await act(async () => {
      fireEvent.press(getByTestId('islamic-theme-fajr_awakening'));
    });
    expect(mockOnIslamicChange).toHaveBeenCalledWith('fajr_awakening');

    // Shows tagline banner for selected theme
    expect(
      await findByText('"By the dawn, and by the ten nights... (Surah Al-Fajr)"')
    ).toBeTruthy();

    // Selecting again toggles it off
    await act(async () => {
      fireEvent.press(getByTestId('islamic-theme-fajr_awakening'));
    });
    expect(mockOnIslamicChange).toHaveBeenCalledWith(null);
  });
});



