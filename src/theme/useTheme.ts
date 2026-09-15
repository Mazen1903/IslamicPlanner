import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './ThemeProvider';
import type { Theme } from './tokens';

/**
 * Hook to access the current theme tokens and modes
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Convenient selector for only theme tokens (colors, typography, spacing, etc.)
 */
export function useThemeTokens(): Theme {
  return useContext(ThemeContext);
}
