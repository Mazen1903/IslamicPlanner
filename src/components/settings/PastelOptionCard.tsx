import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';

export interface PastelOptionCardProps {
  label: string;
  subtitle: string;
  icon?: IconName;
  iconColor?: string;
  badgeColor?: string;
  customBadge?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export function PastelOptionCard({
  label,
  subtitle,
  icon,
  iconColor,
  badgeColor,
  customBadge,
  onPress,
  disabled,
  testID,
}: PastelOptionCardProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${subtitle}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
          padding: spacing.md,
          marginBottom: spacing.sm,
          minHeight: touchTargets.comfortable,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
        shadows.card,
      ]}
    >
      {customBadge ? (
        <View style={{ marginRight: spacing.md }}>
          {customBadge}
        </View>
      ) : (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: badgeColor ?? colors.primaryLight,
              borderRadius: radii.md,
              marginRight: spacing.md,
            },
          ]}
        >
          {icon && <Icon name={icon} size="md" color={iconColor ?? colors.primary} decorative />}
        </View>
      )}

      <View style={styles.textContainer}>
        <Text style={[typography.labelLarge, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  badge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
});
