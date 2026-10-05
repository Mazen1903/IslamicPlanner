import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';

export interface JournalCardProps {
  icon?: React.ReactNode | string;
  title?: string;
  titleColor?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function JournalCard({
  icon,
  title,
  titleColor,
  headerRight,
  children,
  testID,
  style,
  contentStyle,
}: JournalCardProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();

  const hasHeader = Boolean(icon || title || headerRight);

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : colors.surface,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          borderRadius: radii.xl ?? 24,
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
          padding: spacing.lg,
        },
        style,
      ]}
      testID={testID}
    >
      {hasHeader && (
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            {typeof icon === 'string' ? (
              <Text style={styles.iconEmoji}>{icon}</Text>
            ) : (
              icon
            )}
            {title ? (
              <Text
                style={[
                  typography.headlineMedium,
                  styles.titleText,
                  { color: titleColor ?? colors.textPrimary },
                ]}
                accessibilityRole="header"
              >
                {title}
              </Text>
            ) : null}
          </View>
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
        </View>
      )}
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

export interface SoftCircleButtonProps {
  onPress?: () => void;
  icon?: IconName;
  children?: React.ReactNode;
  accessibilityLabel: string;
  testID?: string;
  size?: number;
  active?: boolean;
  activeBgColor?: string;
  iconColor?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function SoftCircleButton({
  onPress,
  icon,
  children,
  accessibilityLabel,
  testID,
  size = 36,
  active = false,
  activeBgColor,
  iconColor,
  iconSize = 18,
  style,
  disabled = false,
}: SoftCircleButtonProps) {
  const { colors, touchTargets, radii, isDark } = useTheme();

  const defaultBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
  const activeBg = activeBgColor ?? (isDark ? 'rgba(15, 159, 74, 0.25)' : colors.primaryLight);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.softCircleButton,
        {
          width: size,
          height: size,
          minWidth: touchTargets.min,
          minHeight: touchTargets.min,
          borderRadius: radii.pill,
          backgroundColor: active ? activeBg : defaultBg,
          opacity: pressed ? 0.7 : disabled ? 0.4 : 1,
        },
        style,
      ]}
      testID={testID}
    >
      {icon ? (
        <Icon
          name={icon}
          size={iconSize}
          color={iconColor ?? (active ? colors.primary : colors.textSecondary)}
          decorative
        />
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  iconEmoji: {
    fontSize: 18,
  },
  titleText: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  softCircleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
