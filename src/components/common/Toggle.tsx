import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ToggleProps) {
  const theme = useTheme();

  const handleToggle = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  const trackColor = {
    false: theme.colors.checkboxUnchecked, // ADR-029: off-state uses checkboxUnchecked, not disabledBackground
    true: theme.colors.primary,
  };

  const thumbColor = Platform.select({
    ios: undefined,
    default: checked ? theme.colors.surface : theme.colors.textSecondary,
  });

  const switchElement = (
    <Switch
      testID={label ? undefined : testID}
      value={checked}
      onValueChange={onCheckedChange}
      disabled={disabled}
      trackColor={trackColor}
      thumbColor={thumbColor}
      ios_backgroundColor={trackColor.false}
      accessibilityRole={label ? undefined : 'switch'}
      accessibilityLabel={label ? undefined : accessibilityLabel}
      accessibilityHint={label ? undefined : accessibilityHint}
      accessibilityState={label ? undefined : { checked, disabled }}
      accessibilityElementsHidden={Boolean(label)}
      importantForAccessibility={label ? 'no-hide-descendants' : 'auto'}
    />
  );

  if (!label && !description) {
    return (
      <View style={[styles.containerOnly, style]}>
        {switchElement}
      </View>
    );
  }

  return (
    <Pressable
      onPress={handleToggle}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint ?? description}
      accessibilityState={{
        checked,
        disabled,
      }}
      style={[
        styles.rowContainer,
        {
          minHeight: theme.touchTargets.min,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <View style={styles.textContainer}>
        {label && (
          <Text
            style={[
              theme.typography.labelLarge,
              { color: theme.colors.textPrimary },
            ]}
          >
            {label}
          </Text>
        )}
        {description && (
          <Text
            style={[
              theme.typography.bodySmall,
              { color: theme.colors.textSecondary, marginTop: theme.spacing.xxs },
            ]}
          >
            {description}
          </Text>
        )}
      </View>
      <View pointerEvents="none">
        {switchElement}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  containerOnly: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginEnd: 16,
  },
});