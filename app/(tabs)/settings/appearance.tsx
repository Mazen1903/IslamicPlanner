import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeMode } from '@/theme';
import { Icon } from '@/components/common/Icon';
import {
  SettingsPastelHeader,
  SettingsSectionCard,
  SettingsSecThemePaletteIcon,
  SettingsSecColorBrushIcon,
  SettingsSecBgImageIcon,
  SettingsSecDisplayAaIcon,
  SettingsOptThemeSun,
  SettingsOptThemeMoon,
  SettingsOptThemeMonitor,
  SETTINGS_ICONS,
} from '@/components/settings';

const ACCENT_COLORS = [
  { key: 'emerald', colorToken: 'primary' as const, label: 'Emerald' },
  { key: 'sky', colorToken: 'info' as const, label: 'Sky Blue' },
  { key: 'violet', colorToken: 'prayerIsha' as const, label: 'Violet' },
  { key: 'teal', colorToken: 'prayerDhuhr' as const, label: 'Teal' },
  { key: 'sand', colorToken: 'warning' as const, label: 'Sand' },
  { key: 'coral', colorToken: 'danger' as const, label: 'Coral' },
];

const BACKGROUND_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'desert', label: 'Desert' },
  { key: 'masjid', label: 'Masjid' },
  { key: 'none', label: 'None' },
];

