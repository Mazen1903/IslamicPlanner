import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useTheme, useHeroArt } from '@/theme';
import { SettingsBackButtonIcon } from './SettingsIcons';
import { AppBackButton } from '@/components/common/AppBackButton';

export interface SettingsPastelHeaderProps {
  title: string;
  subtitle: string;
  showBack?: boolean;
  showMosqueArt?: boolean;
  onBack?: () => void;
  testID?: string;
  backTestID?: string;
}

export function SettingsPastelHeader({
  title,
  subtitle,
  showBack = false,
  showMosqueArt = true,
  onBack,
  testID,
  backTestID,
}: SettingsPastelHeaderProps) {
  const { colors, spacing, typography, touchTargets } = useTheme();
  const heroArt = useHeroArt();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm }]} testID={testID}>
      <View style={[styles.leftCol, { borderBottomColor: colors.divider }]}>
        {showBack && (
          <AppBackButton
            onPress={onBack}
            accessibilityLabel="Back"
            testID={backTestID ?? 'settings-header-back-button'}
            size={36}
            style={{ marginBottom: spacing.xs }}
          />
        )}
        <Text
          style={[typography.displayLarge, { color: colors.textPrimary, flexShrink: 1 }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {title}
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      {showMosqueArt && (
        <View
          style={styles.artworkContainer}
          importantForAccessibility="no"
          accessibilityElementsHidden={true}
        >
          <Image
            source={heroArt}
            style={styles.headerArt}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Islamic mosque illustration"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 110,
  },
  leftCol: {
    flex: 1,
    paddingRight: 60,
    justifyContent: 'center',
    zIndex: 1,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  artworkContainer: {
    position: 'absolute',
    top: -6,
    right: -48,
    width: 210,
    height: 130,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    pointerEvents: 'none',
    zIndex: 0,
  },
  headerArt: {
    width: 210,
    height: 130,
  },
});
