import React, { createContext, useCallback, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';
import { ISLAMIC_THEMES, ISLAMIC_THEMES_MAP, type IslamicThemeDefinition } from './islamicThemes';
import { iconSizes, radii, shadows, spacing, touchTargets, type Theme, type ThemeMode } from './tokens';
import { typography } from './typography';

export interface ThemeContextValue extends Theme {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  islamicThemeId: string | null;
  setIslamicThemeId: (id: string | null) => void;
  islamicThemes: IslamicThemeDefinition[];
  activeIslamicTheme: IslamicThemeDefinition | null;
}

export const ThemeContext = createContext<ThemeContextValue>({
  ...lightTheme,
  themeMode: 'SYSTEM',
  setThemeMode: () => undefined,
  islamicThemeId: null,
  setIslamicThemeId: () => undefined,
  islamicThemes: ISLAMIC_THEMES,
  activeIslamicTheme: null,
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
  mode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
  initialIslamicThemeId?: string | null;
  islamicThemeId?: string | null;
  onIslamicThemeChange?: (id: string | null) => void;
}

export function ThemeProvider({
  children,
  initialMode = 'SYSTEM',
  mode: controlledMode,
  onModeChange,
  initialIslamicThemeId = null,
  islamicThemeId: controlledIslamicThemeId,
  onIslamicThemeChange,
}: ThemeProviderProps) {
  const [internalMode, setInternalMode] = useState<ThemeMode>(initialMode);
  const activeMode = controlledMode ?? internalMode;
  const [internalIslamicThemeId, setInternalIslamicThemeId] = useState<string | null>(initialIslamicThemeId);
  const activeIslamicThemeId =
    controlledIslamicThemeId !== undefined ? controlledIslamicThemeId : internalIslamicThemeId;
  const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null | undefined

  const setThemeMode = useCallback(
    (newMode: ThemeMode) => {
      if (controlledMode === undefined) {
        setInternalMode(newMode);
      }
      onModeChange?.(newMode);
      if (controlledIslamicThemeId === undefined) {
        setInternalIslamicThemeId(null);
      }
      onIslamicThemeChange?.(null);
    },
    [controlledMode, onModeChange, controlledIslamicThemeId, onIslamicThemeChange],
  );

  const setIslamicThemeId = useCallback(
    (newThemeId: string | null) => {
      if (controlledIslamicThemeId === undefined) {
        setInternalIslamicThemeId(newThemeId);
      }
      onIslamicThemeChange?.(newThemeId);
    },
    [controlledIslamicThemeId, onIslamicThemeChange],
  );

  const activeIslamicTheme = useMemo<IslamicThemeDefinition | null>(() => {
    if (!activeIslamicThemeId) return null;
    return ISLAMIC_THEMES_MAP[activeIslamicThemeId] ?? null;
  }, [activeIslamicThemeId]);

  const resolvedTheme = useMemo<Theme>(() => {
    if (activeIslamicTheme) {
      return {
        isDark: activeIslamicTheme.isDark,
        colors: activeIslamicTheme.colors,
        spacing,
        radii,
        shadows,
        typography,
        touchTargets,
        iconSizes,
      };
    }

    if (activeMode === 'SYSTEM') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return activeMode === 'DARK' ? darkTheme : lightTheme;
  }, [activeIslamicTheme, activeMode, systemColorScheme]);

  const contextValue = useMemo<ThemeContextValue>(() => {
    return {
      ...resolvedTheme,
      themeMode: activeMode,
      setThemeMode,
      islamicThemeId: activeIslamicThemeId,
      setIslamicThemeId,
      islamicThemes: ISLAMIC_THEMES,
      activeIslamicTheme,
    };
  }, [resolvedTheme, activeMode, setThemeMode, activeIslamicThemeId, setIslamicThemeId, activeIslamicTheme]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}