import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import {
  ThemeGalleryScreen,
  ThemePreviewModal,
  PURE_COLOR_THEMES,
  TEXTURE_THEMES,
  SCENERY_THEMES,
} from '../index';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('ThemeGalleryScreen', () => {
  it('renders Theme header, Pure Color, Texture, and Scenery sections', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByTestId('theme-back-button')).toBeTruthy();
    expect(screen.getByText('Pure Color')).toBeTruthy();
    expect(screen.getByText('Texture')).toBeTruthy();
    expect(screen.getByText('Scenery')).toBeTruthy();
  });

  it('renders all pure color swatches, texture items, and scenery cards', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    // Verify pure colors
    PURE_COLOR_THEMES.forEach((theme) => {
      expect(screen.getByTestId(`theme-pure-color-${theme.id}`)).toBeTruthy();
    });

    // Verify textures
    TEXTURE_THEMES.forEach((theme) => {
      expect(screen.getByTestId(`theme-texture-${theme.id}`)).toBeTruthy();
    });

    // Verify scenery cards
    SCENERY_THEMES.forEach((theme) => {
      expect(screen.getByTestId(`theme-scenery-${theme.id}`)).toBeTruthy();
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

  it('switches categories between Pure Color, Texture, and Scenery', async () => {
    await render(
      <ThemePreviewModal
        visible={true}
        initialItem={PURE_COLOR_THEMES[0]}
        onClose={jest.fn()}
        onApplyTheme={jest.fn()}
      />
    );

    // Switch to Scenery
    await act(async () => {
      fireEvent.press(screen.getByTestId('category-tab-scenery'));
    });

    // Scenery swatches should be rendered
    expect(screen.getByTestId(`swatch-thumb-${SCENERY_THEMES[0].id}`)).toBeTruthy();

    // Switch to Texture
    await act(async () => {
      fireEvent.press(screen.getByTestId('category-tab-texture'));
    });

    expect(screen.getByTestId(`swatch-thumb-${TEXTURE_THEMES[0].id}`)).toBeTruthy();
  });
});
