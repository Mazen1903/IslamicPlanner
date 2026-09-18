import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export interface ReflectionFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  testID?: string;
}

export function ReflectionField({
  label,
  placeholder,
  value,
  onChangeText,
  testID,
}: ReflectionFieldProps) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }]}>
      <Text style={[typography.labelMedium, styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          autoCapitalize="sentences"
          autoCorrect
          spellCheck
          style={[
            styles.input,
            typography.bodyMedium,
            {
              color: colors.textPrimary,
            },
          ]}
          accessibilityLabel={label}
          accessibilityHint={`Reflect on ${label.toLowerCase()}`}
          testID={testID}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontWeight: '600',
  },
  inputWrapper: {
    borderWidth: 1,
    minHeight: 72,
  },
  input: {
    minHeight: 52,
    padding: 0,
    lineHeight: 20,
  },
});
