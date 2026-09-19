import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';

export interface SettingsRowProps {
  label: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  testID?: string;
}

export function SettingsRow({
  label,
  subtitle,
  value,
  icon,
  onPress,
  showChevron = true,
  destructive = false,
  testID,
}: SettingsRowProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  const isInteractive = typeof onPress === 'function';

  return (
    <Pressable
      onPress={onPress}
      disabled={!isInteractive}
      style={({ pressed }) => [
        styles.container,
        {
          minHeight: touchTargets.min,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: pressed && isInteractive ? colors.surfaceSecondary : colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityRole={isInteractive ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityValue={value ? { text: value } : undefined}
      testID={testID}
    >
      {icon && (
        <View
          style={[
            styles.iconWrapper,
            {
              marginEnd: spacing.md,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: radii.sm,
              width: 32,
              height: 32,
            },
          ]}
        >
          <Icon
            name={icon}
            size={18}
            color={destructive ? colors.error : colors.primary}
            decorative
          />
        </View>
      )}

      <View style={styles.textContainer}>
        <Text
          style={[
            typography.bodyMedium,
            {
              color: destructive ? colors.error : colors.textPrimary,
              fontWeight: '500',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textSecondary, marginTop: 2 },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {value && (
        <Text
          style={[
            typography.bodySmall,
            {
              color: colors.textSecondary,
              marginEnd: showChevron && isInteractive ? spacing.xs : 0,
              maxWidth: 160,
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}

      {showChevron && isInteractive && (
        <Icon name="chevron-right" size={18} color={colors.textTertiary} decorative directional />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
