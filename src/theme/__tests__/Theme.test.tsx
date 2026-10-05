import React from 'react';
import { Text } from 'react-native';
import * as ReactNative from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../useTheme';
import { lightColors, lightTheme } from '../lightTheme';
import { darkColors, darkTheme } from '../darkTheme';
import { ISLAMIC_THEMES, ISLAMIC_THEMES_MAP } from '../islamicThemes';

// Pure test-only WCAG 2.1 contrast helper (no production dependency)
function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

function sRGBtoLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(sRGBtoLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ConsumerComponent() {
  const theme = useTheme();
  return (
    <>
      <Text testID="theme-mode">{theme.themeMode}</Text>
      <Text testID="is-dark">{String(theme.isDark)}</Text>
      <Text testID="primary-color">{theme.colors.primary}</Text>
      <Text testID="bg-color">{theme.colors.background}</Text>
    </>
  );
}

describe('Theme System — M21 Token & Contrast Matrix', () => {
  describe('Exact Token Values', () => {
    it('asserts light theme token values', () => {
      expect(lightColors.textTertiary).toBe('#687483');
      expect(lightColors.tabInactive).toBe('#687483');
      expect(lightColors.dangerPressed).toBe('#962D22');
      expect(lightColors.dangerSurface).toBe('#FEE7E7');
    });

    it('asserts dark theme token values', () => {
      expect(darkColors.textTertiary).toBe('#7E90A2');
      expect(darkColors.tabInactive).toBe('#7E90A2');
      expect(darkColors.danger).toBe('#E85050');
      expect(darkColors.error).toBe('#E85050');
      expect(darkColors.dangerPressed).toBe('#D95050');
      expect(darkColors.dangerSurface).toBe('#2D1515');
    });

    it('asserts light and dark ThemeColors key sets are identical', () => {
      const lightKeys = Object.keys(lightColors).sort();
      const darkKeys = Object.keys(darkColors).sort();
      expect(lightKeys).toEqual(darkKeys);
    });
  });

  describe('WCAG AA Contrast Verification (ratio >= 4.5:1)', () => {
    it('satisfies light theme contrast requirements', () => {
      expect(getContrastRatio(lightColors.textTertiary, lightColors.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(lightColors.textTertiary, lightColors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(lightColors.tabInactive, lightColors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(lightColors.danger, lightColors.dangerSurface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(lightColors.textOnPrimary, lightColors.dangerPressed)).toBeGreaterThanOrEqual(4.5);
    });

    it('satisfies dark theme contrast requirements', () => {
      expect(getContrastRatio(darkColors.textTertiary, darkColors.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkColors.textTertiary, darkColors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkColors.textTertiary, darkColors.surfaceSecondary)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkColors.textTertiary, darkColors.surfaceElevated)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkColors.tabInactive, darkColors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkColors.danger, darkColors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkColors.danger, darkColors.dangerSurface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkColors.textOnPrimary, darkColors.dangerPressed)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

describe('ThemeProvider & Scheme Resolution Matrix', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders ThemeProvider without crashing', async () => {
    await render(
      <ThemeProvider>
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode')).toBeTruthy();
  });

  it('LIGHT + system light -> LIGHT', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    await render(
      <ThemeProvider initialMode="LIGHT">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('LIGHT');
    expect(screen.getByTestId('is-dark').props.children).toBe('false');
    expect(screen.getByTestId('primary-color').props.children).toBe(lightTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);
  });

  it('LIGHT + system dark -> LIGHT', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(
      <ThemeProvider initialMode="LIGHT">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('LIGHT');
    expect(screen.getByTestId('is-dark').props.children).toBe('false');
    expect(screen.getByTestId('primary-color').props.children).toBe(lightTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);
  });

  it('DARK + system light -> DARK', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    await render(
      <ThemeProvider initialMode="DARK">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('DARK');
    expect(screen.getByTestId('is-dark').props.children).toBe('true');
    expect(screen.getByTestId('primary-color').props.children).toBe(darkTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
  });

  it('DARK + system dark -> DARK', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(
      <ThemeProvider initialMode="DARK">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('DARK');
    expect(screen.getByTestId('is-dark').props.children).toBe('true');
    expect(screen.getByTestId('primary-color').props.children).toBe(darkTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
  });

  it('SYSTEM + system light -> lightTheme', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    await render(
      <ThemeProvider initialMode="SYSTEM">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('SYSTEM');
    expect(screen.getByTestId('is-dark').props.children).toBe('false');
    expect(screen.getByTestId('primary-color').props.children).toBe(lightTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);
  });

  it('SYSTEM + system dark -> darkTheme', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    await render(
      <ThemeProvider initialMode="SYSTEM">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('SYSTEM');
    expect(screen.getByTestId('is-dark').props.children).toBe('true');
    expect(screen.getByTestId('primary-color').props.children).toBe(darkTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
  });

  it('SYSTEM runtime: system light -> dark transition updates resolved theme', async () => {
    const colorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    const { rerender, getByTestId } = await render(
      <ThemeProvider initialMode="SYSTEM">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(getByTestId('is-dark').props.children).toBe('false');
    expect(getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);

    // Simulate system color scheme transition to dark
    colorSchemeSpy.mockReturnValue('dark');
    await rerender(
      <ThemeProvider initialMode="SYSTEM">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(getByTestId('is-dark').props.children).toBe('true');
    expect(getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
  });

  it('SYSTEM runtime: system dark -> light transition updates resolved theme', async () => {
    const colorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    const { rerender, getByTestId } = await render(
      <ThemeProvider initialMode="SYSTEM">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(getByTestId('is-dark').props.children).toBe('true');
    expect(getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);

    // Simulate system color scheme transition to light
    colorSchemeSpy.mockReturnValue('light');
    await rerender(
      <ThemeProvider initialMode="SYSTEM">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(getByTestId('is-dark').props.children).toBe('false');
    expect(getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);
  });

  it('explicit LIGHT ignores subsequent OS scheme changes', async () => {
    const colorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    const { rerender, getByTestId } = await render(
      <ThemeProvider initialMode="LIGHT">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(getByTestId('is-dark').props.children).toBe('false');

    // System changes to dark
    colorSchemeSpy.mockReturnValue('dark');
    await rerender(
      <ThemeProvider initialMode="LIGHT">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    // Remains light
    expect(getByTestId('is-dark').props.children).toBe('false');
    expect(getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);
  });

  it('explicit DARK ignores subsequent OS scheme changes', async () => {
    const colorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    const { rerender, getByTestId } = await render(
      <ThemeProvider initialMode="DARK">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(getByTestId('is-dark').props.children).toBe('true');

    // System changes to light
    colorSchemeSpy.mockReturnValue('light');
    await rerender(
      <ThemeProvider initialMode="DARK">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    // Remains dark
    expect(getByTestId('is-dark').props.children).toBe('true');
    expect(getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
  });

  it('allows dynamic theme switching via setThemeMode immediately', async () => {
    function SwitcherComponent() {
      const theme = useTheme();
      return (
        <>
          <ConsumerComponent />
          <Text testID="switch-to-dark" onPress={() => theme.setThemeMode('DARK')}>
            Switch
          </Text>
        </>
      );
    }

    await render(
      <ThemeProvider initialMode="LIGHT">
        <SwitcherComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('is-dark').props.children).toBe('false');

    await act(async () => {
      screen.getByTestId('switch-to-dark').props.onPress();
    });

    expect(screen.getByTestId('theme-mode').props.children).toBe('DARK');
    expect(screen.getByTestId('is-dark').props.children).toBe('true');
    expect(screen.getByTestId('primary-color').props.children).toBe(darkTheme.colors.primary);
  });
});

describe('Islamic Themes Registry & Provider Integration', () => {
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

  it('contains exactly 10 Islamic themes with valid metadata', () => {
    expect(ISLAMIC_THEMES).toHaveLength(10);
    const ids = ISLAMIC_THEMES.map(t => t.id);
    expect(ids).toEqual(expectedThemeIds);

    ISLAMIC_THEMES.forEach(theme => {
      expect(theme.name).toBeTruthy();
      expect(theme.tagline).toBeTruthy();
      expect(typeof theme.isDark).toBe('boolean');
      expect(theme.previewColors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.previewColors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.previewColors.surface).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('ensures each Islamic theme has identical key set matching lightColors', () => {
    const canonicalKeys = Object.keys(lightColors).sort();
    ISLAMIC_THEMES.forEach(theme => {
      const themeKeys = Object.keys(theme.colors).sort();
      expect(themeKeys).toEqual(canonicalKeys);
    });
  });

  it('satisfies WCAG AA contrast for textPrimary on background for all 10 Islamic themes', () => {
    ISLAMIC_THEMES.forEach(theme => {
      const ratio = getContrastRatio(theme.colors.textPrimary, theme.colors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('resolves initialIslamicThemeId in ThemeProvider to custom colors and dark status', async () => {
    function IslamicConsumer() {
      const theme = useTheme();
      return (
        <>
          <Text testID="islamic-theme-id">{theme.islamicThemeId ?? 'none'}</Text>
          <Text testID="is-dark">{String(theme.isDark)}</Text>
          <Text testID="primary-color">{theme.colors.primary}</Text>
          <Text testID="bg-color">{theme.colors.background}</Text>
        </>
      );
    }

    const fajr = ISLAMIC_THEMES_MAP['fajr_awakening'];
    await render(
      <ThemeProvider initialIslamicThemeId="fajr_awakening">
        <IslamicConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('islamic-theme-id').props.children).toBe('fajr_awakening');
    expect(screen.getByTestId('is-dark').props.children).toBe(String(fajr.isDark));
    expect(screen.getByTestId('primary-color').props.children).toBe(fajr.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(fajr.colors.background);
  });

  it('allows dynamic switching of Islamic themes at runtime', async () => {
    function DynamicIslamicSwitcher() {
      const theme = useTheme();
      return (
        <>
          <Text testID="active-theme">{theme.islamicThemeId ?? 'none'}</Text>
          <Text testID="primary-color">{theme.colors.primary}</Text>
          <Text testID="btn-rawdah" onPress={() => theme.setIslamicThemeId('rawdah_emerald')}>
            Rawdah
          </Text>
          <Text testID="btn-tahajjud" onPress={() => theme.setIslamicThemeId('tahajjud_noor')}>
            Tahajjud
          </Text>
          <Text testID="btn-reset" onPress={() => theme.setIslamicThemeId(null)}>
            Reset
          </Text>
        </>
      );
    }

    await render(
      <ThemeProvider>
        <DynamicIslamicSwitcher />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('active-theme').props.children).toBe('none');

    const rawdah = ISLAMIC_THEMES_MAP['rawdah_emerald'];
    await act(async () => {
      screen.getByTestId('btn-rawdah').props.onPress();
    });
    expect(screen.getByTestId('active-theme').props.children).toBe('rawdah_emerald');
    expect(screen.getByTestId('primary-color').props.children).toBe(rawdah.colors.primary);

    const tahajjud = ISLAMIC_THEMES_MAP['tahajjud_noor'];
    await act(async () => {
      screen.getByTestId('btn-tahajjud').props.onPress();
    });
    expect(screen.getByTestId('active-theme').props.children).toBe('tahajjud_noor');
    expect(screen.getByTestId('primary-color').props.children).toBe(tahajjud.colors.primary);

    await act(async () => {
      screen.getByTestId('btn-reset').props.onPress();
    });
    expect(screen.getByTestId('active-theme').props.children).toBe('none');
    expect(screen.getByTestId('primary-color').props.children).toBe(lightTheme.colors.primary);
  });

  it('resets islamicThemeId when setThemeMode is explicitly called', async () => {
    function ModeResetter() {
      const theme = useTheme();
      return (
        <>
          <Text testID="active-theme">{theme.islamicThemeId ?? 'none'}</Text>
          <Text testID="btn-set-islamic" onPress={() => theme.setIslamicThemeId('sacred_tawaf')}>
            Tawaf
          </Text>
          <Text testID="btn-set-mode" onPress={() => theme.setThemeMode('DARK')}>
            Dark Mode
          </Text>
        </>
      );
    }

    await render(
      <ThemeProvider>
        <ModeResetter />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByTestId('btn-set-islamic').props.onPress();
    });
    expect(screen.getByTestId('active-theme').props.children).toBe('sacred_tawaf');

    await act(async () => {
      screen.getByTestId('btn-set-mode').props.onPress();
    });
    expect(screen.getByTestId('active-theme').props.children).toBe('none');
  });
});
