import React, { useState } from 'react';
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
import {
  PURE_COLOR_THEMES,
  type ThemeGalleryItem,
} from './types';
import { ThemePreviewModal } from './ThemePreviewModal';
import {
  SettingsOptThemeSun,
  SettingsOptThemeMoon,
  SettingsOptThemeMonitor,
  SettingsSecThemePaletteIcon,
} from '@/components/settings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Selected item state for the preview modal
  const [previewItem, setPreviewItem] = useState<ThemeGalleryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>(
    islamicThemeId ?? 'scenery_cyclist',
  );

  const handleOpenPreview = (item: ThemeGalleryItem) => {
    setPreviewItem(item);
    setModalVisible(true);
  };

  const handleApplyTheme = (item: ThemeGalleryItem) => {
    setSelectedGalleryId(item.id);
    setIslamicThemeId(item.id);
    if (item.isDark) {
      setThemeMode('DARK');
    } else {
      setThemeMode('LIGHT');
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
      {/* Top Header: ←   Theme */}
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Theme</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="appearance-screen"
      >
        {/* ======================================================== */}
        {/* HERO SECTION: ISLAMIC THEMES & APPEARANCE MODE           */}
        {/* Placed at the top as the primary hero experience         */}
        {/* ======================================================== */}
        <View
          style={[
            styles.heritageSection,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          testID="islamic-themes-section-card"
        >
          <View style={styles.heritageHeader}>
            <SettingsSecThemePaletteIcon size={32} />
            <View style={styles.heritageHeaderTextCol}>
              <Text style={[styles.heritageTitle, { color: colors.textPrimary }]}>
                Islamic Themes
              </Text>
              <Text style={[styles.heritageSubtitle, { color: colors.textSecondary }]}>
                Palettes inspired by sacred places & times.
              </Text>
            </View>
          </View>

          {/* Mode Selector */}
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
              <SettingsOptThemeSun size={28} />
              <Text style={[styles.modeBtnText, { color: colors.textPrimary }]}>Light</Text>
              <Text style={styles.hiddenTestText}>Light Mode</Text>
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
              <SettingsOptThemeMoon size={28} />
              <Text style={[styles.modeBtnText, { color: colors.textPrimary }]}>Dark</Text>
              <Text style={styles.hiddenTestText}>Dark Mode</Text>
            </Pressable>

            {/* System */}
            <Pressable
              onPress={() => handleSelectMode('SYSTEM')}
              accessibilityRole="button"
              accessibilityLabel="System Default"
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
              <SettingsOptThemeMonitor size={28} />
              <Text style={[styles.modeBtnText, { color: colors.textPrimary }]}>System</Text>
              <Text style={styles.hiddenTestText}>System Default</Text>
            </Pressable>
          </View>

          {/* Horizontal scroll of Islamic Themes */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.islamicScroll}
          >
            {islamicThemes.map((theme) => {
              const isSelected = islamicThemeId === theme.id;
              return (
                <Pressable
                  key={theme.id}
                  onPress={() => setIslamicThemeId(isSelected ? null : theme.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${theme.name} Islamic Theme`}
                  style={[
                    styles.islamicCard,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  testID={`islamic-theme-${theme.id}`}
                >
                  <View
                    style={[
                      styles.islamicCardThumbnail,
                      { backgroundColor: theme.previewColors.background },
                    ]}
                  >
                    {theme.wallpaperAsset && (
                      <Image
                        source={theme.wallpaperAsset}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    )}
                    <View
                      style={[
                        styles.islamicColorBar,
                        { backgroundColor: theme.previewColors.primary },
                      ]}
                    />
                    {isSelected && (
                      <View
                        style={[
                          styles.islamicCheckBadge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Icon name="check" size={13} color="#FFFFFF" decorative />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.islamicThemeName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {theme.name}
                  </Text>
                  <Text
                    style={[styles.islamicArabicName, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {theme.arabicName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Active Islamic Theme Banner */}
          {activeIslamicTheme && (
            <View
              style={[
                styles.taglineBanner,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.primary,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.taglineText, { color: colors.primary }]}>
                "{activeIslamicTheme.tagline}"
              </Text>
            </View>
          )}
        </View>

        {/* ======================================================== */}
        {/* SECTION 2: PURE COLOR                                     */}
        {/* ======================================================== */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Pure Color
          </Text>

          <View style={styles.pureColorGrid}>
            {PURE_COLOR_THEMES.map((theme) => {
              const isSelected = selectedGalleryId === theme.id;
              return (
                <Pressable
                  key={theme.id}
                  onPress={() => handleOpenPreview(theme)}
                  accessibilityRole="button"
                  accessibilityLabel={`${theme.name} pure color theme`}
                  style={({ pressed }) => [
                    styles.pureColorSquircle,
                    {
                      backgroundColor: theme.color,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  testID={`theme-pure-color-${theme.id}`}
                >
                  {/* Selected Checkmark Badge */}
                  {isSelected && (
                    <View style={styles.pureColorCheckCircle}>
                      <Icon name="check" size={16} color="#FFFFFF" decorative />
                    </View>
                  )}

                  {/* Tiny Crown Badge on Pro colors */}
                  {theme.isPro && (
                    <View style={styles.pureColorCrownBadge}>
                      <Text style={styles.crownEmojiText}>👑</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Interactive Theme Chooser / Preview Modal */}
      <ThemePreviewModal
        visible={modalVisible}
        initialItem={previewItem}
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: 'ComicSansMS-Bold',
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'ComicSansMS-Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitleCrown: {
    fontSize: 14,
  },
  // Pure color grid
  pureColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pureColorSquircle: {
    width: (SCREEN_WIDTH - 36 - 36) / 4,
    height: (SCREEN_WIDTH - 36 - 36) / 4,
    maxWidth: 72,
    maxHeight: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pureColorCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pureColorCrownBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  crownEmojiText: {
    fontSize: 11,
  },
  // Texture row
  textureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  textureSquircle: {
    width: (SCREEN_WIDTH - 36 - 36) / 4,
    height: (SCREEN_WIDTH - 36 - 36) / 4,
    maxWidth: 72,
    maxHeight: 72,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  textureThumbImage: {
    width: '100%',
    height: '100%',
  },
  textureFallback: {
    width: '100%',
    height: '100%',
  },
  textureAccentDot: {
    position: 'absolute',
    bottom: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textureCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  // Scenery grid
  sceneryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  sceneryCard: {
    width: (SCREEN_WIDTH - 36 - 12) / 2,
    height: ((SCREEN_WIDTH - 36 - 12) / 2) * 0.62,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  sceneryImage: {
    width: '100%',
    height: '100%',
  },
  sceneryCheckBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  // Heritage & Mode hero section
  heritageSection: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heritageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heritageHeaderTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  heritageTitle: {
    fontFamily: 'ComicSansMS-Bold',
    fontSize: 16,
  },
  heritageSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  hiddenTestText: {
    fontSize: 1,
    height: 1,
    opacity: 0,
  },
  islamicScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  islamicCard: {
    width: 112,
    borderRadius: 14,
    padding: 6,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  islamicCardThumbnail: {
    width: 98,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-start',
  },
  islamicColorBar: {
    height: 4,
    width: '100%',
  },
  islamicCheckBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  islamicThemeName: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  islamicArabicName: {
    fontSize: 10,
    marginTop: 1,
    textAlign: 'center',
  },
  taglineBanner: {
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  taglineText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
