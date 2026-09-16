import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import { getEmptyStateMessage } from '@/services/TodayViewModelProjection';
import { Icon } from '@/components/common/Icon';

export interface AllDoneStateProps {
  selectedPrayer: Prayer;
  currentPrayer: Prayer;
  nextPrayer: Prayer | null;
}

export function AllDoneState({
  selectedPrayer,
  currentPrayer,
  nextPrayer,
}: AllDoneStateProps) {
  const { colors, spacing, typography } = useTheme();

  const message = getEmptyStateMessage(
    'ALL_DONE',
    selectedPrayer,
    currentPrayer,
    nextPrayer
  );

  return (
    <View style={[styles.container, { paddingVertical: spacing.xxl }]} testID="all-done-state">
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.primaryLight, borderRadius: 24, marginBottom: spacing.md },
        ]}
      >
        <Icon name="check" size={24} color={colors.primary} />
      </View>
      <Text
        style={[
          typography.headlineMedium,
          { color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.xs },
        ]}
      >
        All done!
      </Text>
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