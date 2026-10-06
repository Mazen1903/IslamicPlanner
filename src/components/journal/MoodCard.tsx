import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { JournalCard } from './JournalCard';
import { MoodPicker } from './MoodPicker';
import { JournalMoodHeaderBadgeIcon } from './JournalIcons';
import type { MoodKey } from '@/domain/journal/types';

export interface MoodCardProps {
  selectedMood?: MoodKey;
  onSelectMood: (mood: MoodKey | undefined) => void;
  testID?: string;
}

export function MoodCard({
  selectedMood,
  onSelectMood,
  testID = 'journal-mood-card',
}: MoodCardProps) {
  const { colors, typography } = useTheme();

  return (
    <JournalCard
      icon={<JournalMoodHeaderBadgeIcon size={26} />}
      title="How is your heart today?"
      headerRight={
        selectedMood ? (
          <Pressable
            onPress={() => onSelectMood(undefined)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear selected mood"
          >
            <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
              Clear
            </Text>
          </Pressable>
        ) : null
      }
      testID={testID}
    >
      <MoodPicker
        selectedMood={selectedMood}
        onSelectMood={onSelectMood}
        hideTitle
      />
    </JournalCard>
  );
}
