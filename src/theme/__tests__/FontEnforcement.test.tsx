import React from 'react';
import fs from 'fs';
import path from 'path';
// CRITICAL: Must use NAMED imports, exactly like real application code does.
import { Text, TextInput, Platform, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { installFontDefaults } from '../installFontDefaults';

describe('Font Enforcement & Consistency', () => {
  beforeAll(() => {
    installFontDefaults();
  });

  describe('Named-Import Behavioral Enforcement', () => {
    it('forces ComicSansMS-Bold on named-import Text even with raw fontSize', async () => {
      await render(
        <Text testID="enforced-text" style={{ fontSize: 15, color: '#333' }}>
          Enforced text
        </Text>
      );
      const el = screen.getByTestId('enforced-text');
      const flat = StyleSheet.flatten(el.props.style);
      expect(flat.fontFamily).toBe('ComicSansMS-Bold');
      expect(flat.fontSize).toBe(15);
    });

    it('forces ComicSansMS-Bold on named-import TextInput with raw fontSize', async () => {
      await render(
        <TextInput testID="enforced-input" placeholder="Type here" style={{ fontSize: 13 }} />
      );
      const el = screen.getByTestId('enforced-input');
      const flat = StyleSheet.flatten(el.props.style);
      expect(flat.fontFamily).toBe('ComicSansMS-Bold');
      expect(flat.fontSize).toBe(13);
    });

    it('preserves TextInput static properties (e.g. State)', () => {
      expect((TextInput as any).State).toBeDefined();
    });

    it('forces ComicSansMS-Bold on nested Text components', async () => {
      await render(
        <Text testID="outer-text">
          Outer <Text testID="nested-text" style={{ fontSize: 12 }}>Nested</Text>
        </Text>
      );
      const outerFlat = StyleSheet.flatten(screen.getByTestId('outer-text').props.style);
      const nestedFlat = StyleSheet.flatten(screen.getByTestId('nested-text').props.style);
      expect(outerFlat.fontFamily).toBe('ComicSansMS-Bold');
      expect(nestedFlat.fontFamily).toBe('ComicSansMS-Bold');
    });

    it('strips fontWeight and keeps ComicSansMS-Bold on Android', async () => {
      const originalPlatform = Platform.OS;
      try {
        (Platform as any).OS = 'android';
        await render(
          <Text testID="android-bold-text" style={{ fontSize: 16, fontWeight: '700' }}>
            Android Bold
          </Text>
        );
        const flat = StyleSheet.flatten(screen.getByTestId('android-bold-text').props.style);
        expect(flat.fontFamily).toBe('ComicSansMS-Bold');
        expect(flat.fontWeight).toBeUndefined();
      } finally {
        (Platform as any).OS = originalPlatform;
      }
    });

    it('resolves italic variants accurately', async () => {
      await render(
        <>
          <Text
            testID="italic-regular"
            style={{ fontStyle: 'italic', fontFamily: 'ComicSansMS' }}
          >
            Italic Regular
          </Text>
          <Text
            testID="italic-bold"
            style={{ fontStyle: 'italic', fontWeight: 'bold' }}
          >
            Italic Bold
          </Text>
        </>
      );
      const regFlat = StyleSheet.flatten(screen.getByTestId('italic-regular').props.style);
      const boldFlat = StyleSheet.flatten(screen.getByTestId('italic-bold').props.style);
      expect(regFlat.fontFamily).toBe('ComicSansMS-Italic');
      expect(boldFlat.fontFamily).toBe('ComicSansMS-BoldItalic');
    });

    it('never overrides vector icon fonts with Comic Sans', async () => {
      await render(
        <Ionicons testID="vector-icon" name="home" size={24} color="#000" />
      );
      const icon = screen.getByTestId('vector-icon');
      const flat = StyleSheet.flatten(icon.props.style);
      expect(flat.fontFamily).not.toBe('ComicSansMS-Bold');
      expect(['Ionicons', 'ionicons']).toContain(flat.fontFamily);
    });

    it('is idempotent and does not multiply wrap Text when installFontDefaults is called repeatedly', () => {
      const FirstRef = Text;
      installFontDefaults();
      installFontDefaults();
      // Wrapping should be a no-op once installed
      expect(Text).toBe(FirstRef);
    });
  });

  describe('Static Guardrail Audit (app/** and src/**)', () => {
    const projectRoot = path.resolve(__dirname, '../../../');

    function walkDir(dir: string): string[] {
      let files: string[] = [];
      if (!fs.existsSync(dir)) return files;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name === '__tests__' ||
            entry.name === 'node_modules' ||
            entry.name.startsWith('.')
          ) {
            continue;
          }
          files = files.concat(walkDir(full));
        } else if (
          (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
          !entry.name.includes('.test.') &&
          !entry.name.includes('.spec.')
        ) {
          files.push(full);
        }
      }
      return files;
    }

    const appFiles = walkDir(path.join(projectRoot, 'app'));
    const srcFiles = walkDir(path.join(projectRoot, 'src')).filter(
      f => !f.replace(/\\/g, '/').includes('src/theme/')
    );
    const auditedFiles = [...appFiles, ...srcFiles];

    it('contains no hardcoded fontFamily string literals outside src/theme/**', () => {
      const violations: string[] = [];
      for (const file of auditedFiles) {
        const code = fs.readFileSync(file, 'utf8');
        // Ignore comments
        const clean = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        if (/fontFamily\s*:\s*['"]/.test(clean)) {
          violations.push(path.relative(projectRoot, file).replace(/\\/g, '/'));
        }
      }
      expect(violations).toEqual([]);
    });

    it('contains no internal react-native/Libraries/ imports', () => {
      const violations: string[] = [];
      for (const file of auditedFiles) {
        const code = fs.readFileSync(file, 'utf8');
        if (/from\s+['"]react-native\/Libraries\//.test(code)) {
          violations.push(path.relative(projectRoot, file).replace(/\\/g, '/'));
        }
      }
      expect(violations).toEqual([]);
    });

    it('contains no namespace imports from react-native (import * as RN from "react-native")', () => {
      const violations: string[] = [];
      for (const file of auditedFiles) {
        const code = fs.readFileSync(file, 'utf8');
        if (/import\s+\*\s+as\s+\w+\s+from\s+['"]react-native['"]/.test(code)) {
          violations.push(path.relative(projectRoot, file).replace(/\\/g, '/'));
        }
      }
      expect(violations).toEqual([]);
    });

    it('contains no Animated.Text or createAnimatedComponent(Text) usages', () => {
      const violations: string[] = [];
      for (const file of auditedFiles) {
        const code = fs.readFileSync(file, 'utf8');
        if (/Animated\.Text\b|createAnimatedComponent\(\s*Text\s*\)/.test(code)) {
          violations.push(path.relative(projectRoot, file).replace(/\\/g, '/'));
        }
      }
      expect(violations).toEqual([]);
    });
  });
});
