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

let mockIsPremium = false;
jest.mock('@/hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    isLoading: false,
    isPremium: mockIsPremium,
    tier: mockIsPremium ? 'PREMIUM' : 'FREE',
    hasFeature: () => mockIsPremium,
    error: null,
    reload: jest.fn().mockResolvedValue(undefined),
  }),
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

  it('directly applies Islamic theme when a theme card is tapped (premium)', async () => {
    mockIsPremium = true;
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId(`islamic-theme-${ISLAMIC_THEMES[0].id}`));
    });

    expect(screen.getByTestId('active-theme-banner')).toBeTruthy();
    expect(screen.getByText(`Active: ${ISLAMIC_THEMES[0].name}`)).toBeTruthy();
    expect(screen.queryByTestId('paywall-sheet')).toBeNull();
  });

  it('opens the paywall instead of applying an Islamic theme for free users', async () => {
    mockIsPremium = false;
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId(`islamic-theme-${ISLAMIC_THEMES[0].id}`));
    });

    expect(screen.getByTestId('paywall-sheet')).toBeTruthy();
    expect(screen.queryByText(`Active: ${ISLAMIC_THEMES[0].name}`)).toBeNull();
  });

  it('renders Appearance header, mode section, and islamic themes section', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    expect(screen.getByTestId('section-header-appearance')).toBeTruthy();
    expect(screen.getByTestId('theme-back-button')).toBeTruthy();
    expect(screen.getByTestId('appearance-mode-section')).toBeTruthy();
    expect(screen.getByTestId('islamic-themes-section-card')).toBeTruthy();
  });

  it('filters themes by category pill', async () => {
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    // Initial 'All' filter renders all 10 themes + default
    expect(screen.getByTestId('theme-category-bar')).toBeTruthy();
    expect(screen.getByText('Sacred Places')).toBeTruthy();
    expect(screen.getByText('Celestial & Times')).toBeTruthy();
    expect(screen.getByText('Nature')).toBeTruthy();

    // Filter by Sacred Places
    await act(async () => {
      fireEvent.press(screen.getByText('Sacred Places'));
    });

    expect(screen.getByTestId('islamic-theme-rawdah_emerald')).toBeTruthy();
    expect(screen.getByTestId('islamic-theme-sacred_tawaf')).toBeTruthy();
    // Non-sacred should be filtered out
    expect(screen.queryByTestId('islamic-theme-fajr_awakening')).toBeNull();

    // Filter by Celestial & Times
    await act(async () => {
      fireEvent.press(screen.getByText('Celestial & Times'));
    });

    expect(screen.getByTestId('islamic-theme-fajr_awakening')).toBeTruthy();
    expect(screen.getByTestId('islamic-theme-tahajjud_noor')).toBeTruthy();
    expect(screen.queryByTestId('islamic-theme-rawdah_emerald')).toBeNull();

    // Filter by Nature
    await act(async () => {
      fireEvent.press(screen.getByText('Nature'));
    });

    expect(screen.getByTestId('islamic-theme-blessed_olive')).toBeTruthy();
    expect(screen.getByTestId('islamic-theme-andalusian_oasis')).toBeTruthy();
    expect(screen.getByTestId('islamic-theme-samarkand_turquoise')).toBeTruthy();
    expect(screen.queryByTestId('islamic-theme-fajr_awakening')).toBeNull();
  });

  it('renders Typography & Display section and allows switching free fonts and text sizes', async () => {
    mockIsPremium = false;
    await render(
      <ThemeProvider>
        <ThemeGalleryScreen />
      </ThemeProvider>
    );

    // Section exists
    expect(screen.getByTestId('typography-display-section')).toBeTruthy();
    expect(screen.getByText('Typography & Display')).toBeTruthy();
    expect(screen.getByText('FONT STYLE')).toBeTruthy();
    expect(screen.getByText('TEXT SIZE')).toBeTruthy();

    // Fonts rendered
    expect(screen.getByTestId('font-option-comic')).toBeTruthy();
    expect(screen.getByTestId('font-option-system')).toBeTruthy();
    expect(screen.getByTestId('font-option-mali')).toBeTruthy();
    expect(screen.getByTestId('font-option-kalam')).toBeTruthy();
    expect(screen.getByTestId('font-option-caveat')).toBeTruthy();

    // Text sizes rendered
    expect(screen.getByTestId('text-scale-small')).toBeTruthy();
    expect(screen.getByTestId('text-scale-default')).toBeTruthy();
    expect(screen.getByTestId('text-scale-large')).toBeTruthy();
    expect(screen.getByTestId('text-scale-xlarge')).toBeTruthy();

    // Selecting free font (system) does not trigger paywall
    await act(async () => {
      fireEvent.press(screen.getByTestId('font-option-system'));
    });
    expect(screen.queryByTestId('paywall-sheet')).toBeNull();

    // Selecting premium font (mali) triggers paywall for free user
    await act(async () => {
      fireEvent.press(screen.getByTestId('font-option-mali'));
    });
    expect(screen.getByTestId('paywall-sheet')).toBeTruthy();
  });
});

describe('ThemePreviewModal', () => {
  const sampleItems: ThemeGalleryItem[] = [
    DEFAULT_THEME_ITEM,
    ...ISLAMIC_THEMES.map((t) => ({
      id: t.id,
      name: t.name,
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
