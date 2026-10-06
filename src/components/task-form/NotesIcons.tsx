import React from 'react';
import { View, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';

export interface NotesIconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  decorative?: boolean;
}

const NOTES_PNG = require('../../../assets/icons/task/opt_notes.png');

/**
 * NotesHeaderBadgeIcon
 * 44x44 rounded squircle with soft mint background and notes art.
 */
export function NotesHeaderBadgeIcon({
  size = 44,
  style,
  testID = 'notes-header-badge-icon',
  accessibilityLabel = 'Notes Header Icon',
  decorative = true,
}: NotesIconProps) {
  const { colors, radii } = useTheme();

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      testID={testID}
      style={[
        styles.badgeBase,
        {
          width: size,
          height: size,
          borderRadius: radii.md,
          backgroundColor: colors.primaryLight,
        },
        style,
      ]}
    >
      <Image
        source={NOTES_PNG}
        style={{ width: size, height: size, borderRadius: radii.md }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * NotesDocBadgeIcon
 * 36x36 squircle pastel icon for notes card.
 */
export function NotesDocBadgeIcon({
  size = 36,
  color,
  style,
  decorative = true,
}: NotesIconProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? 'none' : 'image'}
      style={[
        styles.badgeBase,
        {
          width: size,
          height: size,
          borderRadius: radii.sm,
          backgroundColor: '#6366F11E',
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name="notebook-edit-outline"
        size={size * 0.58}
        color={color || '#6366F1'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badgeBase: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
