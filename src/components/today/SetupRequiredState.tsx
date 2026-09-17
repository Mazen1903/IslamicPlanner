import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { useLocation } from '@/hooks/useLocation';

export interface SetupRequiredStateProps {
  onSetupPress?: () => void;
  onUseCurrentLocation?: () => Promise<boolean>;
  onSetManually?: () => void;
}

export function SetupRequiredState({
  onSetupPress,
  onUseCurrentLocation,
  onSetManually,
}: SetupRequiredStateProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();
  const router = useRouter();
  const { requestAutoLocation } = useLocation();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const success = onUseCurrentLocation
        ? await onUseCurrentLocation()
        : await requestAutoLocation();

      if (!success) {
        setErrorMessage('Location permission was denied. You can set your location manually.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const handleSetManually = () => {
    if (onSetManually) {
      onSetManually();
    } else if (onSetupPress) {
      onSetupPress();
    } else {
      router.push('/(tabs)/settings/prayer-location' as any);
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
        Set your prayer location to begin
      </Text>

      <Text
        style={[
          typography.bodyMedium,
          {
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: spacing.xxl,
          },
        ]}
      >
        Your prayer times and daily schedule adapt dynamically to your geographical location.
      </Text>

      {errorMessage && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: '#FEE2E2',
              borderRadius: radii.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
            },
          ]}
          testID="setup-error-banner"
        >
          <Text style={[typography.bodySmall, { color: colors.danger, textAlign: 'center' }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Button 1: Use my current location */}
      <Pressable
        onPress={handleUseCurrentLocation}
        disabled={loading}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            borderRadius: radii.pill,
            minHeight: touchTargets.comfortable,
            paddingHorizontal: spacing.xxl,
            marginBottom: spacing.md,
            width: '100%',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Use my current location"
        testID="use-current-location-button"
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <>
            <Icon name="location" size={20} color={colors.textOnPrimary} style={{ marginRight: spacing.xs }} />
            <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>
              Use my current location
            </Text>
          </>
        )}
      </Pressable>

      {/* Button 2: Set location manually */}
      <Pressable
        onPress={handleSetManually}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radii.pill,
            minHeight: touchTargets.comfortable,
            paddingHorizontal: spacing.xxl,
            width: '100%',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Set location manually"
        testID="set-location-manually-button"
      >
        <Text style={[typography.labelLarge, { color: colors.textPrimary }]}>
          Set location manually
        </Text>
        <Icon name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: spacing.xs }} />
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
  errorBanner: {
    width: '100%',
  },
});
