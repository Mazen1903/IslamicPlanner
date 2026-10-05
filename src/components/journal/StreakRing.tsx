import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface StreakRingProps {
  streak: number;
  size?: number;
  strokeWidth?: number;
  onPress?: () => void;
  testID?: string;
  compact?: boolean;
}

export function StreakRing({
  streak,
  onPress,
  testID = 'streak-banner',
}: StreakRingProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();

  const getMilestoneMessage = (s: number): string | null => {
    if (s >= 30) return '30+ Days! MashaAllah 🌟';
    if (s >= 14) return '2 Weeks Strong! 🏆';
    if (s >= 7) return '1 Week Streak! ✨';
    if (s >= 3) return '3 Days! Momentum 🚀';
    return null;
  };

  const milestone = getMilestoneMessage(streak);

  const cardContent = (
    <View
      style={[
        styles.pillCard,
        shadows.card,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : colors.surface,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          borderRadius: radii.xl ?? 20,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
      ]}
      testID={testID}
    >
      {/* Icon in soft circle */}
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: streak > 0
              ? (isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.12)')
              : (isDark ? 'rgba(15, 159, 74, 0.22)' : 'rgba(15, 159, 74, 0.1)'),
            borderRadius: radii.pill,
          },
        ]}
      >
        <Text style={styles.badgeEmoji}>{streak > 0 ? '🔥' : '🌱'}</Text>
      </View>

      {/* Texts */}
      <View style={styles.textContainer}>
        <Text
          style={[
            typography.labelMedium,
            styles.titleText,
            { color: colors.textPrimary },
          ]}
          testID="streak-banner-count"
        >
          {streak > 0 ? `${streak} Day Streak` : 'Start your streak'}
        </Text>
        <Text
          style={[
            typography.caption,
            styles.subtitleText,
            { color: colors.textSecondary },
          ]}
          numberOfLines={1}
          testID="streak-banner-milestone"
        >
          {milestone ?? (streak > 0 ? 'Building momentum' : 'Reflect today to begin')}
        </Text>
      </View>

      {/* Trailing chevron */}
      <View style={styles.chevronWrapper}>
        <Icon name="chevron-right" size={16} color={colors.textTertiary} decorative directional />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Journal streak: ${streak} days. Tap to view history.`}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  pillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: 240,
  },
  iconBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 18,
  },
  textContainer: {
    marginStart: 10,
    marginEnd: 8,
    flexShrink: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 11,
    marginTop: 1,
  },
  chevronWrapper: {
    marginStart: 'auto',
    paddingStart: 4,
  },
});
