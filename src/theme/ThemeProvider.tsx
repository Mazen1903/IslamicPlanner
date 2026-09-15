import React, { createContext, useCallback, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';
import type { Theme, ThemeMode } from './tokens';

export interface ThemeContextValue extends Theme {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  ...lightTheme,
  themeMode: 'SYSTEM',
  setThemeMode: () => undefined,
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
  mode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
}

export function ThemeProvider({
  children,
  initialMode = 'SYSTEM',
  mode: controlledMode,
  onModeChange,
}: ThemeProviderProps) {
  const [internalMode, setInternalMode] = useState<ThemeMode>(initialMode);
  const activeMode = controlledMode ?? internalMode;
  const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null | undefined

  const setThemeMode = useCallback(
    (newMode: ThemeMode) => {
      if (controlledMode === undefined) {
        setInternalMode(newMode);
      }
      onModeChange?.(newMode);
    },
    [controlledMode, onModeChange],
  );

  const resolvedTheme = useMemo<Theme>(() => {
    if (activeMode === 'SYSTEM') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return activeMode === 'DARK' ? darkTheme : lightTheme;
  }, [activeMode, systemColorScheme]);

  const contextValue = useMemo<ThemeContextValue>(() => {
    return {
      ...resolvedTheme,
      themeMode: activeMode,
      setThemeMode,
    };
  }, [resolvedTheme, activeMode, setThemeMode]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}