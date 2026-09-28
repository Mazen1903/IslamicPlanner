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
  const opacity = useSharedValue(isSelected ? 1 : 0.85);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.08, { damping: 10, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 160 });
      opacity.value = withTiming(0.8, { duration: 150 });
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
    scale.value = withSpring(isSelected ? 1.08 : 1, { damping: 12, stiffness: 200 });
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
            borderRadius: radii.md,
            minHeight: touchTargets.min,
            backgroundColor: isSelected
              ? (isDark ? 'rgba(255, 255, 255, 0.12)' : item.bgLight)
              : (isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surfaceSecondary),
            borderColor: isSelected
              ? item.accentColor
              : (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border),
            borderWidth: isSelected ? 2 : 1,
            shadowColor: isSelected ? item.accentColor : 'transparent',
            shadowOpacity: isSelected ? 0.3 : 0,
            shadowRadius: isSelected ? 6 : 0,
            elevation: isSelected ? 3 : 0,
          },
        ]}
        testID={`mood-option-${item.key}`}
      >
        <Text style={[styles.emoji, isSelected && styles.emojiSelected]}>{item.emoji}</Text>
        <Text
          style={[
            typography.caption,
            {
              color: isSelected ? item.accentColor : colors.textTertiary,
              fontWeight: isSelected ? '700' : '500',
              marginTop: spacing.xxs,
              fontSize: 10,
              letterSpacing: 0.2,
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
  testID = 'mood-picker',
}: MoodPickerProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={styles.container} testID={testID}>
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
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
    fontWeight: '700',
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  emojiSelected: {
    fontSize: 24,
    lineHeight: 28,
  },
});
