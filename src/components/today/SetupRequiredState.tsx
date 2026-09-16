import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface SetupRequiredStateProps {
  onSetupPress?: () => void;
}

export function SetupRequiredState({ onSetupPress }: SetupRequiredStateProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    if (onSetupPress) {
      onSetupPress();
    } else {
      router.push('/(tabs)/settings' as any);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background, padding: spacing.xxl }]}
      testID="setup-required-state"
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.primaryLight,
            borderRadius: radii.pill,
            marginBottom: spacing.xl,
          },
        ]}
      >
        <Icon name="location" size={36} color={colors.primary} />
      </View>

      <Text
        style={[
          typography.headlineMedium,
          {
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: spacing.md,
          },
        ]}
      >
        Set your prayer location to begin.
      </Text>

      <Text
        style={[
          typography.bodyMedium,
          {
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: spacing.xxxl,
          },
        ]}
      >
        Your prayer times and daily schedule adapt dynamically to your geographical location.
      </Text>

      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            borderRadius: radii.pill,
            minHeight: touchTargets.comfortable,
            paddingHorizontal: spacing.xxl,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Set Up Location"
        testID="setup-location-button"
      >
        <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>
          Set Up Location
        </Text>
        <Icon name="chevron-right" size={20} color={colors.textOnPrimary} style={{ marginLeft: spacing.xs }} />
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
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
