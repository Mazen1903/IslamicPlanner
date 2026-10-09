import React, { useContext } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme, useHeroArt } from '@/theme';
import { AppBackButton } from '@/components/common/AppBackButton';

interface TaskHeaderBannerProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  backTestID?: string;
}

export function TaskHeaderBanner({
  title,
  subtitle,
  onBack,
  backTestID = 'task-form-back-button',
}: TaskHeaderBannerProps) {
  const { colors, spacing, typography } = useTheme();
  const heroArt = useHeroArt();
  const insetsContext = useContext(SafeAreaInsetsContext);
  const topInset = insetsContext?.top ?? 0;
  const topPadding = topInset > 0 ? topInset + spacing.xs : spacing.sm;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPadding,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xs,
        },
      ]}
    >
      {/* Right: Mosque skyline illustration extending flush to the top edge */}
      <View
        style={styles.artworkContainer}
        importantForAccessibility="no"
        accessibilityElementsHidden={true}
      >
        <Image
          source={heroArt}
          style={styles.headerArt}
          resizeMode="contain"
        />
      </View>

      <View style={styles.contentRow}>
        {/* Left: Back button, Title & Subtitle */}
        <View style={styles.leftColumn}>
          <AppBackButton
            onPress={onBack}
            accessibilityLabel="Go back"
            directional
            testID={backTestID}
            style={styles.backButton}
          />

          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[
              typography.headlineLarge,
              styles.title,
              { color: colors.textPrimary, lineHeight: 40, paddingBottom: 2 },
            ]}
          >
            {title}
          </Text>

          <Text style={[typography.bodyMedium, styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 88,
    zIndex: 1,
  },
  leftColumn: {
    flex: 1,
    paddingEnd: 110,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  title: {
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  artworkContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 210,
    height: 145,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    pointerEvents: 'none',
    zIndex: 0,
  },
  headerArt: {
    width: 210,
    height: 145,
  },
});

