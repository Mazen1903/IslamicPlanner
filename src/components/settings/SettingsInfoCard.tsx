import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';

export interface SettingsInfoCardProps {
  title?: string;
  message: string;
  icon?: IconName;
  testID?: string;
}

export function SettingsInfoCard({
  title,
  message,
  icon = 'info',
  testID,
}: SettingsInfoCardProps) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: spacing.md,
          marginVertical: spacing.sm,
          marginHorizontal: spacing.md,
        },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        <View style={[styles.iconWrapper, { marginEnd: spacing.sm, marginTop: 2 }]}>
          <Icon name={icon} size={18} color={colors.primary} decorative />
        </View>
        <View style={styles.textWrapper}>
          {title && (
            <Text
              style={[
                typography.labelMedium,
                { color: colors.textPrimary, marginBottom: 2, fontWeight: '600' },
              ]}
            >
              {title}
            </Text>
          )}
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textSecondary, lineHeight: 18 },
            ]}
          >
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
  },
});
