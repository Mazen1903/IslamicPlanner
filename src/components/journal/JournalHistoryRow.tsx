import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { JournalEntryMetadata } from '@/domain/journal/types';

export interface JournalHistoryRowProps {
  metadata: JournalEntryMetadata;
  gregorianDisplay: string;
  hijriDisplay: string;
  isSelected?: boolean;
  onPress: () => void;
  testID?: string;
}

export function JournalHistoryRow({
  metadata,
  gregorianDisplay,
  hijriDisplay,
  isSelected = false,
  onPress,
  testID = `journal-history-row-${metadata.planningDayKey}`,
}: JournalHistoryRowProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Journal entry for ${gregorianDisplay}, ${hijriDisplay}`}
      style={({ pressed }) => [
        styles.container,
        shadows.card,
        {
          backgroundColor: isSelected
            ? (isDark ? 'rgba(15, 159, 74, 0.2)' : colors.primaryLight)
            : (isDark ? 'rgba(30, 41, 59, 0.75)' : colors.surface),
          borderRadius: radii.card,
          borderColor: isSelected
            ? colors.primary
            : (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border),
          borderWidth: isSelected ? 1.5 : 1,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm,
          padding: spacing.md,
          minHeight: touchTargets.comfortable,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        {/* Left icon badge */}
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isSelected
                ? colors.primary
                : (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSecondary),
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
              borderRadius: radii.md,
              marginEnd: spacing.md,
            },
          ]}
        >
          <Text style={styles.badgeEmoji}>📖</Text>
        </View>

        {/* Date texts */}
        <View style={styles.textContainer}>
          <Text
            style={[
              typography.bodyMedium,
              styles.gregorianDate,
              { color: isSelected ? colors.primaryDark : colors.textPrimary },
            ]}
          >
            {gregorianDisplay}
          </Text>
          {hijriDisplay.length > 0 && (
            <View style={styles.hijriRow}>
              <Text
                style={[
                  typography.caption,
                  {
                    color: isSelected ? colors.primaryDark : colors.textSecondary,
                    marginTop: 2,
                    fontSize: 11,
                  },
                ]}
              >
                {hijriDisplay}
              </Text>
            </View>
          )}
        </View>

        {/* Right Arrow indicator */}
        <View
          style={[
            styles.arrowCircle,
            {
              backgroundColor: isSelected
                ? colors.primaryLight
                : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)'),
              borderRadius: radii.pill,
            },
          ]}
        >
          <Icon
            name="chevron-right"
            size={14}
            color={isSelected ? colors.primary : colors.textTertiary}
            decorative
            directional
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  gregorianDate: {
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  hijriRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
