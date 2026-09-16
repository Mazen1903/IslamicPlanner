import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

interface SuccessScreenProps {
  title: string;
  scheduleSummary: string;
  repeatSummary?: string | null;
  onDone: () => void;
  isEdit?: boolean;
}

export function SuccessScreen({
  title,
  scheduleSummary,
  repeatSummary,
  onDone,
  isEdit = false,
}: SuccessScreenProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, padding: spacing.xxl },
      ]}
      testID="create-success-screen"
    >
      {/* Visual Mosque / Green Check Icon */}
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.primaryLight,
            borderColor: colors.primary,
            borderRadius: radii.pill,
            marginBottom: spacing.xl,
          },
        ]}
      >
        <Icon name="check" size={36} color={colors.primary} />
      </View>

      <Text
        style={[
          typography.headlineMedium,
          { color: colors.primaryDark, fontWeight: '700', textAlign: 'center', marginBottom: spacing.xs },
        ]}
      >
        {isEdit ? 'Task Updated' : 'Task Added!'}
      </Text>

      <Text
        style={[
          typography.bodyLarge,
          { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl },
        ]}
      >
        May Allah make it easy for you.
      </Text>

      {/* Summary Card */}
      <View
        style={[
          styles.summaryCard,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.lg,
            marginBottom: spacing.xxl,
            width: '100%',
          },
        ]}
      >
        <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.xs }]}>
          {title}
        </Text>

        <View style={styles.summaryRow}>
          <Icon name="clock" size={14} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            {scheduleSummary}
          </Text>
        </View>

        {repeatSummary ? (
          <View style={[styles.summaryRow, { marginTop: 6 }]}>
            <Icon name="calendar" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
              {repeatSummary}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Primary Action: Done */}
      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel="Done"
        testID="success-done-button"
        style={({ pressed }) => [
          styles.doneButton,
          {
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            borderRadius: radii.pill,
            minHeight: touchTargets.comfortable,
            paddingHorizontal: spacing.xxl,
            width: '100%',
          },
        ]}
      >
        <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
          Done
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  summaryCard: {
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
