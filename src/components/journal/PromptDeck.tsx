import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { getDailyPrompts, JOURNAL_PROMPTS } from '@/constants/journalPrompts';

export interface PromptDeckProps {
  dayKey: string;
  onSelectPrompt: (promptText: string) => void;
  testID?: string;
}

export function PromptDeck({
  dayKey,
  onSelectPrompt,
  testID = 'prompt-deck',
}: PromptDeckProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();
  const prompts = React.useMemo(() => getDailyPrompts(dayKey, 5), [dayKey]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const activePrompt = prompts[currentIndex % prompts.length];

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % prompts.length);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: radii.md,
          borderColor: colors.border,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
      ]}
      testID={testID}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.bulbEmoji}>💡</Text>
          <Text
            style={[
              typography.labelSmall,
              { color: colors.textSecondary, marginStart: spacing.xs, fontWeight: '700' },
            ]}
          >
            DAILY REFLECTION PROMPT
          </Text>
        </View>

        <Pressable
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel="Cycle to next prompt"
          style={({ pressed }) => [
            styles.cycleButton,
            {
              borderRadius: radii.pill,
              opacity: pressed ? 0.6 : 1,
              minWidth: 32,
              minHeight: 32,
            },
          ]}
          testID="prompt-deck-cycle-btn"
        >
          <Icon name="refresh" size={14} color={colors.textSecondary} decorative />
        </Pressable>
      </View>

      {/* Prompt Body */}
      <Text
        style={[
          typography.bodyMedium,
          styles.promptText,
          { color: colors.textPrimary, marginVertical: spacing.sm },
        ]}
        testID="prompt-deck-text"
      >
        "{activePrompt}"
      </Text>

      {/* Action to insert prompt */}
      <Pressable
        onPress={() => onSelectPrompt(activePrompt)}
        accessibilityRole="button"
        accessibilityLabel={`Use prompt: ${activePrompt}`}
        style={({ pressed }) => [
          styles.useButton,
          {
            backgroundColor: pressed ? colors.primaryLight : colors.surface,
            borderColor: colors.primary,
            borderRadius: radii.pill,
            minHeight: touchTargets.min,
          },
        ]}
        testID="prompt-deck-use-btn"
      >
        <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>
          Write about this ✍️
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulbEmoji: {
    fontSize: 14,
  },
  cycleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
  useButton: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
});
