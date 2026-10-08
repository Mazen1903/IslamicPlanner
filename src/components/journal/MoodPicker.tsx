import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import type { MoodKey, MoodOption } from '@/domain/journal/types';
import { MoodBadgeIcon } from './JournalIcons';

export const MOOD_OPTIONS: (MoodOption & { accentColor: string; bgLight: string })[] = [
  { key: 'hard', emoji: '😔', label: 'Hard', accentColor: '#E11D48', bgLight: 'rgba(225, 29, 72, 0.12)' },
  { key: 'okay', emoji: '😐', label: 'Okay', accentColor: '#64748B', bgLight: 'rgba(100, 116, 139, 0.12)' },
  { key: 'good', emoji: '🙂', label: 'Good', accentColor: '#0284C7', bgLight: 'rgba(2, 132, 199, 0.12)' },
  { key: 'great', emoji: '😄', label: 'Great', accentColor: '#059669', bgLight: 'rgba(5, 150, 105, 0.12)' },
  { key: 'grateful', emoji: '🤲', label: 'Grateful', accentColor: '#D97706', bgLight: 'rgba(217, 119, 6, 0.14)' },
];

export interface MoodPickerProps {
  selectedMood?: MoodKey;
  onSelectMood: (mood: MoodKey | undefined) => void;
  hideTitle?: boolean;
  testID?: string;
}

interface MoodItemProps {
  item: typeof MOOD_OPTIONS[0];
  isSelected: boolean;
  onPress: () => void;
}

function MoodItem({ item, isSelected, onPress }: MoodItemProps) {
  const { colors, spacing, radii, typography, touchTargets, isDark } = useTheme();
  const scale = useSharedValue(isSelected ? 1.05 : 1);
  const opacity = useSharedValue(isSelected ? 1 : 0.9);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.06, { damping: 10, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 160 });
      opacity.value = withTiming(0.9, { duration: 150 });
    }
  }, [isSelected, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 12, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(isSelected ? 1.06 : 1, { damping: 12, stiffness: 200 });
  };

  return (
    <Animated.View style={[styles.moodItemWrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${item.label} mood`}
        accessibilityState={{ selected: isSelected }}
        style={[
          styles.moodButton,
          {
            borderRadius: radii.md ?? 12,
            minHeight: touchTargets.min,
            backgroundColor: isSelected
              ? (isDark ? 'rgba(255, 255, 255, 0.12)' : item.bgLight)
              : (isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surfaceSecondary),
            borderColor: isSelected
              ? item.accentColor
              : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
            borderWidth: isSelected ? 2 : 1,
            shadowColor: isSelected ? item.accentColor : 'transparent',
            shadowOpacity: isSelected ? 0.25 : 0,
            shadowRadius: isSelected ? 6 : 0,
            elevation: isSelected ? 2 : 0,
          },
        ]}
        testID={`mood-option-${item.key}`}
      >
        <MoodBadgeIcon
          moodKey={item.key}
          size={30}
          testID={`mood-badge-icon-${item.key}`}
        />
        <Text
          style={[
            typography.caption,
            {
              color: isSelected ? item.accentColor : colors.textSecondary,
              marginTop: spacing.xxs + 2,
              fontSize: 11,
              letterSpacing: 0.1,
            },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function MoodPicker({
  selectedMood,
  onSelectMood,
  hideTitle = false,
  testID = 'mood-picker',
}: MoodPickerProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      {!hideTitle && (
        <View style={styles.headerRow}>
          <Text
            style={[
              typography.labelSmall,
              styles.title,
              { color: colors.textSecondary },
            ]}
          >
            How is your heart today?
          </Text>
          {selectedMood && (
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
          )}
        </View>
      )}

      <View style={styles.row}>
        {MOOD_OPTIONS.map((item) => {
          const isSelected = selectedMood === item.key;
          return (
            <MoodItem
              key={item.key}
              item={item}
              isSelected={isSelected}
              onPress={() => onSelectMood(isSelected ? undefined : item.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  moodItemWrapper: {
    flex: 1,
  },
  moodButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
});
