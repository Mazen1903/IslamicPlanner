import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface SettingsSelectOptionProps {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  testID?: string;
}

export function SettingsSelectOption({
  label,
  description,
  selected,
  onSelect,
  testID,
}: SettingsSelectOptionProps) {
  const { colors, spacing, typography, touchTargets } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.container,
        {
          minHeight: touchTargets.min,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      testID={testID}
    >
      <View style={styles.textContainer}>
        <Text
          style={[
            typography.bodyMedium,
            {
              color: selected ? colors.primary : colors.textPrimary,
              fontWeight: selected ? '600' : '400',
            },
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textSecondary, marginTop: 2 },
            ]}
          >
            {description}
          </Text>
        )}
      </View>

      <View style={styles.checkWrapper}>
        {selected ? (
          <Icon name="check" size={20} color={colors.primary} />
        ) : (
          <View style={{ width: 20 }} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  checkWrapper: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
