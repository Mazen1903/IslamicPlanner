import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import { getEmptyStateMessage } from '@/services/TodayViewModelProjection';
import { Icon } from '@/components/common/Icon';

export interface EmptyPrayerStateProps {
  selectedPrayer: Prayer;
  currentPrayer: Prayer;
  nextPrayer: Prayer | null;
}

export function EmptyPrayerState({
  selectedPrayer,
  currentPrayer,
  nextPrayer,
}: EmptyPrayerStateProps) {
  const { colors, spacing, typography } = useTheme();

  const message = getEmptyStateMessage(
    'NOTHING_SCHEDULED',
    selectedPrayer,
    currentPrayer,
    nextPrayer
  );

  return (
    <View style={[styles.container, { paddingVertical: spacing.xxl }]} testID="empty-prayer-state">
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.surfaceSecondary, borderRadius: 24, marginBottom: spacing.md },
        ]}
      >
        <Icon name="calendar" size={24} color={colors.textTertiary} />
      </View>
      <Text
        style={[
          typography.bodyMedium,
          { color: colors.textSecondary, textAlign: 'center' },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});