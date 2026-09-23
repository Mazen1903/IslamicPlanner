import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';

export interface SettingsSectionCardProps {
  icon?: IconName;
  iconColor?: string;
  badgeColor?: string;
  customIcon?: React.ReactNode;
  customBadge?: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SettingsSectionCard({
  icon,
  iconColor,
  badgeColor,
  customIcon,
  customBadge,
  title,
  subtitle,
  rightElement,
  children,
  style,
  testID,
}: SettingsSectionCardProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
        shadows.card,
        style,
      ]}
      testID={testID}
    >
      <View style={styles.headerRow}>
        {customBadge ? (
          <View style={{ marginRight: spacing.md }}>
            {customBadge}
          </View>
        ) : (icon || customIcon) ? (
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: badgeColor ?? colors.primaryLight,
                borderRadius: radii.md,
                marginRight: spacing.md,
              },
            ]}
          >
            {customIcon ? (
              customIcon
            ) : icon ? (
              <Icon name={icon} size="md" color={iconColor ?? colors.primary} decorative />
            ) : null}
          </View>
        ) : null}

        <View style={styles.textContainer}>
          <Text style={[typography.labelLarge, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightElement && <View style={styles.rightElementContainer}>{rightElement}</View>}
      </View>

      {children && <View style={[styles.contentContainer, { marginTop: spacing.md }]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  rightElementContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
  },
});
