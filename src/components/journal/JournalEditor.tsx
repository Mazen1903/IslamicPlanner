import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { MoodPicker } from './MoodPicker';
import { PromptDeck } from './PromptDeck';
import { JournalWriteModal } from './JournalWriteModal';
import type { MoodKey } from '@/domain/journal/types';
import type { SaveState } from '@/services/journal/JournalAutosaveController';

export interface JournalEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  selectedMood?: MoodKey;
  onSelectMood?: (mood: MoodKey | undefined) => void;
  dayKey?: string;
  gregorianDisplay?: string;
  hijriDisplay?: string;
  saveState?: SaveState;
}

export function JournalEditor({
  value,
  onChangeText,
  placeholder = 'Write your thoughts...',
  testID = 'journal-editor-input',
  selectedMood,
  onSelectMood,
  dayKey,
  gregorianDisplay,
  hijriDisplay,
  saveState = 'idle',
}: JournalEditorProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

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
        styles.cardContainer,
        shadows.card,
        {
          borderRadius: radii.card,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 159, 74, 0.12)',
          marginHorizontal: spacing.lg,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.72)' : 'rgba(255, 255, 255, 0.88)',
        },
      ]}
      testID="journal-editor-card"
    >
      {/* Frosted Glass Layer */}
      <BlurView
        intensity={isDark ? 20 : 35}
        tint={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, { borderRadius: radii.card }]}
      />

      <View style={[styles.innerContent, { padding: spacing.lg }]}>
        {/* Mood Picker */}
        {onSelectMood && (
          <View
            style={[
              styles.moodSection,
              {
                borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
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

        {/* Action bar: Expand to full screen writing */}
        <View style={styles.expandRow}>
          <Text
            style={[
              typography.labelSmall,
              {
                color: colors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: 10,
                fontWeight: '700',
              },
            ]}
          >
            Today's Entry
          </Text>

          <Pressable
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open distraction-free full screen writing mode"
            style={({ pressed }) => [
              styles.expandButton,
              {
                backgroundColor: pressed
                  ? colors.primaryLight
                  : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 159, 74, 0.08)'),
                borderRadius: radii.pill,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 159, 74, 0.15)',
              },
            ]}
            testID="journal-fullscreen-btn"
          >
            <Icon name="edit" size={12} color={colors.primary} decorative />
            <Text style={[typography.caption, { color: colors.primaryDark, fontWeight: '700', marginStart: 4 }]}>
              Focus Mode
            </Text>
          </Pressable>
        </View>

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
              lineHeight: 24,
            },
          ]}
          accessibilityLabel="Journal entry body"
          accessibilityHint="Write your thoughts for this planning day"
          testID={testID}
        />

        {/* Word Count / Reading Time / Expand Footer */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
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
            {wordCount > 0 ? `📝 ${wordCount} words • ~${readMin} min read` : 'Tap Focus Mode for distraction-free writing'}
          </Text>

          <Pressable
            onPress={() => setModalVisible(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Expand editor"
          >
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600', fontSize: 11 }]}>
              Expand ↗
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Full-Screen Writing Modal */}
      <JournalWriteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        value={value}
        onChangeText={onChangeText}
        gregorianDisplay={gregorianDisplay}
        hijriDisplay={hijriDisplay}
        saveState={saveState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
    minHeight: 220,
    overflow: 'hidden',
    position: 'relative',
  },
  innerContent: {
    zIndex: 1,
  },
  moodSection: {
    width: '100%',
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  input: {
    minHeight: 160,
    padding: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
