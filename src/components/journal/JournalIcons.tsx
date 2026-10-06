import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import type { MoodKey, JournalReflections } from '@/domain/journal/types';

export interface JournalBadgeIconProps {
  size?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  decorative?: boolean;
}

interface BaseJournalBadgeProps extends JournalBadgeIconProps {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  defaultAccent: string;
  lightBg: string;
  darkBg: string;
  borderTint: string;
}

function BaseJournalBadge({
  iconName,
  size = 28,
  color,
  backgroundColor,
  borderColor,
  defaultAccent,
  lightBg,
  darkBg,
  borderTint,
  style,
  testID,
  accessibilityLabel,
  decorative = true,
}: BaseJournalBadgeProps) {
  const { isDark } = useTheme();
  const iconColor = color ?? defaultAccent;
  const bg = backgroundColor ?? (isDark ? darkBg : lightBg);
  const border = borderColor ?? (isDark ? `${borderTint}` : borderTint);
  const borderRadius = Math.max(6, Math.round(size * 0.28));
  const iconSize = Math.max(12, Math.round(size * 0.54));

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bg,
          borderColor: border,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={iconSize}
        color={iconColor}
      />
    </View>
  );
}

// ==========================================
// 1. Section Header Badges
// ==========================================

export function JournalMoodHeaderBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      {...props}
      iconName="heart-pulse"
      defaultAccent="#E11D48"
      lightBg="rgba(225, 29, 72, 0.12)"
      darkBg="rgba(225, 29, 72, 0.22)"
      borderTint="rgba(225, 29, 72, 0.25)"
      testID={props.testID ?? 'journal-mood-header-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Mood section'}
    />
  );
}

export function JournalPromptHeaderBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      {...props}
      iconName="lightbulb-on-outline"
      defaultAccent="#D97706"
      lightBg="rgba(217, 119, 6, 0.12)"
      darkBg="rgba(217, 119, 6, 0.22)"
      borderTint="rgba(217, 119, 6, 0.25)"
      testID={props.testID ?? 'journal-prompt-header-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Daily prompt section'}
    />
  );
}

export function JournalEntryHeaderBadgeIcon(props: JournalBadgeIconProps) {
  const { colors, isDark } = useTheme();
  return (
    <BaseJournalBadge
      {...props}
      iconName="book-open-page-variant"
      defaultAccent={colors.primary}
      lightBg={colors.primaryLight}
      darkBg={isDark ? 'rgba(15, 159, 74, 0.22)' : 'rgba(15, 159, 74, 0.12)'}
      borderTint={isDark ? 'rgba(15, 159, 74, 0.35)' : 'rgba(15, 159, 74, 0.25)'}
      testID={props.testID ?? 'journal-entry-header-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Journal entry section'}
    />
  );
}

export function JournalMuhasabaHeaderBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      {...props}
      iconName="scale-balance"
      defaultAccent="#8B5CF6"
      lightBg="rgba(139, 92, 246, 0.12)"
      darkBg="rgba(139, 92, 246, 0.22)"
      borderTint="rgba(139, 92, 246, 0.25)"
      testID={props.testID ?? 'journal-muhasaba-header-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Daily Muhasaba section'}
    />
  );
}

export function JournalHistoryBadgeIcon(props: JournalBadgeIconProps) {
  const { colors, isDark } = useTheme();
  return (
    <BaseJournalBadge
      size={props.size ?? 34}
      {...props}
      iconName="book-open-outline"
      defaultAccent={colors.primary}
      lightBg={colors.primaryLight}
      darkBg={isDark ? 'rgba(15, 159, 74, 0.22)' : 'rgba(15, 159, 74, 0.12)'}
      borderTint={isDark ? 'rgba(15, 159, 74, 0.35)' : 'rgba(15, 159, 74, 0.25)'}
      testID={props.testID ?? 'journal-history-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Historical journal entry'}
    />
  );
}

// ==========================================
// 2. Mood Badges
// ==========================================

export function MoodHardBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 32}
      {...props}
      iconName="weather-rainy"
      defaultAccent="#E11D48"
      lightBg="rgba(225, 29, 72, 0.12)"
      darkBg="rgba(225, 29, 72, 0.22)"
      borderTint="rgba(225, 29, 72, 0.24)"
      testID={props.testID ?? 'mood-badge-hard'}
      accessibilityLabel={props.accessibilityLabel ?? 'Hard mood'}
    />
  );
}

export function MoodOkayBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 32}
      {...props}
      iconName="leaf"
      defaultAccent="#64748B"
      lightBg="rgba(100, 116, 139, 0.12)"
      darkBg="rgba(100, 116, 139, 0.22)"
      borderTint="rgba(100, 116, 139, 0.24)"
      testID={props.testID ?? 'mood-badge-okay'}
      accessibilityLabel={props.accessibilityLabel ?? 'Okay mood'}
    />
  );
}

