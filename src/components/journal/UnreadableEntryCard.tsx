import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JournalLockBadgeIcon } from './JournalIcons';

export interface UnreadableEntryCardProps {
  dayKey: string;
  errorMessage?: string | null;
  onResetEntry: () => void;
  onOpenHistory: () => void;
  onRetry: () => void;
}

export function UnreadableEntryCard({
  dayKey,
  errorMessage,
  onResetEntry,
  onOpenHistory,
  onRetry,
}: UnreadableEntryCardProps) {
  const { colors, spacing, typography, radii, touchTargets } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background, padding: spacing.xl }]}
      edges={['top', 'left', 'right']}
      testID="journal-unreadable-state"
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, padding: spacing.xl }]}>
        <JournalLockBadgeIcon
          size={56}
          style={{ marginBottom: spacing.md, alignSelf: 'center' }}
          testID="journal-unreadable-lock-icon"
        />

        <Text style={[typography.headlineMedium, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }]}>
          This Entry Can't Be Opened
        </Text>

        <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }]}>
          {errorMessage || 'The encryption key for this entry is unavailable or has changed. You can delete this entry and start fresh, or view your history.'}
        </Text>

        <View style={styles.buttonStack}>
          <Pressable
            onPress={onResetEntry}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: pressed ? colors.dangerSurface : colors.surfaceSecondary,
                borderColor: colors.danger,
                borderWidth: 1,
                borderRadius: radii.pill,
                minHeight: touchTargets.min,
                paddingHorizontal: spacing.lg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Delete entry and start fresh"
            testID="journal-reset-corrupted-entry-btn"
          >
            <Text style={[typography.labelLarge, { color: colors.danger }]}>Delete & Start Fresh</Text>
          </Pressable>

          <Pressable
            onPress={onOpenHistory}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                borderRadius: radii.pill,
                minHeight: touchTargets.min,
                paddingHorizontal: spacing.lg,
                marginTop: spacing.sm,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View journal history"
            testID="journal-history-from-unreadable-btn"
          >
            <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>Go to History</Text>
          </Pressable>

          <Pressable
            onPress={onRetry}
            style={styles.textButton}
            accessibilityRole="button"
            accessibilityLabel="Try loading again"
          >
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonStack: {
    width: '100%',
    alignItems: 'stretch',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
});
