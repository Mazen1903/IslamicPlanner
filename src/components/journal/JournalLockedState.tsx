import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface JournalLockedStateProps {
  onUnlockPress: () => void;
  isUnlocking?: boolean;
  errorMessage?: string | null;
  testID?: string;
}

export function JournalLockedState({
  onUnlockPress,
  isUnlocking = false,
  errorMessage,
  testID = 'journal-locked-state',
}: JournalLockedStateProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }]} testID={testID}>
      <View
        style={[
          styles.card,
          shadows.elevated,
          {
            backgroundColor: colors.surface,
            borderRadius: radii.card,
            padding: spacing.xxl,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight, borderRadius: radii.pill }]}>
          <Icon name="journal" size={36} color={colors.primary} />
        </View>

        <Text style={[typography.headlineMedium, styles.title, { color: colors.textPrimary, marginTop: spacing.lg }]}>
          Journal Locked
        </Text>

        <Text
          style={[
            typography.bodyMedium,
            styles.subtitle,
            { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
          ]}
        >
          Private reflections are locked on this device.
        </Text>

        {errorMessage && (
          <Text
            style={[
              typography.bodySmall,
              styles.errorText,
              { color: colors.warning, marginTop: spacing.md, textAlign: 'center' },
            ]}
            testID="journal-lock-error-text"
          >
            {errorMessage}
          </Text>
        )}

        <Pressable
          onPress={onUnlockPress}
          disabled={isUnlocking}
          accessibilityRole="button"
          accessibilityLabel="Unlock Journal"
          accessibilityState={{ disabled: isUnlocking }}
          style={({ pressed }) => [
            styles.unlockButton,
            shadows.card,
            {
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              borderRadius: radii.pill,
              minHeight: touchTargets.comfortable,
              marginTop: spacing.xl,
              opacity: isUnlocking ? 0.7 : 1,
            },
          ]}
          testID="journal-unlock-btn"
        >
          {isUnlocking ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>
              Unlock Journal
            </Text>
          )}
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
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    lineHeight: 20,
  },
  errorText: {
    lineHeight: 18,
  },
  unlockButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
