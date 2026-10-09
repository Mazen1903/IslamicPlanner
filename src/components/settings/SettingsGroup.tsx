import React from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PremiumLanternIcon } from '@/components/common/PremiumLanternIcon';

export interface SettingsGroupProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SettingsGroup({
  title,
  subtitle,
  children,
  style,
  cardStyle,
  testID,
}: SettingsGroupProps) {
  const { colors, spacing, typography, radii, shadows } = useTheme();

  return (
    <View style={[styles.groupContainer, { marginBottom: spacing.lg }, style]} testID={testID}>
      {title ? (
        <View style={[styles.headingRow, { marginBottom: spacing.xs, paddingHorizontal: spacing.xs }]}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.groupCard,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
          },
          cardStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export interface SettingsGroupRowProps {
  icon?: IconName | React.ReactNode;
  customIcon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  chevronDirection?: 'right' | 'down' | 'up';
  // Switch control
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (val: boolean) => void;
  switchDisabled?: boolean;
  // Radio control
  isRadio?: boolean;
  radioSelected?: boolean;
  // Premium lock
  isLocked?: boolean;
  // Custom right element
  rightElement?: React.ReactNode;
  testID?: string;
  /** testID applied to the premium lantern badge shown when `isLocked`. */
  lockBadgeTestID?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export function SettingsGroupRow({
  icon,
  customIcon,
  iconBgColor,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  showChevron = false,
  chevronDirection = 'right',
  isSwitch = false,
  switchValue = false,
  onSwitchChange,
  switchDisabled = false,
  isRadio = false,
  radioSelected = false,
  isLocked = false,
  rightElement,
  testID,
  lockBadgeTestID,
  style,
  disabled = false,
  isFirst,
  isLast,
}: SettingsGroupRowProps) {
  const { colors, spacing, typography, touchTargets, radii } = useTheme();

  const isInteractive = Boolean(onPress || isSwitch);

  const rawLeading = customIcon ?? icon;

  const content = (
    <View
      style={[
        styles.rowContainer,
        {
          minHeight: Math.max(touchTargets.min, 56),
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
        },
        style,
      ]}
      testID={onPress && !disabled ? undefined : testID}
    >
      {/* Leading Icon */}
      {rawLeading ? (
        React.isValidElement(rawLeading) ? (
          <View style={{ marginEnd: spacing.md, alignItems: 'center', justifyContent: 'center' }}>
            {rawLeading}
          </View>
        ) : (
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: iconBgColor ?? colors.primaryLight,
                borderRadius: 12,
                marginEnd: spacing.md,
              },
            ]}
          >
            <Icon
              name={rawLeading as IconName}
              size={22}
              color={iconColor ?? colors.primary}
              decorative
            />
          </View>
        )
      ) : null}

      {/* Title & Subtitle */}
      <View style={styles.titleColumn}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={[
              typography.headlineMedium,
              {
                color: disabled ? colors.textMuted : colors.textPrimary,
                fontSize: 16,
              },
            ]}
          >
            {title}
          </Text>
          {isLocked && (
            <View style={{ marginStart: 6 }} testID={lockBadgeTestID}>
              <PremiumLanternIcon size={14} />
            </View>
          )}
        </View>
        {subtitle ? (
          <Text
            style={[
              typography.caption,
              {
                color: disabled ? colors.textMuted : colors.textSecondary,
                marginTop: 2,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right-side Control */}
      <View style={styles.rightControl}>
        {rightElement ? (
          rightElement
        ) : isSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            disabled={switchDisabled || disabled}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel={title}
            testID={testID ? `${testID}-switch` : undefined}
          />
        ) : isRadio ? (
          <View
            style={[
              styles.radioCircle,
              {
                borderColor: radioSelected ? colors.primary : colors.border,
                backgroundColor: radioSelected ? colors.primary : 'transparent',
              },
            ]}
          >
            {radioSelected && <View style={[styles.radioDot, { backgroundColor: colors.surface }]} />}
          </View>
        ) : (
          <>
            {value ? (
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: colors.textSecondary,
                    marginEnd: showChevron ? 4 : 0,
                  },
                ]}
              >
                {value}
              </Text>
            ) : null}
            {showChevron && (
              <Icon
                name={
                  chevronDirection === 'down'
                    ? 'chevron-down'
                    : chevronDirection === 'up'
                    ? 'chevron-up'
                    : 'chevron-right'
                }
                size={14}
                color={colors.textTertiary}
                directional={chevronDirection === 'right'}
                decorative
              />
            )}
          </>
        )}
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={isRadio ? 'radio' : 'button'}
        accessibilityState={isRadio ? { checked: radioSelected } : undefined}
        accessibilityLabel={title}
        testID={testID}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export function SettingsGroupDivider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  groupContainer: {
    width: '100%',
  },
  headingRow: {
    marginBottom: 6,
  },
  groupCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconBadge: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  rightControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginStart: 72,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
