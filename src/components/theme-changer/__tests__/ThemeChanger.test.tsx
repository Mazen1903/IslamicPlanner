import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider, ISLAMIC_THEMES } from '@/theme';
import {
  ThemeGalleryScreen,
  ThemePreviewModal,
  DEFAULT_THEME_ITEM,
  type ThemeGalleryItem,
} from '../index';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('ThemeGalleryScreen', () => {
  it('renders Appearance header, Mode card with options, and Islamic Themes 2-column grid without pure color', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    // Header & Navigation
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByTestId('theme-back-button')).toBeTruthy();

    // Appearance Mode Section
    expect(screen.getByTestId('appearance-mode-section')).toBeTruthy();
    expect(screen.getByText('Appearance Mode')).toBeTruthy();
    expect(screen.getByTestId('theme-option-light')).toBeTruthy();
    expect(screen.getByTestId('theme-option-dark')).toBeTruthy();
    expect(screen.getByTestId('theme-option-system')).toBeTruthy();

    // Islamic Themes Section & 2-column Grid
    expect(screen.getByText('Islamic Themes')).toBeTruthy();
    expect(screen.getByTestId('islamic-themes-grid')).toBeTruthy();
    expect(screen.getByTestId('islamic-theme-default')).toBeTruthy();

    // Verify all 10 Islamic themes are rendered in the grid
    ISLAMIC_THEMES.forEach((theme) => {
      expect(screen.getByTestId(`islamic-theme-${theme.id}`)).toBeTruthy();
      expect(screen.getByText(theme.name)).toBeTruthy();
    });

    // Verify pure color and fake categories are completely removed
    expect(screen.queryByText('Pure Color')).toBeNull();
    expect(screen.queryByTestId('texture-themes-section')).toBeNull();
    expect(screen.queryByTestId('scenery-themes-section')).toBeNull();
    expect(screen.queryByText('Textures & Materials')).toBeNull();
    expect(screen.queryByText('Scenery & Art')).toBeNull();
  });

  it('allows switching appearance modes directly', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-option-dark'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-option-light'));
    });
  });

  it('opens ThemePreviewModal when an Islamic theme card is tapped', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId(`islamic-theme-${ISLAMIC_THEMES[0].id}`));
    });

    expect(screen.getByText('Tap to Choose a Theme')).toBeTruthy();
    expect(screen.getByTestId('theme-preview-close')).toBeTruthy();
    expect(screen.getByTestId('theme-preview-apply')).toBeTruthy();
    expect(screen.getByTestId(`preview-card-${ISLAMIC_THEMES[0].id}`)).toBeTruthy();
  });
});

describe('ThemePreviewModal', () => {
  const sampleItems: ThemeGalleryItem[] = [
    DEFAULT_THEME_ITEM,
    ...ISLAMIC_THEMES.map((t) => ({
      id: t.id,
      name: t.name,
      arabicName: t.arabicName,
      tagline: t.tagline,
      isDark: t.isDark,
      wallpaperAsset: t.wallpaperAsset,
      previewColors: t.previewColors,
    })),
  ];

  it('renders header controls and allows closing', async () => {
    const mockClose = jest.fn();
    const mockApply = jest.fn();

    await render(
      <ThemePreviewModal
        visible={true}
        initialItem={sampleItems[1]}
        items={sampleItems}
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

  it('allows selecting thumbnails and applying theme with checkmark button', async () => {
    const mockClose = jest.fn();
    const mockApply = jest.fn();

    await render(
      <ThemePreviewModal
        visible={true}
        initialItem={sampleItems[0]}
        items={sampleItems}
        onClose={mockClose}
        onApplyTheme={mockApply}
      />
    );

    // Select second theme thumbnail
    await act(async () => {
      fireEvent.press(screen.getByTestId(`swatch-thumb-${sampleItems[1].id}`));
    });

    // Press Apply checkmark
    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-preview-apply'));
    });

    expect(mockApply).toHaveBeenCalledWith(sampleItems[1]);
    expect(mockClose).toHaveBeenCalled();
  });

  it('shows all Islamic theme thumbnails in the bottom strip', async () => {
    await render(
      <ThemePreviewModal
        visible={true}
        initialItem={sampleItems[0]}
        items={sampleItems}
        onClose={jest.fn()}
        onApplyTheme={jest.fn()}
      />
    );

    sampleItems.forEach((item) => {
      expect(screen.getByTestId(`swatch-thumb-${item.id}`)).toBeTruthy();
    });
  });
});
