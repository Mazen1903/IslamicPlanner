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
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Journal entry for ${gregorianDisplay}, ${hijriDisplay}`}
      style={({ pressed }) => [
        styles.container,
        shadows.card,
        {
          backgroundColor: isSelected ? colors.primaryLight : colors.surface,
          borderRadius: radii.card,
          borderColor: isSelected ? colors.primary : colors.border,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm,
          padding: spacing.md,
          minHeight: touchTargets.comfortable,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
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
                { color: isSelected ? colors.primary : colors.textSecondary, marginTop: 2 },
              ]}
            >
              {hijriDisplay}
            </Text>
          )}
        </View>

        <Icon
          name="chevron-right"
          size={18}
          color={isSelected ? colors.primary : colors.textTertiary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  gregorianDate: {
    fontWeight: '600',
  },
});
