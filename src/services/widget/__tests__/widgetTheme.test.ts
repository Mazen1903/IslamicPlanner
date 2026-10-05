import {
  toOpaqueHex,
  colorsToWidgetPalette,
  resolveWidgetTheme,
} from '../widgetTheme';
import {
  DEFAULT_LIGHT_PALETTE,
  DEFAULT_DARK_PALETTE,
  DEFAULT_WIDGET_THEME,
} from '../types';

describe('widgetTheme', () => {
  describe('toOpaqueHex', () => {
    it('returns standard 6-digit hex normalized to uppercase', () => {
      expect(toOpaqueHex('#1A1A2E')).toBe('#1A1A2E');
      expect(toOpaqueHex('#ffffff')).toBe('#FFFFFF');
    });

    it('composites fully opaque 8-digit hex to 6-digit hex', () => {
      expect(toOpaqueHex('#123456FF')).toBe('#123456');
    });

    it('composites fully transparent color to background color', () => {
      expect(toOpaqueHex('#FF000000', '#FFFFFF')).toBe('#FFFFFF');
      expect(toOpaqueHex('rgba(255, 0, 0, 0)', '#000000')).toBe('#000000');
    });

    it('composites semi-transparent rgba over white background', () => {
      // 50% black over pure white should be #808080 (128, 128, 128)
      const result = toOpaqueHex('rgba(0, 0, 0, 0.5)', '#FFFFFF');
      expect(result).toBe('#808080');
    });

    it('composites 8-digit hex with 50% alpha over black background', () => {
      // #FFFFFF80 (alpha ~0.5) over #000000 -> #808080
      const result = toOpaqueHex('#FFFFFF80', '#000000');
      expect(result).toBe('#808080');
    });

    it('handles fallback for invalid color gracefully', () => {
      expect(toOpaqueHex('not-a-color', '#FFFFFF')).toBe('#FFFFFF');
    });
  });

  describe('colorsToWidgetPalette', () => {
    it('produces 100% opaque hex colors matching #RRGGBB format', () => {
      const mockColors = {
        background: '#0E442B',
        surface: 'rgba(255, 255, 255, 0.1)',
        primary: '#2ECC71',
        textPrimary: '#F9FAFB',
        textSecondary: 'rgba(255, 255, 255, 0.7)',
        border: 'rgba(255, 255, 255, 0.15)',
        warning: '#F59E0B',
      } as any;

      const palette = colorsToWidgetPalette(mockColors);

      expect(palette.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.surface).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.brandGreen).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.textMuted).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.separator).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.importantAccent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('resolveWidgetTheme', () => {
    it('returns DEFAULT_WIDGET_THEME when params are null/empty', () => {
      const theme = resolveWidgetTheme({ themeMode: null, islamicThemeId: null });
      expect(theme.mode).toBe('SYSTEM');
      expect(theme.light).toEqual(DEFAULT_LIGHT_PALETTE);
      expect(theme.dark).toEqual(DEFAULT_DARK_PALETTE);
    });

    it('returns FIXED mode when themeMode is explicit LIGHT', () => {
      const theme = resolveWidgetTheme({ themeMode: 'LIGHT', islamicThemeId: null });
      expect(theme.mode).toBe('FIXED');
      expect(theme.light).toBeDefined();
      expect(theme.dark).toEqual(theme.light);
    });

    it('returns FIXED mode when themeMode is explicit DARK', () => {
      const theme = resolveWidgetTheme({ themeMode: 'DARK', islamicThemeId: null });
      expect(theme.mode).toBe('FIXED');
      expect(theme.light).toBeDefined();
      expect(theme.dark).toEqual(theme.light);
    });

    it('resolves custom Islamic theme when valid islamicThemeId is supplied', () => {
      const theme = resolveWidgetTheme({ themeMode: 'SYSTEM', islamicThemeId: 'fajr_awakening' });
      expect(theme.mode).toBe('FIXED');
      expect(theme.light.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.dark.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // Fajr Awakening dark background is distinct from default dark
      expect(theme.dark.background).not.toBe(DEFAULT_DARK_PALETTE.background);
    });

    it('gracefully falls back when unknown islamicThemeId is supplied', () => {
      const theme = resolveWidgetTheme({ themeMode: 'SYSTEM', islamicThemeId: 'non_existent_theme' });
      expect(theme.mode).toBe('SYSTEM');
      expect(theme.light).toEqual(DEFAULT_LIGHT_PALETTE);
      expect(theme.dark).toEqual(DEFAULT_DARK_PALETTE);
    });
  });
});
