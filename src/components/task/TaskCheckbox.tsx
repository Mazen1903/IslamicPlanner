import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface TaskCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function TaskCheckbox({
  checked,
  disabled = false,
  onToggle,
  accessibilityLabel = 'Complete task',
  testID = 'task-checkbox',
}: TaskCheckboxProps) {
  const { colors, radii, touchTargets } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.touchTarget,
        {
          minWidth: touchTargets.min,
          minHeight: touchTargets.min,
        },
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.box,
          {
            borderRadius: radii.sm,
            borderColor: checked ? colors.checkboxChecked : colors.checkboxUnchecked,
            backgroundColor: checked ? colors.checkboxChecked : 'transparent',
          },
        ]}
      >
        {checked && <Icon name="check" size={14} color={colors.textOnPrimary} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
