import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import type { MoodKey, MoodOption } from '@/domain/journal/types';

export const MOOD_OPTIONS: MoodOption[] = [
  { key: 'hard', emoji: '😔', label: 'Hard' },
  { key: 'okay', emoji: '😐', label: 'Okay' },
  { key: 'good', emoji: '🙂', label: 'Good' },
  { key: 'great', emoji: '😄', label: 'Great' },
  { key: 'grateful', emoji: '🤲', label: 'Grateful' },
];

export interface MoodPickerProps {
  selectedMood?: MoodKey;
  onSelectMood: (mood: MoodKey | undefined) => void;
  testID?: string;
}

export function MoodPicker({
  selectedMood,
  onSelectMood,
  testID = 'mood-picker',
}: MoodPickerProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      <Text
        style={[
          typography.labelSmall,
          styles.title,
          { color: colors.textSecondary, marginBottom: spacing.xs },
        ]}
      >
        How is your heart today?
      </Text>

      <View style={styles.row}>
        {MOOD_OPTIONS.map((item) => {
          const isSelected = selectedMood === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelectMood(isSelected ? undefined : item.key)}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} mood`}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.moodButton,
                {
                  borderRadius: radii.md,
                  minHeight: touchTargets.min,
                  backgroundColor: isSelected
                    ? colors.primaryLight
                    : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              testID={`mood-option-${item.key}`}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text
                style={[
                  typography.caption,
                  {
                    color: isSelected ? colors.primaryDark : colors.textTertiary,
                    fontWeight: isSelected ? '700' : '500',
                    marginTop: spacing.xxs,
                    fontSize: 10,
                  },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 4,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
});
