import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';

export interface StreakBannerProps {
  streak: number;
  onPress?: () => void;
  testID?: string;
}

export function StreakBanner({
  streak,
  onPress,
  testID = 'streak-banner',
}: StreakBannerProps) {
  const { colors, spacing, radii, typography } = useTheme();

  const getMilestoneMessage = (s: number): string | null => {
    if (s >= 30) return 'MashaAllah! 30 days of reflection 🌟';
    if (s >= 14) return '2 weeks strong! Amazing consistency 🏆';
    if (s >= 7) return '1 week streak! Keep the light shining ✨';
    if (s >= 3) return '3 days in a row! Momentum is building 🚀';
    return null;
  };

  const milestone = getMilestoneMessage(streak);

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: streak > 0 ? colors.primaryLight : colors.surfaceSecondary,
          borderColor: streak > 0 ? colors.primary : colors.border,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
        },
      ]}
      testID={testID}
    >
      <Text style={styles.flameEmoji}>{streak > 0 ? '🔥' : '🌱'}</Text>
      <Text
        style={[
          typography.labelSmall,
          {
            color: streak > 0 ? colors.primaryDark : colors.textSecondary,
            marginStart: spacing.xs,
          },
        ]}
        testID="streak-banner-count"
      >
        {streak > 0 ? `${streak} Day Streak` : 'Start your streak'}
      </Text>

      {milestone && (
        <Text
          style={[
            typography.caption,
            {
              color: colors.primaryDark,
              marginStart: spacing.sm,
              fontSize: 11,
            },
          ]}
          numberOfLines={1}
          testID="streak-banner-milestone"
        >
          • {milestone}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Journal streak: ${streak} days. Tap to view history.`}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  flameEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
});
