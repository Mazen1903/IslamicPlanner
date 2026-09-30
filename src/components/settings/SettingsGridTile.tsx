import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

export interface SettingsGridTileProps {
  label: string;
  badge: React.ReactNode;
  bgColor: string;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SettingsGridTile({
  label,
  badge,
  bgColor,
  onPress,
  testID,
  accessibilityLabel,
  style,
}: SettingsGridTileProps) {
  const { colors, radii, spacing, typography, shadows } = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: bgColor,
          borderColor: colors.border,
          borderRadius: radii.card,
          opacity: pressed ? 0.82 : 1,
        },
        shadows.card,
        style,
      ]}
    >
      <View style={[styles.iconContainer, { marginBottom: spacing.sm }]}>
        {badge}
      </View>
      <Text
        style={[
          typography.labelLarge,
          styles.label,
          { color: colors.textPrimary },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    aspectRatio: 1,
    minHeight: 110,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
