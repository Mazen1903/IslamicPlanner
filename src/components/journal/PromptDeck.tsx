import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { getDailyPrompts } from '@/constants/journalPrompts';

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
  const { colors, spacing, radii, typography, touchTargets, isDark, shadows } = useTheme();
  const prompts = React.useMemo(() => getDailyPrompts(dayKey, 5), [dayKey]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const activePrompt = prompts[currentIndex % prompts.length];

  // Reanimated values for card slide animation
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const handleNext = () => {
    opacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(setCurrentIndex)((currentIndex + 1) % prompts.length);
      translateX.value = 30;
      translateX.value = withSpring(0, { damping: 14 });
      opacity.value = withTiming(1, { duration: 160 });
    });
  };

  const handlePrev = () => {
    opacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(setCurrentIndex)((currentIndex - 1 + prompts.length) % prompts.length);
      translateX.value = -30;
      translateX.value = withSpring(0, { damping: 14 });
      opacity.value = withTiming(1, { duration: 160 });
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          handleNext();
        } else if (gestureState.dx > 40) {
          handlePrev();
        }
      },
    })
  ).current;

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <View
      style={[
        styles.container,
        shadows.card,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : 'rgba(244, 247, 245, 0.9)',
          borderRadius: radii.card,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 159, 74, 0.12)',
          padding: spacing.md,
          marginBottom: spacing.md,
        },
      ]}
      testID={testID}
      {...panResponder.panHandlers}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.sparkleIcon}>✨</Text>
          <Text
            style={[
              typography.labelSmall,
              styles.headerLabel,
              { color: colors.primaryDark },
            ]}
          >
            DAILY REFLECTION PROMPT
          </Text>
        </View>

        {/* Indicators and cycle button */}
        <View style={styles.actionRow}>
          <View style={styles.dotsContainer}>
            {prompts.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      idx === currentIndex % prompts.length
                        ? colors.primary
                        : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                    width: idx === currentIndex % prompts.length ? 14 : 5,
                  },
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel="Cycle to next reflection prompt"
            style={({ pressed }) => [
              styles.cycleButton,
              {
                borderRadius: radii.pill,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 159, 74, 0.08)',
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            testID="prompt-deck-cycle-btn"
          >
            <Icon name="refresh" size={13} color={colors.primary} decorative />
          </Pressable>
        </View>
      </View>

      {/* Animated Prompt Card Body */}
      <Animated.View style={[styles.cardContent, cardAnimatedStyle]}>
        <View style={styles.quoteRow}>
          <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
          <Text
            style={[
              typography.bodyMedium,
              styles.promptText,
              { color: colors.textPrimary },
            ]}
            testID="prompt-deck-text"
          >
            "{activePrompt}"
          </Text>
        </View>

        {/* Action to insert prompt */}
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => onSelectPrompt(activePrompt)}
            accessibilityRole="button"
            accessibilityLabel={`Use prompt: ${activePrompt}`}
            style={({ pressed }) => [
              styles.useButton,
              {
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                borderRadius: radii.pill,
                minHeight: touchTargets.min,
              },
            ]}
            testID="prompt-deck-use-btn"
          >
            <Text style={[typography.labelSmall, { color: colors.textOnPrimary, fontWeight: '700' }]}>
              Write about this ✍️
            </Text>
          </Pressable>
          <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
            Swipe for more →
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparkleIcon: {
    fontSize: 13,
  },
  headerLabel: {
    marginStart: 4,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  cycleButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    width: '100%',
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
    marginEnd: 10,
    opacity: 0.8,
  },
  promptText: {
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 22,
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  useButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
});
