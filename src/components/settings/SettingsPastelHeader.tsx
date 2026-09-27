import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { SettingsBackButtonIcon } from './SettingsIcons';

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

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm }]} testID={testID}>
      <View style={[styles.leftCol, { borderBottomColor: colors.divider }]}>
        {showBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID={backTestID ?? 'settings-header-back-button'}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
              styles.backButton,
              {
                minWidth: touchTargets.min,
                minHeight: touchTargets.min,
                marginBottom: spacing.xs,
              },
            ]}
          >
            <SettingsBackButtonIcon size={32} />
          </Pressable>
        )}
        <Text style={[typography.displayLarge, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      {showMosqueArt && (
        <View style={styles.imageCol}>
          <Image
            source={require('../../../assets/illustrations/settings_mosque_header.png')}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 110,
  },
  leftCol: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  imageCol: {
    width: 135,
    height: 100,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerArt: {
    width: 135,
    height: 100,
  },
});
