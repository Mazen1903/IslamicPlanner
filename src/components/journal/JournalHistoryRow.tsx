import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JournalHistoryBadgeIcon } from './JournalIcons';
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
            : (isDark ? 'rgba(30, 41, 59, 0.88)' : colors.surface),
          borderRadius: radii.md ?? 12,
          borderColor: isSelected
            ? colors.primary
            : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
          borderWidth: isSelected ? 1.5 : 1,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm,
          paddingVertical: spacing.sm + 2,
          paddingStart: spacing.md + 4,
          paddingEnd: spacing.md,
          minHeight: touchTargets.comfortable,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      testID={testID}
    >
      {/* Accent Bar */}
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: isSelected ? colors.primary : colors.primaryLight,
            borderTopLeftRadius: radii.md ?? 12,
            borderBottomLeftRadius: radii.md ?? 12,
          },
        ]}
      />

      <View style={styles.content}>
        {/* Left icon badge */}
        <JournalHistoryBadgeIcon
          size={34}
          style={{ marginEnd: spacing.md }}
        />

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
          )}
        </View>

        {/* Right Arrow indicator */}
        <View style={styles.arrowContainer}>
          <Icon
            name="chevron-right"
            size={16}
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
    position: 'relative',
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  gregorianDate: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  arrowContainer: {
    marginStart: 8,
  },
});
