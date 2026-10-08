import React from 'react';
import { View, StyleSheet, Image, type StyleProp, type ViewStyle, type ImageSourcePropType } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/theme';
import type { MoodKey, JournalReflections } from '@/domain/journal/types';
import {
  JOURNAL_MOOD_ASSETS,
  JOURNAL_REFLECTION_ASSETS,
  JOURNAL_HEADER_BADGE_ASSETS,
  JOURNAL_ACTION_ASSETS,
} from '@/constants/journalIconAssets';

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
  imageSource?: ImageSourcePropType;
  defaultAccent: string;
  lightBg: string;
  darkBg: string;
  borderTint: string;
  iconFamily?: 'MaterialCommunityIcons' | 'Ionicons';
}

/**
 * Base squircle badge matching the exact visual language of Settings and Task squircle icons.
 * Features a soft pastel tinted container, rounded squircle corners, subtle border, and high-fidelity glyph or illustration.
 */
function BaseJournalBadge({
  iconName,
  imageSource,
  size = 28,
  color,
  backgroundColor,
  borderColor,
  defaultAccent,
  lightBg,
  darkBg,
  borderTint,
  iconFamily = 'MaterialCommunityIcons',
  style,
  testID,
  accessibilityLabel,
  decorative = true,
}: BaseJournalBadgeProps) {
  const { isDark } = useTheme();
  const iconColor = color ?? defaultAccent;
  const bg = backgroundColor ?? (isDark ? darkBg : lightBg);
  const border = borderColor ?? borderTint;
  const borderRadius = Math.max(6, Math.round(size * 0.28));
  const iconSize = imageSource
    ? Math.max(16, Math.round(size * 0.68))
    : Math.max(12, Math.round(size * 0.52));

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
          borderWidth: 1.2,
          shadowColor: defaultAccent,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.12,
          shadowRadius: 3,
          elevation: 1.5,
        },
        style,
      ]}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
        />
      ) : iconFamily === 'Ionicons' ? (
        <Ionicons name={iconName as any} size={iconSize} color={iconColor} />
      ) : (
        <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />
      )}
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
      imageSource={JOURNAL_HEADER_BADGE_ASSETS.mood}
      iconName="heart-pulse"
      defaultAccent="#E11D48"
      lightBg="rgba(225, 29, 72, 0.12)"
      darkBg="rgba(225, 29, 72, 0.24)"
      borderTint="rgba(225, 29, 72, 0.28)"
      testID={props.testID ?? 'journal-mood-header-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Mood section'}
    />
  );
}

export function JournalPromptHeaderBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      {...props}
      imageSource={JOURNAL_HEADER_BADGE_ASSETS.prompt}
      iconName="lightbulb-on-outline"
      defaultAccent="#D97706"
      lightBg="rgba(217, 119, 6, 0.12)"
      darkBg="rgba(217, 119, 6, 0.24)"
      borderTint="rgba(217, 119, 6, 0.28)"
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
      imageSource={JOURNAL_HEADER_BADGE_ASSETS.entry}
      iconName="book-open-page-variant"
      defaultAccent={colors.primary}
      lightBg={colors.primaryLight}
      darkBg={isDark ? 'rgba(15, 159, 74, 0.24)' : 'rgba(15, 159, 74, 0.12)'}
      borderTint={isDark ? 'rgba(15, 159, 74, 0.38)' : 'rgba(15, 159, 74, 0.28)'}
      testID={props.testID ?? 'journal-entry-header-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Journal entry section'}
    />
  );
}

export function JournalMuhasabaHeaderBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      {...props}
      imageSource={JOURNAL_HEADER_BADGE_ASSETS.muhasaba}
      iconName="scale-balance"
      defaultAccent="#8B5CF6"
      lightBg="rgba(139, 92, 246, 0.12)"
      darkBg="rgba(139, 92, 246, 0.24)"
      borderTint="rgba(139, 92, 246, 0.28)"
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
      imageSource={JOURNAL_HEADER_BADGE_ASSETS.history}
      iconName="book-open-outline"
      defaultAccent={colors.primary}
      lightBg={colors.primaryLight}
      darkBg={isDark ? 'rgba(15, 159, 74, 0.24)' : 'rgba(15, 159, 74, 0.12)'}
      borderTint={isDark ? 'rgba(15, 159, 74, 0.38)' : 'rgba(15, 159, 74, 0.28)'}
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
      imageSource={JOURNAL_MOOD_ASSETS.hard}
      iconName="weather-rainy"
      defaultAccent="#E11D48"
      lightBg="rgba(225, 29, 72, 0.14)"
      darkBg="rgba(225, 29, 72, 0.24)"
      borderTint="rgba(225, 29, 72, 0.28)"
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
      imageSource={JOURNAL_MOOD_ASSETS.okay}
      iconName="leaf"
      defaultAccent="#64748B"
      lightBg="rgba(100, 116, 139, 0.14)"
      darkBg="rgba(100, 116, 139, 0.24)"
      borderTint="rgba(100, 116, 139, 0.28)"
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
      imageSource={JOURNAL_MOOD_ASSETS.good}
      iconName="white-balance-sunny"
      defaultAccent="#0284C7"
      lightBg="rgba(2, 132, 199, 0.14)"
      darkBg="rgba(2, 132, 199, 0.24)"
      borderTint="rgba(2, 132, 199, 0.28)"
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
      imageSource={JOURNAL_MOOD_ASSETS.great}
      iconName="flower"
      defaultAccent="#059669"
      lightBg="rgba(5, 150, 105, 0.14)"
      darkBg="rgba(5, 150, 105, 0.24)"
      borderTint="rgba(5, 150, 105, 0.28)"
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
      imageSource={JOURNAL_MOOD_ASSETS.grateful}
      iconName="hands-pray"
      defaultAccent="#D97706"
      lightBg="rgba(217, 119, 6, 0.16)"
      darkBg="rgba(217, 119, 6, 0.26)"
      borderTint="rgba(217, 119, 6, 0.3)"
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
      imageSource={JOURNAL_REFLECTION_ASSETS.gratitude}
      iconName="hands-pray"
      defaultAccent="#F59E0B"
      lightBg="rgba(245, 158, 11, 0.14)"
      darkBg="rgba(245, 158, 11, 0.24)"
      borderTint="rgba(245, 158, 11, 0.28)"
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
      imageSource={JOURNAL_REFLECTION_ASSETS.wentWell}
      iconName="star-four-points"
      defaultAccent="#10B981"
      lightBg="rgba(16, 185, 129, 0.14)"
      darkBg="rgba(16, 185, 129, 0.24)"
      borderTint="rgba(16, 185, 129, 0.28)"
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
      imageSource={JOURNAL_REFLECTION_ASSETS.improvement}
      iconName="sprout"
      defaultAccent="#06B6D4"
      lightBg="rgba(6, 182, 212, 0.14)"
      darkBg="rgba(6, 182, 212, 0.24)"
      borderTint="rgba(6, 182, 212, 0.28)"
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
      imageSource={JOURNAL_REFLECTION_ASSETS.dua}
      iconName="hand-heart"
      defaultAccent="#8B5CF6"
      lightBg="rgba(139, 92, 246, 0.14)"
      darkBg="rgba(139, 92, 246, 0.24)"
      borderTint="rgba(139, 92, 246, 0.28)"
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

// ==========================================
// 4. Utility & Security Badges
// ==========================================

export function JournalLockBadgeIcon(props: JournalBadgeIconProps) {
  const { colors, isDark } = useTheme();
  return (
    <BaseJournalBadge
      size={props.size ?? 36}
      {...props}
      imageSource={JOURNAL_ACTION_ASSETS.headerLock}
      iconName="lock-outline"
      defaultAccent={colors.primary}
      lightBg={colors.primaryLight}
      darkBg={isDark ? 'rgba(15, 159, 74, 0.24)' : 'rgba(15, 159, 74, 0.12)'}
      borderTint={isDark ? 'rgba(15, 159, 74, 0.38)' : 'rgba(15, 159, 74, 0.28)'}
      testID={props.testID ?? 'journal-lock-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Journal locked'}
    />
  );
}

export function JournalUnlockBadgeIcon(props: JournalBadgeIconProps) {
  const { colors, isDark } = useTheme();
  return (
    <BaseJournalBadge
      size={props.size ?? 36}
      {...props}
      imageSource={JOURNAL_ACTION_ASSETS.headerLock}
      iconName="lock-open-outline"
      defaultAccent={colors.primary}
      lightBg={colors.primaryLight}
      darkBg={isDark ? 'rgba(15, 159, 74, 0.24)' : 'rgba(15, 159, 74, 0.12)'}
      borderTint={isDark ? 'rgba(15, 159, 74, 0.38)' : 'rgba(15, 159, 74, 0.28)'}
      testID={props.testID ?? 'journal-unlock-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Journal unlocked'}
    />
  );
}

export function JournalShieldSecurityBadgeIcon(props: JournalBadgeIconProps) {
  return (
    <BaseJournalBadge
      size={props.size ?? 36}
      {...props}
      iconName="shield-check-outline"
      defaultAccent="#0284C7"
      lightBg="rgba(2, 132, 199, 0.14)"
      darkBg="rgba(2, 132, 199, 0.24)"
      borderTint="rgba(2, 132, 199, 0.28)"
      testID={props.testID ?? 'journal-security-badge'}
      accessibilityLabel={props.accessibilityLabel ?? 'Encrypted and secure'}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
