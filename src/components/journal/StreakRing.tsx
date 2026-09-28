import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';

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
  size = 46,
  strokeWidth = 4,
  onPress,
  testID = 'streak-ring',
  compact = false,
}: StreakRingProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Goal basis: 30 days full ring, minimum 0.05 visually if streak > 0
  const rawProgress = streak > 0 ? Math.min(streak / 30, 1) : 0;
  const progress = streak > 0 ? Math.max(0.06, rawProgress) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const getMilestoneMessage = (s: number): string | null => {
    if (s >= 30) return '30+ Days! MashaAllah 🌟';
    if (s >= 14) return '2 Weeks Strong! 🏆';
    if (s >= 7) return '1 Week Streak! ✨';
    if (s >= 3) return '3 Days! Momentum 🚀';
    return null;
  };

  const milestone = getMilestoneMessage(streak);

  const ringElement = (
    <View style={[styles.ringWrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F59E0B" />
            <Stop offset="50%" stopColor="#EAB308" />
            <Stop offset="100%" stopColor={colors.primary} />
          </LinearGradient>
          <LinearGradient id="streakBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
            <Stop offset="100%" stopColor={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'} />
          </LinearGradient>
        </Defs>

        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#streakBgGradient)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Active Arc */}
        {streak > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#streakGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>

      {/* Center content */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.centerContent}>
          <Text style={[styles.centerEmoji, { fontSize: size * 0.36 }]}>
            {streak > 0 ? '🔥' : '🌱'}
          </Text>
        </View>
      </View>
    </View>
  );

  const content = (
    <View
      style={[
        styles.cardContainer,
        shadows.card,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 159, 74, 0.15)',
          borderRadius: radii.lg,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.xs + 2,
        },
      ]}
      testID={testID}
    >
      {ringElement}

      {!compact && (
        <View style={[styles.textBlock, { marginStart: spacing.sm }]}>
          <View style={styles.titleRow}>
            <Text
              style={[
                typography.labelMedium,
                {
                  color: colors.textPrimary,
                  fontWeight: '700',
                  letterSpacing: -0.2,
                },
              ]}
              testID="streak-banner-count"
            >
              {streak > 0 ? `${streak} Day Streak` : 'Start your streak'}
            </Text>
          </View>
          <Text
            style={[
              typography.caption,
              {
                color: streak > 0 ? colors.primaryDark : colors.textTertiary,
                fontSize: 11,
                marginTop: 1,
              },
            ]}
            numberOfLines={1}
            testID="streak-banner-milestone"
          >
            {milestone ?? (streak > 0 ? 'Building momentum' : 'Reflect today to begin')}
          </Text>
        </View>
      )}
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
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  ringWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerEmoji: {
    textAlign: 'center',
  },
  textBlock: {
    justifyContent: 'center',
    paddingEnd: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
