import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeMode } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { DEFAULT_THEME_ITEM, type ThemeGalleryItem } from './types';
import { ThemePreviewModal } from './ThemePreviewModal';
import {
  SettingsAppearanceModeIcon,
  SettingsOptThemeSun,
  SettingsOptThemeMoon,
  SettingsOptThemeMonitor,
  SettingsSecThemePaletteIcon,
} from '@/components/settings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP) / 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.34);

interface ThemeGalleryScreenProps {
  onBack?: () => void;
}

export function ThemeGalleryScreen({ onBack }: ThemeGalleryScreenProps) {
  const router = useRouter();
  const {
    colors,
    themeMode,
    setThemeMode,
    islamicThemeId,
    setIslamicThemeId,
    islamicThemes,
    activeIslamicTheme,
  } = useTheme();

  // Combine Default theme item with all real Islamic themes for the grid & preview modal
  const previewItems: ThemeGalleryItem[] = useMemo(() => {
    const list: ThemeGalleryItem[] = [DEFAULT_THEME_ITEM];
    islamicThemes.forEach((t) => {
      list.push({
        id: t.id,
        name: t.name,
        arabicName: t.arabicName,
        tagline: t.tagline,
        isDark: t.isDark,
        wallpaperAsset: t.wallpaperAsset,
        previewColors: t.previewColors,
      });
    });
    return list;
  }, [islamicThemes]);

  // Selected item state for the preview modal
  const [previewItem, setPreviewItem] = useState<ThemeGalleryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenPreview = (item: ThemeGalleryItem) => {
    setPreviewItem(item);
    setModalVisible(true);
  };

  const handleCardPress = (item: ThemeGalleryItem) => {
    if (item.id === 'default') {
      setIslamicThemeId(null);
    } else {
      if (islamicThemeId === item.id) {
        setIslamicThemeId(null);
      } else {
        setIslamicThemeId(item.id);
        setPreviewItem(item);
        setModalVisible(true);
      }
    }
  };

  const handleApplyTheme = (item: ThemeGalleryItem) => {
    if (item.id === 'default') {
      setIslamicThemeId(null);
    } else {
      setIslamicThemeId(item.id);
    }
  };

  const handleSelectMode = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const isLightActive = !islamicThemeId && themeMode === 'LIGHT';
  const isDarkActive = !islamicThemeId && themeMode === 'DARK';
  const isSystemActive = !islamicThemeId && themeMode === 'SYSTEM';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={styles.backButton}
          testID="theme-back-button"
        >
          <Icon name="arrow-left" size={24} color={colors.textPrimary} decorative />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Appearance</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="appearance-screen"
      >
        {/* ======================================================== */}
        {/* SECTION 1: APPEARANCE MODE (Light / Dark / System)       */}
        {/* ======================================================== */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          testID="appearance-mode-section"
        >
          <View style={styles.sectionHeaderRow}>
            <SettingsAppearanceModeIcon size={36} />
            <View style={styles.headerTextCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Appearance Mode
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Choose between system default, light, or dark display.
              </Text>
            </View>
          </View>

          {/* Mode Selector Buttons */}
          <View style={styles.modeRow}>
            {/* Light */}
            <Pressable
              onPress={() => handleSelectMode('LIGHT')}
              accessibilityRole="button"
              accessibilityLabel="Light Mode"
              style={[
                styles.modeBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: isLightActive ? colors.primary : colors.border,
                  borderWidth: isLightActive ? 2 : 1,
                },
              ]}
              testID="theme-option-light"
            >
              <SettingsOptThemeSun size={32} />
              <Text
                style={[
                  styles.modeBtnText,
                  {
                    color: isLightActive ? colors.primary : colors.textPrimary,
                    fontWeight: isLightActive ? '700' : '500',
                  },
                ]}
              >
                Light
              </Text>
              <Text style={styles.hiddenTestText}>Light Mode</Text>
              {isLightActive && (
                <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>

            {/* Dark */}
            <Pressable
              onPress={() => handleSelectMode('DARK')}
              accessibilityRole="button"
              accessibilityLabel="Dark Mode"
              style={[
                styles.modeBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: isDarkActive ? colors.primary : colors.border,
                  borderWidth: isDarkActive ? 2 : 1,
                },
              ]}
              testID="theme-option-dark"
            >
              <SettingsOptThemeMoon size={32} />
              <Text
                style={[
                  styles.modeBtnText,
                  {
                    color: isDarkActive ? colors.primary : colors.textPrimary,
                    fontWeight: isDarkActive ? '700' : '500',
                  },
                ]}
              >
                Dark
              </Text>
              <Text style={styles.hiddenTestText}>Dark Mode</Text>
              {isDarkActive && (
                <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>

            {/* System */}
            <Pressable
              onPress={() => handleSelectMode('SYSTEM')}
              accessibilityRole="button"
              accessibilityLabel="System Mode"
              style={[
                styles.modeBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: isSystemActive ? colors.primary : colors.border,
                  borderWidth: isSystemActive ? 2 : 1,
                },
              ]}
              testID="theme-option-system"
            >
              <SettingsOptThemeMonitor size={32} />
              <Text
                style={[
                  styles.modeBtnText,
                  {
                    color: isSystemActive ? colors.primary : colors.textPrimary,
                    fontWeight: isSystemActive ? '700' : '500',
                  },
                ]}
              >
                System
              </Text>
              <Text style={styles.hiddenTestText}>System Default</Text>
              {isSystemActive && (
                <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          </View>
        </View>

        {/* ======================================================== */}
        {/* SECTION 2: ISLAMIC THEMES (2-Column Grid matching refs)  */}
        {/* ======================================================== */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          testID="islamic-themes-section-card"
        >
          <View style={styles.sectionHeaderRow}>
            <SettingsSecThemePaletteIcon size={32} />
            <View style={styles.headerTextCol}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Islamic Themes
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Palettes inspired by sacred places & times.
              </Text>
            </View>
          </View>

          {/* 2-Column Grid of Wallpaper Cards */}
          <View style={styles.gridContainer} testID="islamic-themes-grid">
            {/* Card 0: Classic Default Theme */}
            {(() => {
              const isDefaultActive = !islamicThemeId;
              return (
                <Pressable
                  key="default"
                  onPress={() => handleCardPress(DEFAULT_THEME_ITEM)}
                  accessibilityRole="button"
                  accessibilityLabel="Classic Default Theme"
                  style={[
                    styles.gridCard,
                    styles.defaultGridCard,
                    {
                      borderColor: isDefaultActive ? colors.primary : colors.border,
                      borderWidth: isDefaultActive ? 2.5 : 1,
                    },
                  ]}
                  testID="islamic-theme-default"
                >
                  <View style={styles.defaultCardInner}>
                    <View style={styles.defaultIconCircle}>
                      <Icon name="mosque" size={28} color="#FFFFFF" decorative />
                    </View>
                    <View style={styles.defaultTitlesBox}>
                      <Text style={styles.defaultCardTitle} numberOfLines={1}>
                        Classic Default
                      </Text>
                      <Text style={styles.defaultCardArabic} numberOfLines={1}>
                        النمط الافتراضي
                      </Text>
                    </View>

                    {/* 3-Dot Palette Swatch */}
                    <View style={styles.cardPaletteRow}>
                      <View style={[styles.paletteDot, { backgroundColor: '#0F8A52' }]} />
                      <View style={[styles.paletteDot, { backgroundColor: '#F9F7F2' }]} />
                      <View style={[styles.paletteDot, { backgroundColor: '#D4A017' }]} />
                    </View>
                  </View>

                  {/* Active Checkmark Badge */}
                  {isDefaultActive && (
                    <View
                      style={[
                        styles.gridCheckmarkBadge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Icon name="check" size={13} color="#FFFFFF" decorative />
                    </View>
                  )}
                </Pressable>
              );
            })()}

            {/* Cards 1–10: Real Commissioned Islamic Wallpaper Themes */}
            {islamicThemes.map((theme) => {
              const isSelected = islamicThemeId === theme.id;
              const themeItem: ThemeGalleryItem = {
                id: theme.id,
                name: theme.name,
                arabicName: theme.arabicName,
                tagline: theme.tagline,
                isDark: theme.isDark,
                wallpaperAsset: theme.wallpaperAsset,
                previewColors: theme.previewColors,
              };

              return (
                <Pressable
                  key={theme.id}
                  onPress={() => handleCardPress(themeItem)}
                  accessibilityRole="button"
                  accessibilityLabel={`${theme.name} Islamic Theme`}
                  style={[
                    styles.gridCard,
                    {
                      borderColor: isSelected ? colors.primary : 'rgba(0, 0, 0, 0.08)',
                      borderWidth: isSelected ? 2.5 : 1,
                    },
                  ]}
                  testID={`islamic-theme-${theme.id}`}
                >
                  {/* Wallpaper Background Image */}
                  {theme.wallpaperAsset && (
                    <Image
                      source={theme.wallpaperAsset}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  )}

                  {/* Top Vignette Overlay */}
                  <View style={styles.cardTopOverlay} />

                  {/* Top-Right Mood Badge (Day / Night) */}
                  <View style={styles.cardMoodBadge}>
                    <Icon
                      name={theme.isDark ? 'moon' : 'sun'}
                      size={11}
                      color="#FFFFFF"
                      decorative
                    />
                  </View>

                  {/* Frosted Glass Bottom Strip with English & Arabic Names + Swatch */}
                  <View style={styles.cardGlassPanel}>
                    <Text style={styles.gridCardTitle} numberOfLines={1}>
                      {theme.name}
                    </Text>
                    <Text style={styles.gridCardArabic} numberOfLines={1}>
                      {theme.arabicName}
                    </Text>

                    {/* 3-Dot Color Swatch */}
                    <View style={styles.cardPaletteRow}>
                      <View
                        style={[
                          styles.paletteDot,
                          { backgroundColor: theme.previewColors.primary },
                        ]}
                      />
                      <View
                        style={[
                          styles.paletteDot,
                          { backgroundColor: theme.previewColors.surface },
                        ]}
                      />
                      <View
                        style={[
                          styles.paletteDot,
                          { backgroundColor: theme.previewColors.accent },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Active Selection Checkmark Badge */}
                  {isSelected && (
                    <View
                      style={[
                        styles.gridCheckmarkBadge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Icon name="check" size={13} color="#FFFFFF" decorative />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>


          {/* Active Islamic Theme Quote Banner */}
          {activeIslamicTheme && (
            <View
              style={[
                styles.activeThemeBanner,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              testID="active-theme-banner"
            >
              <View
                style={[
                  styles.activeThemeColorDot,
                  { backgroundColor: activeIslamicTheme.previewColors.primary },
                ]}
              />
              <View style={styles.activeThemeTextCol}>
                <View style={styles.activeThemeNameRow}>
                  <Text style={[styles.activeThemeTitle, { color: colors.textPrimary }]}>
                    Active: {activeIslamicTheme.name}
                  </Text>
                  <Text style={[styles.activeThemeArabic, { color: colors.textSecondary }]}>
                    {activeIslamicTheme.arabicName}
                  </Text>
                </View>
                <Text
                  style={[styles.activeThemeTagline, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  "{activeIslamicTheme.tagline}"
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen Interactive Theme Chooser / Preview Modal */}
      <ThemePreviewModal
        visible={modalVisible}
        initialItem={previewItem}
        items={previewItems}
        onClose={() => setModalVisible(false)}
        onApplyTheme={handleApplyTheme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modeBtn: {
    flex: 1,
    height: 84,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 12,
    marginTop: 6,
  },
  hiddenTestText: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginTop: 6,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  defaultGridCard: {
    backgroundColor: '#0E442B',
  },
  defaultCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  defaultIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  defaultTitlesBox: {
    alignItems: 'center',
    marginTop: 8,
  },
  defaultCardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  defaultCardArabic: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  cardTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  cardMoodBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardGlassPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 14, 28, 0.72)',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  gridCardTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridCardArabic: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10.5,
    marginTop: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  paletteDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  gridCheckmarkBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  activeThemeBanner: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeThemeColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activeThemeTextCol: {
    flex: 1,
  },
  activeThemeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  activeThemeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeThemeArabic: {
    fontSize: 11,
  },
  activeThemeTagline: {
    fontSize: 11,
    lineHeight: 15,
  },
});
