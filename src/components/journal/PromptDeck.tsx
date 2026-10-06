import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JournalCard, SoftCircleButton } from './JournalCard';
import { JournalPromptHeaderBadgeIcon } from './JournalIcons';
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
  const { colors, spacing, radii, typography, touchTargets, isDark } = useTheme();
  const prompts = React.useMemo(() => getDailyPrompts(dayKey, 5), [dayKey]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const activePrompt = prompts[currentIndex % prompts.length];

  // Keep a ref of currentIndex to avoid stale closures in PanResponder
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Reanimated values for card slide animation
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const handleNext = () => {
    opacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(setCurrentIndex)((currentIndexRef.current + 1) % prompts.length);
      translateX.value = 30;
      translateX.value = withSpring(0, { damping: 14 });
      opacity.value = withTiming(1, { duration: 160 });
    });
  };

  const handlePrev = () => {
    opacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(setCurrentIndex)((currentIndexRef.current - 1 + prompts.length) % prompts.length);
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

  const activeDotIndex = currentIndex % prompts.length;

  return (
    <JournalCard
      icon={<JournalPromptHeaderBadgeIcon size={26} />}
      title="Daily Reflection Prompt"
      titleColor={colors.primaryDark}
      testID={testID}
      headerRight={
        <View style={styles.headerControls}>
          {/* Pagination dots */}
          <View style={styles.dotsContainer}>
            {prompts.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      idx === activeDotIndex
                        ? colors.primary
                        : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'),
                    width: idx === activeDotIndex ? 8 : 6,
                    height: idx === activeDotIndex ? 8 : 6,
                  },
                ]}
              />
            ))}
          </View>

          {/* Prev / Next buttons */}
          <View style={styles.arrowButtons}>
            <SoftCircleButton
              onPress={handlePrev}
              size={30}
              icon="chevron-left"
              iconSize={15}
              accessibilityLabel="Previous reflection prompt"
              testID="prompt-deck-prev-btn"
            />
            <SoftCircleButton
              onPress={handleNext}
              size={30}
              icon="chevron-right"
              iconSize={15}
              accessibilityLabel="Next reflection prompt"
              testID="prompt-deck-next-btn"
            />
          </View>
        </View>
      }
    >
      <View {...panResponder.panHandlers}>
        {/* Inner Mint Box */}
        <View
          style={[
            styles.innerBox,
            {
              backgroundColor: isDark ? 'rgba(15, 159, 74, 0.12)' : 'rgba(15, 159, 74, 0.07)',
              borderColor: isDark ? 'rgba(15, 159, 74, 0.25)' : 'rgba(15, 159, 74, 0.15)',
              borderRadius: radii.lg ?? 16,
            },
          ]}
        >
          {/* Decorative Lantern on right bottom */}
          <View
            style={styles.lanternWrapper}
            importantForAccessibility="no"
            accessibilityElementsHidden={true}
          >
            <Image
              source={require('../../../assets/illustrations/journal_prompt_lantern.png')}
              style={[
                styles.lanternImage,
                { opacity: isDark ? 0.65 : 0.88 },
              ]}
              resizeMode="contain"
            />
          </View>

          <Animated.View style={[styles.cardContent, cardAnimatedStyle]}>
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteMark, { color: colors.primary }]}>“</Text>
              <Text
                style={[
                  typography.bodyLarge,
                  styles.promptText,
                  { color: colors.textPrimary },
                ]}
                testID="prompt-deck-text"
              >
                "{activePrompt}"
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Footer Row: Gradient Pill CTA + Swipe hint */}
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => onSelectPrompt(activePrompt)}
            accessibilityRole="button"
            accessibilityLabel={`Write about prompt: ${activePrompt}`}
            style={({ pressed }) => [
              styles.useButtonWrapper,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            testID="prompt-deck-use-btn"
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.gradientPill,
                {
                  borderRadius: radii.pill,
                  minHeight: touchTargets.min,
                },
              ]}
            >
              <Icon name="edit" size={14} color={colors.textOnPrimary} decorative />
              <Text
                style={[
                  typography.labelMedium,
                  styles.useButtonText,
                  { color: colors.textOnPrimary },
                ]}
              >
                Write about this →
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
            Swipe for more →
          </Text>
        </View>
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginEnd: 4,
  },
  dot: {
    borderRadius: 99,
  },
  arrowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  innerBox: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 110,
    justifyContent: 'center',
  },
  lanternWrapper: {
    position: 'absolute',
    right: -4,
    bottom: -6,
    zIndex: 0,
    pointerEvents: 'none',
  },
  lanternImage: {
    width: 90,
    height: 75,
  },
  cardContent: {
    zIndex: 1,
    paddingEnd: 60, // Keep space for lantern
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  quoteMark: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '800',
    marginEnd: 6,
    marginTop: -2,
  },
  promptText: {
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  useButtonWrapper: {
    alignSelf: 'flex-start',
  },
  gradientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  useButtonText: {
    fontWeight: '700',
  },
});
