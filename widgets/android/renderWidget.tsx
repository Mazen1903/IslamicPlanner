import React from 'react';
import type { WidgetRepresentation } from 'react-native-android-widget';
import type { WidgetSnapshot, WidgetPalette } from '@/services/widget/types';
import { DEFAULT_WIDGET_THEME } from '@/services/widget/types';

export interface WidgetComponentProps {
  snapshot: WidgetSnapshot;
  palette: WidgetPalette;
}

/**
 * Transforms a WidgetSnapshot and WidgetComponent into a react-native-android-widget WidgetRepresentation.
 * Supports:
 * - FIXED mode: Single representation with the explicit light/dark palette.
 * - SYSTEM mode: Dual representation ({ light, dark }) allowing Android to switch palettes natively.
 */
export function toWidgetRepresentation(
  snapshot: WidgetSnapshot,
  Component: React.ComponentType<WidgetComponentProps>
): WidgetRepresentation {
  const theme = snapshot.theme ?? DEFAULT_WIDGET_THEME;

  if (theme.mode === 'FIXED') {
    return React.createElement(Component, { snapshot, palette: theme.light });
  }

  return {
    light: React.createElement(Component, { snapshot, palette: theme.light }),
    dark: React.createElement(Component, { snapshot, palette: theme.dark }),
  };
}