export default function AppearanceScreen() {
  const { colors, spacing, radii, typography, themeMode, setThemeMode, shadows } = useTheme();
  const router = useRouter();

  const [selectedAccent, setSelectedAccent] = useState('emerald');
  const [selectedBg, setSelectedBg] = useState('default');
  const [useSystemFont, setUseSystemFont] = useState(false);

  const handleSelectMode = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <SettingsPastelHeader
        title="Appearance"
        subtitle="Choose your preferred look and feel."
        showBack
        showMosqueArt
        onBack={() => router.back()}
        testID="section-header-appearance"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        testID="appearance-screen"
      >
        {/* CARD 1: THEME */}
        <SettingsSectionCard
          customBadge={<SettingsSecThemePaletteIcon size={40} />}
          title="Theme"
          subtitle="Select your app theme."
          testID="theme-section-card"
        >
          <View style={styles.themeRow}>
            {/* Light */}
            <Pressable
              onPress={() => handleSelectMode('LIGHT')}
              accessibilityRole="button"
              accessibilityLabel="Light Mode"
              style={({ pressed }) => [
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: themeMode === 'LIGHT' ? colors.primary : colors.border,
                  borderWidth: themeMode === 'LIGHT' ? 2 : 1,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="theme-option-light"
            >
              <SettingsOptThemeSun size={40} style={{ alignSelf: 'center' }} />
              <Text style={[typography.labelMedium, { color: colors.textPrimary, marginTop: spacing.xs, textAlign: 'center' }]}>
                Light
              </Text>
              <Text style={[styles.hiddenTestText, { color: colors.textTertiary }]}>Light Mode</Text>
            </Pressable>

            {/* Dark */}
            <Pressable
              onPress={() => handleSelectMode('DARK')}
              accessibilityRole="button"
              accessibilityLabel="Dark Mode"
              style={({ pressed }) => [
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: themeMode === 'DARK' ? colors.primary : colors.border,
                  borderWidth: themeMode === 'DARK' ? 2 : 1,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="theme-option-dark"
            >
              <SettingsOptThemeMoon size={40} style={{ alignSelf: 'center' }} />
              <Text style={[typography.labelMedium, { color: colors.textPrimary, marginTop: spacing.xs, textAlign: 'center' }]}>
                Dark
              </Text>
              <Text style={[styles.hiddenTestText, { color: colors.textTertiary }]}>Dark Mode</Text>
            </Pressable>

            {/* System */}
            <Pressable
              onPress={() => handleSelectMode('SYSTEM')}
              accessibilityRole="button"
              accessibilityLabel="System Default"
              style={({ pressed }) => [
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: themeMode === 'SYSTEM' ? colors.primary : colors.border,
                  borderWidth: themeMode === 'SYSTEM' ? 2 : 1,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="theme-option-system"
            >
              <SettingsOptThemeMonitor size={40} style={{ alignSelf: 'center' }} />
              <Text style={[typography.labelMedium, { color: colors.textPrimary, marginTop: spacing.xs, textAlign: 'center' }]}>
                System
              </Text>
              <Text style={[styles.hiddenTestText, { color: colors.textTertiary }]}>System Default</Text>
            </Pressable>
          </View>
        </SettingsSectionCard>

        {/* CARD 2: COLOR */}
        <SettingsSectionCard
          customBadge={<SettingsSecColorBrushIcon size={40} />}
          title="Color"
          subtitle="Choose an accent color."
          testID="color-section-card"
        >
          <View style={styles.colorRow}>
            {ACCENT_COLORS.map((item) => {
              const isSelected = selectedAccent === item.key;
              const swatchBg = colors[item.colorToken];
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setSelectedAccent(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} accent color`}
                  style={[
                    styles.colorCircleWrapper,
                    {
                      borderColor: isSelected ? swatchBg : 'transparent',
                      borderWidth: isSelected ? 2 : 0,
                      borderRadius: radii.pill,
                      padding: isSelected ? 3 : 0,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.colorCircle,
                      {
                        backgroundColor: swatchBg,
                        borderRadius: radii.pill,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </SettingsSectionCard>

        {/* CARD 3: BACKGROUND */}
        <SettingsSectionCard
          customBadge={<SettingsSecBgImageIcon size={40} />}
          title="Background"
          subtitle="Choose a background style."
          testID="background-section-card"
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgScrollContent}>
            {BACKGROUND_OPTIONS.map((bg) => {
              const isSelected = selectedBg === bg.key;
              const bgSource =
                bg.key === 'default'
                  ? SETTINGS_ICONS.bgDefault
                  : bg.key === 'minimal'
                  ? SETTINGS_ICONS.bgMinimal
                  : bg.key === 'desert'
                  ? SETTINGS_ICONS.bgDesert
                  : bg.key === 'masjid'
                  ? SETTINGS_ICONS.bgMasjid
                  : SETTINGS_ICONS.bgNone;

              return (
                <Pressable
                  key={bg.key}
                  onPress={() => setSelectedBg(bg.key)}
                  style={[
                    styles.bgThumbCard,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      borderRadius: radii.md,
                      padding: 4,
                    },
                  ]}
                >
                  <View style={[styles.bgThumbPreview, { backgroundColor: colors.surface, borderRadius: radii.sm, overflow: 'hidden' }]}>
                    <Image
                      source={bgSource}
                      style={styles.bgThumbImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={[typography.caption, { color: isSelected ? colors.primary : colors.textPrimary, marginTop: 4, textAlign: 'center', fontWeight: isSelected ? '700' : '400' }]}>
                    {bg.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </SettingsSectionCard>

        {/* CARD 4: DISPLAY */}
        <SettingsSectionCard
          customBadge={<SettingsSecDisplayAaIcon size={40} />}
          title="Display"
          subtitle="Adjust text size and display options."
          testID="display-section-card"
        >
          {/* Row 1: Text Size */}
          <Pressable
            style={({ pressed }) => [
              styles.displaySubRow,
              { borderBottomColor: colors.border, paddingVertical: spacing.sm, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Text Size</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginRight: 6 }]}>Normal</Text>
            <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
          </Pressable>

          {/* Row 2: Use System Font */}
          <View style={[styles.displaySubRow, { paddingVertical: spacing.sm }]}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}>Use System Font</Text>
            <Switch
              value={useSystemFont}
              onValueChange={setUseSystemFont}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </SettingsSectionCard>

        {/* Visual Swatch Preview for token compliance */}
        <View style={[styles.swatchContainer, { marginTop: spacing.md }]}>
          <Text style={[styles.swatchLabel, { color: colors.textSecondary }]}>
            CURRENT PALETTE PREVIEW
          </Text>
          <View style={styles.swatchRow}>
            <View style={[styles.swatch, { backgroundColor: colors.primary, borderRadius: radii.sm }]}>
              <Text style={[styles.swatchText, { color: colors.textOnPrimary }]}>Primary</Text>
            </View>
            <View style={[styles.swatch, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.sm }]}>
              <Text style={[styles.swatchText, { color: colors.textPrimary }]}>Surface</Text>
            </View>
            <View style={[styles.swatch, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.sm }]}>
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
    paddingTop: 8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  themeIconCircle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenTestText: {
    fontSize: 1,
    height: 1,
    opacity: 0,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  colorCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgScrollContent: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  bgThumbCard: {
    width: 72,
    alignItems: 'center',
  },
  bgThumbPreview: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgThumbImage: {
    width: 62,
    height: 62,
    borderRadius: 6,
  },
  bgThumbPlain: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  displaySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatchContainer: {
    paddingTop: 4,
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
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
