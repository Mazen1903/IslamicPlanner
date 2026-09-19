import React from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface SettingsSectionHeaderProps {
  title: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

export function SettingsSectionHeader({
  title,
  style,
  testID,
}: SettingsSectionHeaderProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Text
      accessibilityRole="header"
      style={[
        styles.header,
        typography.labelSmall,
        {
          color: colors.textSecondary,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xs,
        },
        style,
      ]}
      testID={testID}
    >
      {title.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    letterSpacing: 0.8,
    fontWeight: '600',
  },
});
