import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  type StyleProp,
  type ViewStyle,
  type AccessibilityRole,
  type ImageSourcePropType,
  type DimensionValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useHeroArt } from '@/theme';
import { MinimalistMosqueSilhouette } from '@/components/hero/MinimalistMosqueSilhouette';
import { AppBackButton } from '@/components/common/AppBackButton';

export interface AppHeroHeaderProps {
  title: string | React.ReactNode;
  titleAccessibilityRole?: AccessibilityRole;
  subtitle?: string | React.ReactNode;
  hijriSubtitle?: string | React.ReactNode;
  rightElement?: React.ReactNode;
  bottomElement?: React.ReactNode;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Custom artwork source to override the default mosque skyline (e.g. Journal) */
  artworkSource?: ImageSourcePropType;
  /** Whether to show the mosque artwork (defaults to true) */
  showMosqueArt?: boolean;
  /** Custom artwork dimensions */
  artworkSize?: { width: number; height: number };
  /** Custom artwork positioning */
  artworkPosition?: { right?: number; bottom?: number; top?: number; left?: number };
  /** Constrain max width of content to ensure wide artwork has clear breathing room */
  contentMaxWidth?: DimensionValue;
  /** Optional back navigation button */
  showBack?: boolean;
  onBack?: () => void;
  backTestID?: string;
  backAccessibilityLabel?: string;
}

/**
 * Unified, adaptive Hero Card Header used across the application tabs (Today, Calendar, Journal).
 * Features an elegant glassmorphic surface, subtle Islamic arch / geometric motif,
 * and harmonious theme blending for both dark and light modes.
 */
export function AppHeroHeader({
  title,
  titleAccessibilityRole = 'header',
  subtitle,
  hijriSubtitle,
  rightElement,
  bottomElement,
  testID = 'app-hero-header',
  containerStyle,
  children,
  artworkSource,
  showMosqueArt = true,
  artworkSize,
  artworkPosition,
  contentMaxWidth,
  showBack = false,
  onBack,
  backTestID,
  backAccessibilityLabel,
}: AppHeroHeaderProps) {
  const { colors, typography, spacing, isDark } = useTheme();
  const heroArt = useHeroArt();
  const effectiveArtwork = artworkSource !== undefined ? artworkSource : heroArt;

  const gradientColors = [colors.primaryLight, colors.surface, colors.surfaceSecondary] as const;

  return (
    <View style={[styles.outerWrapper, containerStyle]} testID={testID}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.primary,
          },
        ]}
      >
        {/* Ambient Gradient Fill */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Transparent Mosque / Custom Skyline Artwork */}
        {showMosqueArt && (
          <View
            style={[
              styles.mosqueArtWrapper,
              artworkPosition,
            ]}
            importantForAccessibility="no"
            accessibilityElementsHidden={true}
          >
            {effectiveArtwork ? (
              <Image
                source={effectiveArtwork}
                style={[
                  styles.mosqueArtImage,
                  artworkSize ? { width: artworkSize.width, height: artworkSize.height } : null,
                  {
                    opacity: isDark ? 0.78 : 0.92,
                  },
                ]}
                resizeMode="contain"
                accessibilityRole="image"
                accessibilityLabel="Islamic mosque illustration"
              />
            ) : (
              <MinimalistMosqueSilhouette
                width={artworkSize?.width ?? 220}
                height={artworkSize?.height ?? 88}
              />
            )}
          </View>
        )}

        {/* Top Content Row: Title/Dates (Left) and Actions (Right) */}
        <View style={styles.topRow}>
          <View style={[styles.textColumn, contentMaxWidth ? { maxWidth: contentMaxWidth } : null]}>
            {showBack && (
              <AppBackButton
                onPress={onBack}
                accessibilityLabel={backAccessibilityLabel ?? 'Back'}
                testID={backTestID ?? 'header-back-button'}
                size={34}
                style={{ marginBottom: 6 }}
              />
            )}
            {typeof title === 'string' ? (
              <Text
                style={[typography.headlineLarge, styles.titleText, { color: colors.textPrimary }]}
                accessibilityRole={titleAccessibilityRole}
              >
                {title}
              </Text>
            ) : (
              title
            )}

            {subtitle ? (
              typeof subtitle === 'string' ? (
                <Text style={[typography.bodyMedium, styles.subtitleText, { color: colors.textSecondary }]}>
                  {subtitle}
                </Text>
              ) : (
                subtitle
              )
            ) : null}

            {hijriSubtitle ? (
              typeof hijriSubtitle === 'string' ? (
                <Text
                  style={[
                    typography.labelMedium,
                    styles.hijriText,
                    { color: colors.primary, marginTop: spacing.xxs },
                  ]}
                >
                  {hijriSubtitle}
                </Text>
              ) : (
                hijriSubtitle
              )
            ) : null}
          </View>

          {rightElement ? <View style={styles.rightElementContainer}>{rightElement}</View> : null}
        </View>

        {/* Optional Bottom Element Row (e.g. countdown or status) */}
        {bottomElement ? (
          <View style={[styles.bottomRow, contentMaxWidth ? { maxWidth: contentMaxWidth } : null]}>
            {bottomElement}
          </View>
        ) : null}

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  mosqueArtWrapper: {
    position: 'absolute',
    right: -48,
    top: -6,
    zIndex: 0,
    pointerEvents: 'none',
  },
  mosqueArtImage: {
    width: 210,
    height: 130,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingEnd: 8,
  },
  titleText: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitleText: {
    marginTop: 2,
    fontWeight: '500',
  },
  hijriText: {
    fontWeight: '600',
  },
  rightElementContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bottomRow: {
    marginTop: 10,
    zIndex: 1,
  },
});
