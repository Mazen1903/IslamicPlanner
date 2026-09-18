import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export interface JournalEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
}

export function JournalEditor({
  value,
  onChangeText,
  placeholder = 'Write your thoughts...',
  testID = 'journal-editor-input',
}: JournalEditorProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.card,
          borderColor: colors.border,
          marginHorizontal: spacing.lg,
          padding: spacing.lg,
        },
      ]}
      testID="journal-editor-card"
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
          typography.bodyLarge,
          {
            color: colors.textPrimary,
          },
        ]}
        accessibilityLabel="Journal entry body"
        accessibilityHint="Write your thoughts for this planning day"
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minHeight: 220,
  },
  input: {
    minHeight: 180,
    padding: 0,
    lineHeight: 24,
  },
});
