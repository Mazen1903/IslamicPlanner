import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeMode } from '@/theme';
import {
  SettingsScreenHeader,
  SettingsSectionHeader,
  SettingsSelectOption,
  SettingsInfoCard,
} from '@/components/settings';

const THEME_OPTIONS: { mode: ThemeMode; label: string; desc: string }[] = [
  {
    mode: 'SYSTEM',
    label: 'System Default',
    desc: 'Automatically matches your device display settings',
  },
  {
    mode: 'LIGHT',
    label: 'Light Mode',
    desc: 'Clean, warm day palette anchored in natural parchment tones',
  },
  {
    mode: 'DARK',
    label: 'Dark Mode',
    desc: 'Calm, low-light palette designed for nighttime and dawn reflections',
  },
];

export default function AppearanceScreen() {
  const { colors, spacing, radii, themeMode, setThemeMode } = useTheme();

  const handleSelectMode = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsScreenHeader title="Appearance" backTestID="appearance-back-button" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        testID="appearance-screen"
      >
        <SettingsInfoCard
          title="Theme Preferences"
          message="Choose your preferred theme style. System mode will dynamically follow changes to your device's operating system settings."
          icon="sun"
        />

        <SettingsSectionHeader title="Theme Mode" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {THEME_OPTIONS.map(opt => (
            <SettingsSelectOption
              key={opt.mode}
              label={opt.label}
              description={opt.desc}
              selected={themeMode === opt.mode}
              onSelect={() => handleSelectMode(opt.mode)}
              testID={`theme-option-${opt.mode.toLowerCase()}`}
            />
          ))}
        </View>

        {/* Visual Swatch Preview */}
        <View style={[styles.swatchContainer, { margin: spacing.md }]}>
          <Text style={[styles.swatchLabel, { color: colors.textSecondary }]}>
            CURRENT PALETTE PREVIEW
          </Text>
          <View style={styles.swatchRow}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: colors.primary, borderRadius: radii.sm },
              ]}
            >
              <Text style={[styles.swatchText, { color: colors.textOnPrimary }]}>Primary</Text>
            </View>
            <View
              style={[
                styles.swatch,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.sm },
              ]}
            >
              <Text style={[styles.swatchText, { color: colors.textPrimary }]}>Surface</Text>
            </View>
            <View
              style={[
                styles.swatch,
                { backgroundColor: colors.surfaceSecondary, borderRadius: radii.sm },
              ]}
            >
              <Text style={[styles.swatchText, { color: colors.textSecondary }]}>Secondary</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatchContainer: {
    paddingTop: 8,
  },
  swatchLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  swatch: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchText: {
    fontSize: 12,
    fontWeight: '500',
    // color intentionally omitted: each swatch sets color inline via theme tokens (M21)
  },
});
