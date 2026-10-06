import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import {
  JournalMoodHeaderBadgeIcon,
  JournalPromptHeaderBadgeIcon,
  JournalEntryHeaderBadgeIcon,
  JournalMuhasabaHeaderBadgeIcon,
  JournalHistoryBadgeIcon,
  MoodHardBadgeIcon,
  MoodOkayBadgeIcon,
  MoodGoodBadgeIcon,
  MoodGreatBadgeIcon,
  MoodGratefulBadgeIcon,
  MoodBadgeIcon,
  ReflectionGratitudeBadgeIcon,
  ReflectionWentWellBadgeIcon,
  ReflectionTomorrowBadgeIcon,
  ReflectionDuaBadgeIcon,
  ReflectionBadgeIcon,
} from '../JournalIcons';
import type { MoodKey } from '@/domain/journal/types';

describe('JournalIcons', () => {
  it('renders all section header badge icons with accessibility labels and custom sizes', async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <JournalMoodHeaderBadgeIcon size={24} testID="custom-mood-header" />
        <JournalPromptHeaderBadgeIcon size={26} testID="custom-prompt-header" />
        <JournalEntryHeaderBadgeIcon size={28} testID="custom-entry-header" />
        <JournalMuhasabaHeaderBadgeIcon size={30} testID="custom-muhasaba-header" />
        <JournalHistoryBadgeIcon size={32} testID="custom-history-header" />
      </ThemeProvider>
    );

    expect(getByTestId('custom-mood-header')).toBeTruthy();
    expect(getByTestId('custom-prompt-header')).toBeTruthy();
    expect(getByTestId('custom-entry-header')).toBeTruthy();
    expect(getByTestId('custom-muhasaba-header')).toBeTruthy();
    expect(getByTestId('custom-history-header')).toBeTruthy();
  });

  it('renders all 5 individual mood badges correctly', async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <MoodHardBadgeIcon />
        <MoodOkayBadgeIcon />
        <MoodGoodBadgeIcon />
        <MoodGreatBadgeIcon />
        <MoodGratefulBadgeIcon />
      </ThemeProvider>
    );

    expect(getByTestId('mood-badge-hard')).toBeTruthy();
    expect(getByTestId('mood-badge-okay')).toBeTruthy();
    expect(getByTestId('mood-badge-good')).toBeTruthy();
    expect(getByTestId('mood-badge-great')).toBeTruthy();
    expect(getByTestId('mood-badge-grateful')).toBeTruthy();
  });

  it('renders mood badges dynamically via MoodBadgeIcon for all mood keys', async () => {
    const moods: MoodKey[] = ['hard', 'okay', 'good', 'great', 'grateful'];
    const { getByTestId } = await render(
      <ThemeProvider>
        {moods.map((key) => (
          <MoodBadgeIcon key={key} moodKey={key} testID={`dynamic-mood-${key}`} />
        ))}
      </ThemeProvider>
    );

    for (const key of moods) {
      expect(getByTestId(`dynamic-mood-${key}`)).toBeTruthy();
    }
  });

  it('renders all 4 individual reflection badges correctly', async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <ReflectionGratitudeBadgeIcon />
        <ReflectionWentWellBadgeIcon />
        <ReflectionTomorrowBadgeIcon />
        <ReflectionDuaBadgeIcon />
      </ThemeProvider>
    );

    expect(getByTestId('reflection-badge-gratitude')).toBeTruthy();
    expect(getByTestId('reflection-badge-wentWell')).toBeTruthy();
    expect(getByTestId('reflection-badge-improvement')).toBeTruthy();
    expect(getByTestId('reflection-badge-dua')).toBeTruthy();
  });

  it('renders reflection badges dynamically via ReflectionBadgeIcon for all reflection keys', async () => {
    const keys = ['gratitude', 'wentWell', 'improvement', 'dua'];
    const { getByTestId } = await render(
      <ThemeProvider>
        {keys.map((key) => (
          <ReflectionBadgeIcon key={key} fieldKey={key} testID={`dynamic-reflection-${key}`} />
        ))}
      </ThemeProvider>
    );

    for (const key of keys) {
      expect(getByTestId(`dynamic-reflection-${key}`)).toBeTruthy();
    }
  });

  it('supports non-decorative mode with accessibilityRole and accessibilityLabel', async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <JournalMoodHeaderBadgeIcon
          decorative={false}
          accessibilityLabel="Heart mood header badge"
          testID="accessible-mood-badge"
        />
      </ThemeProvider>
    );

    const badge = getByTestId('accessible-mood-badge');
    expect(badge.props.accessibilityRole).toBe('image');
    expect(badge.props.accessibilityLabel).toBe('Heart mood header badge');
  });
});
