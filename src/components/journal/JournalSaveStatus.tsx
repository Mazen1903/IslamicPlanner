import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { SaveState } from '@/services/journal/JournalAutosaveController';

export interface JournalSaveStatusProps {
  state: SaveState;
  testID?: string;
}

export function JournalSaveStatus({
  state,
  testID = 'journal-save-status',
}: JournalSaveStatusProps) {
  const { colors, typography } = useTheme();

  if (state === 'idle' || state === 'dirty') {
    return null;
  }

  let text = '';
  let color = colors.textSecondary;

  if (state === 'saving') {
    text = 'Saving…';
    color = colors.textSecondary;
  } else if (state === 'saved') {
    text = 'Saved';
    color = colors.textTertiary;
  } else if (state === 'error') {
    text = 'Not saved yet';
    color = colors.warning;
  }

  return (
    <Text
      style={[typography.caption, styles.text, { color }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Journal save status: ${text}`}
      testID={testID}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '500',
  },
});
