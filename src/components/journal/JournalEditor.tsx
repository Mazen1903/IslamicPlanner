import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { MoodPicker } from './MoodPicker';
import { PromptDeck } from './PromptDeck';
import type { MoodKey } from '@/domain/journal/types';

export interface JournalEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  selectedMood?: MoodKey;
  onSelectMood?: (mood: MoodKey | undefined) => void;
  dayKey?: string;
}

export function JournalEditor({
  value,
  onChangeText,
  placeholder = 'Write your thoughts...',
  testID = 'journal-editor-input',
  selectedMood,
  onSelectMood,
  dayKey,
}: JournalEditorProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  // Word count & read time
  const trimmed = value.trim();
  const wordCount = trimmed.length > 0 ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const readMin = Math.max(1, Math.ceil(wordCount / 150));

  const handleSelectPrompt = (promptText: string) => {
    onChangeText(`"${promptText}"\n\n`);
  };

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
      {/* Mood Picker */}
      {onSelectMood && (
        <View
          style={[
            styles.moodSection,
            {
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
              paddingBottom: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <MoodPicker
            selectedMood={selectedMood}
            onSelectMood={onSelectMood}
          />
        </View>
      )}

      {/* Prompt Deck (Shown when editor is empty and dayKey is provided) */}
      {dayKey && trimmed.length === 0 && (
        <PromptDeck
          dayKey={dayKey}
          onSelectPrompt={handleSelectPrompt}
        />
      )}

      {/* Main Text Input */}
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

      {/* Word Count / Reading Time Footer */}
      {wordCount > 0 && (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingTop: spacing.sm,
              marginTop: spacing.sm,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              { color: colors.textTertiary, fontSize: 11 },
            ]}
            testID="journal-word-count"
          >
            📝 {wordCount} {wordCount === 1 ? 'word' : 'words'} • ~{readMin} min read
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minHeight: 220,
  },
  moodSection: {
    width: '100%',
  },
  input: {
    minHeight: 180,
    padding: 0,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
