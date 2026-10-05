import React from 'react';
import { Text, TextInput, Platform, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { resolveAppFontStyle, installFontDefaults, isAppFontInstalled } from '../installFontDefaults';

describe('Global Font Defaults & Fallback Prevention', () => {
  beforeAll(() => {
    installFontDefaults();
  });

  it('marks the real react-native module as patched via isAppFontInstalled', () => {
    expect(isAppFontInstalled()).toBe(true);
  });

  describe('resolveAppFontStyle', () => {
    it('defaults unstyled text to ComicSansMS-Bold', () => {
      const resolved = StyleSheet.flatten(resolveAppFontStyle(undefined));
      expect(resolved.fontFamily).toBe('ComicSansMS-Bold');
    });

    it('resolves bold text to ComicSansMS-Bold and strips fontWeight on Android', () => {
      const originalPlatform = Platform.OS;
      try {
        (Platform as any).OS = 'android';
        const resolved = StyleSheet.flatten(
          resolveAppFontStyle({ fontSize: 16, fontWeight: '700', color: '#000' })
        );
        expect(resolved.fontFamily).toBe('ComicSansMS-Bold');
        expect(resolved.fontWeight).toBeUndefined();
        expect(resolved.fontSize).toBe(16);
      } finally {
        (Platform as any).OS = originalPlatform;
      }
    });

    it('resolves italic text to ComicSansMS-Italic or BoldItalic', () => {
      const italicRegular = StyleSheet.flatten(
        resolveAppFontStyle({ fontStyle: 'italic', fontFamily: 'ComicSansMS' })
      );
      expect(italicRegular.fontFamily).toBe('ComicSansMS-Italic');

      const italicBold = StyleSheet.flatten(
        resolveAppFontStyle({ fontStyle: 'italic', fontWeight: 'bold' })
      );
      expect(italicBold.fontFamily).toBe('ComicSansMS-BoldItalic');
    });

    it('preserves known vector icon fonts without modifying them', () => {
      const iconStyle = { fontFamily: 'Ionicons', fontSize: 24, color: '#FF0000' };
      const resolved = resolveAppFontStyle(iconStyle);
      expect(resolved).toEqual(iconStyle);

      const matIconStyle = { fontFamily: 'MaterialCommunityIcons', fontSize: 20 };
      const resolvedMat = resolveAppFontStyle(matIconStyle);
      expect(resolvedMat).toEqual(matIconStyle);
    });

    it('preserves monospace font families', () => {
      const monoStyle = { fontFamily: 'monospace', fontSize: 12 };
      const resolved = resolveAppFontStyle(monoStyle);
      expect(resolved).toEqual(monoStyle);
    });
  });

  describe('Monkey-patched Text component', () => {
    it('renders with ComicSansMS-Bold by default via named import', async () => {
      await render(
        <Text testID="app-text-test" style={{ fontSize: 18, color: '#333' }}>
          Hello World
        </Text>
      );
      const el = screen.getByTestId('app-text-test');
      const flat = StyleSheet.flatten(el.props.style);
      expect(flat.fontFamily).toBe('ComicSansMS-Bold');
      expect(flat.fontSize).toBe(18);
    });

    it('renders TextInput with ComicSansMS-Bold by default via named import', async () => {
      await render(
        <TextInput
          testID="app-input-test"
          placeholder="Enter text..."
          style={{ fontSize: 14 }}
        />
      );
      const el = screen.getByTestId('app-input-test');
      const flat = StyleSheet.flatten(el.props.style);
      expect(flat.fontFamily).toBe('ComicSansMS-Bold');
      expect(flat.fontSize).toBe(14);
    });
  });
});

