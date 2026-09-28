import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import {
  ThemeGalleryScreen,
  ThemePreviewModal,
  PURE_COLOR_THEMES,
} from '../index';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('ThemeGalleryScreen', () => {
  it('renders Theme header and Pure Color section', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByTestId('theme-back-button')).toBeTruthy();
    expect(screen.getByText('Pure Color')).toBeTruthy();
  });

  it('renders all pure color swatches', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    // Verify pure colors
    PURE_COLOR_THEMES.forEach((theme) => {
      expect(screen.getByTestId(`theme-pure-color-${theme.id}`)).toBeTruthy();
    });
  });

  it('opens ThemePreviewModal when a theme is pressed', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    // Press a pure color theme
    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-pure-color-color_sky_blue'));
    });

    // Modal should be open with title "Tap to Choose a Theme"
    expect(screen.getByText('Tap to Choose a Theme')).toBeTruthy();
    expect(screen.getByTestId('theme-preview-close')).toBeTruthy();
    expect(screen.getByTestId('theme-preview-apply')).toBeTruthy();
  });
});

describe('ThemePreviewModal', () => {
  it('renders header controls and allows closing', async () => {
    const mockClose = jest.fn();
    const mockApply = jest.fn();

    await render(
      <ThemePreviewModal
        visible={true}
        initialItem={PURE_COLOR_THEMES[0]}
        onClose={mockClose}
        onApplyTheme={mockApply}
      />
    );

    expect(screen.getByText('Tap to Choose a Theme')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-preview-close'));
    });

    expect(mockClose).toHaveBeenCalled();
  });

  it('allows selecting swatches and applying theme with checkmark button', async () => {
    const mockClose = jest.fn();
    const mockApply = jest.fn();

    await render(
      <ThemePreviewModal
        visible={true}
        initialItem={PURE_COLOR_THEMES[0]}
        onClose={mockClose}
        onApplyTheme={mockApply}
      />
    );

    // Select second pure color swatch
    await act(async () => {
      fireEvent.press(screen.getByTestId(`swatch-thumb-${PURE_COLOR_THEMES[1].id}`));
    });

    // Press Apply checkmark
    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-preview-apply'));
    });

    expect(mockApply).toHaveBeenCalledWith(PURE_COLOR_THEMES[1]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('shows all pure color swatches', async () => {
    await render(
      <ThemePreviewModal
        visible={true}
        initialItem={PURE_COLOR_THEMES[0]}
        onClose={jest.fn()}
        onApplyTheme={jest.fn()}
      />
    );

    // All pure color swatches should be rendered
    PURE_COLOR_THEMES.forEach((theme) => {
      expect(screen.getByTestId(`swatch-thumb-${theme.id}`)).toBeTruthy();
    });
  });
});
