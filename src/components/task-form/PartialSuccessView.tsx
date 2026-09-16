import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { SyncIssue } from '@/features/task-form/types';

interface PartialSuccessViewProps {
  issues: SyncIssue[];
  onRetrySync: () => void;
  onDone: () => void;
  isRetrying?: boolean;
}

export function PartialSuccessView({
  issues,
  onRetrySync,
  onDone,
  isRetrying = false,
}: PartialSuccessViewProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  // Check if issue is CONTEXT / SETUP_REQUIRED
  const isSetupRequired = issues.some(i => i.stage === 'CONTEXT');

  const message = isSetupRequired
    ? 'Task saved. Its schedule will appear once you configure your location in Settings.'
    : 'Task saved. Schedule will update on next refresh.';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, padding: spacing.xxl },
      ]}
      testID="partial-success-screen"
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.warning + '1A',
            borderColor: colors.warning,
            borderRadius: radii.pill,
            marginBottom: spacing.xl,
          },
        ]}
      >
        <Icon name="alert" size={36} color={colors.warning} />
      </View>

      <Text
        style={[
          typography.headlineMedium,
          { color: colors.textPrimary, fontWeight: '700', textAlign: 'center', marginBottom: spacing.xs },
        ]}
      >
        Task Saved
      </Text>

      <Text
        style={[
          typography.bodyLarge,
          { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl },
        ]}
      >
        {message}
      </Text>

      <View style={styles.actionsColumn}>
        {!isSetupRequired && (
          <Pressable
            onPress={onRetrySync}
            disabled={isRetrying}
            accessibilityRole="button"
            accessibilityLabel="Retry synchronizing task schedule"
            testID="retry-sync-button"
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                borderRadius: radii.pill,
                minHeight: touchTargets.comfortable,
                marginBottom: spacing.md,
                opacity: isRetrying ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
              {isRetrying ? 'Retrying...' : 'Retry Sync'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Done and return to today"
          testID="partial-success-done-button"
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
              borderColor: colors.border,
              borderRadius: radii.pill,
              minHeight: touchTargets.comfortable,
            },
          ]}
        >
          <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '600' }]}>
            Done
          </Text>
        </Pressable>
      </View>
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
  actionsColumn: {
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
