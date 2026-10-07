import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JournalLockBadgeIcon } from './JournalIcons';

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
  const { colors, spacing, radii, typography, touchTargets, shadows, isDark } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.lg }]} testID={testID}>
      <View
        style={[
          styles.card,
          shadows.card,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : colors.surface,
            borderRadius: radii.xl ?? 24,
            padding: spacing.xl,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <JournalLockBadgeIcon
          size={56}
          style={{ marginBottom: spacing.sm }}
          testID="journal-locked-icon"
        />

        <Text
          style={[
            typography.headlineMedium,
            styles.title,
            { color: colors.textPrimary, marginTop: spacing.md },
          ]}
        >
          Journal is Locked
        </Text>

        <Text
          style={[
            typography.bodyMedium,
            styles.subtitle,
            { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
          ]}
        >
          Private reflections are protected on this device.
        </Text>

        {errorMessage && (
          <Text
            style={[
              typography.bodySmall,
              styles.errorText,
              { color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
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
            styles.unlockButtonWrapper,
            { opacity: pressed ? 0.85 : isUnlocking ? 0.7 : 1 },
          ]}
          testID="journal-unlock-btn"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.unlockGradient,
              {
                borderRadius: radii.pill,
                minHeight: touchTargets.comfortable,
              },
            ]}
          >
            {isUnlocking ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                Unlock Journal
              </Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
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
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    lineHeight: 20,
  },
  errorText: {
    fontWeight: '500',
  },
  unlockButtonWrapper: {
    width: '100%',
    marginTop: 20,
  },
  unlockGradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