export function MoodGoodBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 32}
      {...props}
      iconName="white-balance-sunny"
      defaultAccent="#0284C7"
      lightBg="rgba(2, 132, 199, 0.12)"
      darkBg="rgba(2, 132, 199, 0.22)"
      borderTint="rgba(2, 132, 199, 0.24)"
      testID={props.testID ?? 'mood-badge-good'}
      accessibilityLabel={props.accessibilityLabel ?? 'Good mood'}
    />
  );
}

export function MoodGreatBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 32}
      {...props}
      iconName="flower"
      defaultAccent="#059669"
      lightBg="rgba(5, 150, 105, 0.12)"
      darkBg="rgba(5, 150, 105, 0.22)"
      borderTint="rgba(5, 150, 105, 0.24)"
      testID={props.testID ?? 'mood-badge-great'}
      accessibilityLabel={props.accessibilityLabel ?? 'Great mood'}
    />
  );
}

export function MoodGratefulBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 32}
      {...props}
      iconName="hands-pray"
      defaultAccent="#D97706"
      lightBg="rgba(217, 119, 6, 0.14)"
      darkBg="rgba(217, 119, 6, 0.24)"
      borderTint="rgba(217, 119, 6, 0.26)"
      testID={props.testID ?? 'mood-badge-grateful'}
      accessibilityLabel={props.accessibilityLabel ?? 'Grateful mood'}
    />
  );
}

export function MoodBadgeIcon({
  moodKey,
  ...props
}: JournalBadgeIconProps & { moodKey: MoodKey }) {
  switch (moodKey) {
    case 'hard':
      return <MoodHardBadgeIcon {...props} />;
    case 'okay':
      return <MoodOkayBadgeIcon {...props} />;
    case 'good':
      return <MoodGoodBadgeIcon {...props} />;
    case 'great':
      return <MoodGreatBadgeIcon {...props} />;
    case 'grateful':
      return <MoodGratefulBadgeIcon {...props} />;
    default:
      return <MoodGoodBadgeIcon {...props} />;
  }
}

// ==========================================
// 3. Daily Muhasaba Reflection Badges
// ==========================================

export function ReflectionGratitudeBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 34}
      {...props}
      iconName="hands-pray"
      defaultAccent="#F59E0B"
      lightBg="rgba(245, 158, 11, 0.12)"
      darkBg="rgba(245, 158, 11, 0.22)"
      borderTint="rgba(245, 158, 11, 0.25)"
      testID={props.testID ?? 'reflection-badge-gratitude'}
      accessibilityLabel={props.accessibilityLabel ?? 'Gratitude reflection'}
    />
  );
}

export function ReflectionWentWellBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 34}
      {...props}
      iconName="star-four-points"
      defaultAccent="#10B981"
      lightBg="rgba(16, 185, 129, 0.12)"
      darkBg="rgba(16, 185, 129, 0.22)"
      borderTint="rgba(16, 185, 129, 0.25)"
      testID={props.testID ?? 'reflection-badge-wentWell'}
      accessibilityLabel={props.accessibilityLabel ?? 'What went well reflection'}
    />
  );
}

export function ReflectionTomorrowBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 34}
      {...props}
      iconName="sprout"
      defaultAccent="#06B6D4"
      lightBg="rgba(6, 182, 212, 0.12)"
      darkBg="rgba(6, 182, 212, 0.22)"
      borderTint="rgba(6, 182, 212, 0.25)"
      testID={props.testID ?? 'reflection-badge-improvement'}
      accessibilityLabel={props.accessibilityLabel ?? 'For tomorrow reflection'}
    />
  );
}

export function ReflectionDuaBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 34}
      {...props}
      iconName="hand-heart"
      defaultAccent="#8B5CF6"
      lightBg="rgba(139, 92, 246, 0.12)"
      darkBg="rgba(139, 92, 246, 0.22)"
      borderTint="rgba(139, 92, 246, 0.25)"
      testID={props.testID ?? 'reflection-badge-dua'}
      accessibilityLabel={props.accessibilityLabel ?? 'Heartfelt dua reflection'}
    />
  );
}

export function ReflectionBadgeIcon({
  fieldKey,
  ...props
}: JournalBadgeIconProps & { fieldKey: keyof JournalReflections | string }) {
  switch (fieldKey) {
    case 'gratitude':
      return <ReflectionGratitudeBadgeIcon {...props} />;
    case 'wentWell':
      return <ReflectionWentWellBadgeIcon {...props} />;
    case 'improvement':
      return <ReflectionTomorrowBadgeIcon {...props} />;
    case 'dua':
      return <ReflectionDuaBadgeIcon {...props} />;
    default:
      return <ReflectionGratitudeBadgeIcon {...props} />;
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
