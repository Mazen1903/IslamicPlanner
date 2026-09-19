import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { ReflectionField } from './ReflectionField';
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
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.card,
          borderColor: colors.border,
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
        },
      ]}
      testID={testID}
    >
      <Pressable
        onPress={() => setExpanded(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel={`Reflections section. Currently ${expanded ? 'expanded' : 'collapsed'}.`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.headerPressable,
          {
            minHeight: touchTargets.min,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        testID="reflection-section-toggle"
      >
        <View style={styles.headerTitleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary }]}>
            Reflections
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary, marginStart: spacing.sm }]}>
            (Optional)
          </Text>
        </View>

        <Icon
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={18}
          color={colors.textSecondary}
          decorative
        />
      </Pressable>

      {expanded && (
        <View
          style={[
            styles.fieldsContainer,
            {
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: spacing.md,
            },
          ]}
          testID="reflection-section-content"
        >
          <ReflectionField
            label="Gratitude"
            placeholder="What are you grateful for today?"
            value={reflections.gratitude}
            onChangeText={text => onChangeReflection('gratitude', text)}
            testID="reflection-field-gratitude"
          />

          <ReflectionField
            label="What went well"
            placeholder="What went well today?"
            value={reflections.wentWell}
            onChangeText={text => onChangeReflection('wentWell', text)}
            testID="reflection-field-wentWell"
          />

          <ReflectionField
            label="What can I improve tomorrow?"
            placeholder="What could be better tomorrow?"
            value={reflections.improvement}
            onChangeText={text => onChangeReflection('improvement', text)}
            testID="reflection-field-improvement"
          />

          <ReflectionField
            label="Dua"
            placeholder="Any duas on your heart today?"
            value={reflections.dua}
            onChangeText={text => onChangeReflection('dua', text)}
            testID="reflection-field-dua"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldsContainer: {
    width: '100%',
  },
});
