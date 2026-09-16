import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { PrayerTransitionState } from '@/services/types';

export interface PrayerTransitionBannerProps {
  transition: PrayerTransitionState;
  onViewPress: () => void;
  onDismissPress?: () => void;
}

export function PrayerTransitionBanner({
  transition,
  onViewPress,
  onDismissPress,
}: PrayerTransitionBannerProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();

  return (
    <View
      style={[
        styles.container,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.card,
          borderColor: colors.primary,
          borderWidth: 1,
          marginHorizontal: spacing.lg,
          marginVertical: spacing.sm,
          padding: spacing.md,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={transition.message}
      testID="prayer-transition-banner"
    >
      <Pressable
        onPress={onViewPress}
        style={styles.contentRow}
        accessibilityRole="button"
        accessibilityLabel={`View ${transition.newPrayer}`}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.primaryLight,
              borderRadius: radii.pill,
            },
          ]}
        >
          <Icon name="bell" size={20} color={colors.primary} />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[
              typography.labelLarge,
              { color: colors.textPrimary, fontWeight: '700' },
            ]}
          >
            {transition.message}
          </Text>
        </View>

        <Icon name="chevron-right" size={20} color={colors.primary} />
      </Pressable>

      {onDismissPress && (
        <Pressable
          onPress={onDismissPress}
          style={[styles.dismissButton, { minHeight: touchTargets.min, minWidth: touchTargets.min }]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss prayer transition banner"
        >
          <Icon name="close" size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  dismissButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});