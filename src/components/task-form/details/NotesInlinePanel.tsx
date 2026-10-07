import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export interface NotesInlinePanelProps {
  notes: string;
  onChangeNotes: (text: string) => void;
}

export function NotesInlinePanel({ notes, onChangeNotes }: NotesInlinePanelProps) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <View style={styles.container} testID="notes-inline-panel">
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.sm,
          },
        ]}
      >
        <TextInput
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="Add extra details, reminders, or reflections..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Task notes input"
          testID="task-notes-input"
          style={[
            typography.bodyMedium,
            styles.textInput,
            {
              color: colors.textPrimary,
              minHeight: 88,
            },
          ]}
        />
        <View style={styles.footerRow}>
          <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
            {notes.length} characters
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  inputContainer: {
    borderWidth: 1,
  },
  textInput: {
    padding: 0,
    margin: 0,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
});
