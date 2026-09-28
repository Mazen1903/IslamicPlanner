import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { ReflectionCard } from './ReflectionCard';
import type { JournalReflections } from '@/domain/journal/types';

export interface ReflectionSectionProps {
  reflections: JournalReflections;
  onChangeReflection: (field: keyof JournalReflections, text: string) => void;
  initialExpanded?: boolean;
  testID?: string;
}

export function ReflectionSection({
  reflections,
  onChangeReflection,
  initialExpanded = false,
  testID = 'reflection-section',
}: ReflectionSectionProps) {
  const { colors, spacing, radii, typography, isDark } = useTheme();
  const [expanded, setExpanded] = useState(initialExpanded);

  // Count filled reflections
  const filledCount = Object.values(reflections).filter(
    val => typeof val === 'string' && val.trim().length > 0
  ).length;

  return (
    <View style={[styles.container, { marginHorizontal: spacing.lg, marginTop: spacing.md }]} testID={testID}>
      {/* Section Header */}
      <Pressable
        onPress={() => setExpanded(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel={`Reflections section. Currently ${expanded ? 'expanded' : 'collapsed'}. ${filledCount} of 4 answered.`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.headerRow,
          {
            paddingVertical: spacing.xs + 2,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        testID="reflection-section-toggle"
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🪞</Text>
          <Text style={[typography.headlineMedium, styles.headerTitle, { color: colors.textPrimary }]}>
            Daily Muhasaba
          </Text>
          <View
            style={[
              styles.counterBadge,
              {
                backgroundColor: filledCount > 0
                  ? (isDark ? 'rgba(15, 159, 74, 0.25)' : colors.primaryLight)
                  : (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceSecondary),
                borderColor: filledCount > 0 ? colors.primary : colors.border,
                borderRadius: radii.pill,
              },
            ]}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: filledCount > 0 ? colors.primaryDark : colors.textTertiary,
                  fontWeight: '700',
                  fontSize: 10,
                },
              ]}
            >
              {filledCount}/4
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 12, marginEnd: 4 }]}>
            {expanded ? 'Hide' : 'Show'}
          </Text>
          <Icon
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={16}
            color={colors.textSecondary}
            decorative
          />
        </View>
      </Pressable>

      {/* Individual Cards Grid */}
      {expanded && (
        <View style={styles.cardsContainer} testID="reflection-section-content">
          <ReflectionCard
            label="Gratitude"
            emoji="🤲"
            placeholder="What are you grateful for today?"
            value={reflections.gratitude}
            onChangeText={text => onChangeReflection('gratitude', text)}
            accentColor="#D97706"
            bgLight="rgba(217, 119, 6, 0.12)"
            testID="reflection-field-gratitude"
          />

          <ReflectionCard
            label="What Went Well"
            emoji="✅"
            placeholder="What went well today?"
            value={reflections.wentWell}
            onChangeText={text => onChangeReflection('wentWell', text)}
            accentColor="#059669"
            bgLight="rgba(5, 150, 105, 0.12)"
            testID="reflection-field-wentWell"
          />

          <ReflectionCard
            label="For Tomorrow"
            emoji="📈"
            placeholder="What could be better tomorrow?"
            value={reflections.improvement}
            onChangeText={text => onChangeReflection('improvement', text)}
            accentColor="#0284C7"
            bgLight="rgba(2, 132, 199, 0.12)"
            testID="reflection-field-improvement"
          />

          <ReflectionCard
            label="Heartfelt Dua"
            emoji="🌙"
            placeholder="Any prayers or duas on your heart today?"
            value={reflections.dua}
            onChangeText={text => onChangeReflection('dua', text)}
            accentColor="#8B5CF6"
            bgLight="rgba(139, 92, 246, 0.12)"
            testID="reflection-field-dua"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 'auto',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  counterBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardsContainer: {
    width: '100%',
    paddingTop: 2,
  },
});
