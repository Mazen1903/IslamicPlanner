import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { JournalCard, SoftCircleButton } from './JournalCard';
import { ReflectionCard } from './ReflectionCard';
import {
  JournalMuhasabaHeaderBadgeIcon,
  ReflectionGratitudeBadgeIcon,
  ReflectionWentWellBadgeIcon,
  ReflectionTomorrowBadgeIcon,
  ReflectionDuaBadgeIcon,
} from './JournalIcons';
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
  initialExpanded = true,
  testID = 'reflection-section',
}: ReflectionSectionProps) {
  const { colors, radii, typography, isDark } = useTheme();
  const [sectionExpanded, setSectionExpanded] = useState(initialExpanded);
  const [openFieldKey, setOpenFieldKey] = useState<keyof JournalReflections | null>(null);

  // Count filled reflections
  const filledCount = Object.values(reflections).filter(
    (val) => typeof val === 'string' && val.trim().length > 0
  ).length;

  const toggleField = (key: keyof JournalReflections) => {
    setOpenFieldKey((prev) => (prev === key ? null : key));
  };

  return (
    <JournalCard
      icon={<JournalMuhasabaHeaderBadgeIcon size={26} />}
      title="Daily Muhasaba"
      testID={testID}
      headerRight={
        <View style={styles.headerRightRow}>
          {/* 0/4 Counter Badge */}
          <View
            style={[
              styles.counterBadge,
              {
                marginEnd: 4,
                backgroundColor:
                  filledCount > 0
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
                  color: filledCount > 0 ? colors.primaryDark : colors.textSecondary,
                  fontWeight: '700',
                  fontSize: 11,
                },
              ]}
            >
              {filledCount}/4
            </Text>
          </View>

          {/* Circular collapse toggle */}
          <SoftCircleButton
            onPress={() => setSectionExpanded((prev) => !prev)}
            size={32}
            icon={sectionExpanded ? 'chevron-up' : 'chevron-down'}
            iconSize={16}
            accessibilityLabel={`Daily Muhasaba section. Currently ${sectionExpanded ? 'expanded' : 'collapsed'}. ${filledCount} of 4 answered.`}
            testID="reflection-section-toggle"
          />
        </View>
      }
    >
      {sectionExpanded && (
        <View style={styles.cardsContainer} testID="reflection-section-content">
          <ReflectionCard
            fieldKey="gratitude"
            label="Gratitude"
            emoji="🤲"
            iconComponent={<ReflectionGratitudeBadgeIcon size={34} />}
            subtitle="What are you grateful for today?"
            placeholder="What are you grateful for today?"
            value={reflections.gratitude}
            onChangeText={(text) => onChangeReflection('gratitude', text)}
            accentColor="#F59E0B"
            bgLight="rgba(245, 158, 11, 0.12)"
            isExpanded={openFieldKey === 'gratitude'}
            onToggle={() => toggleField('gratitude')}
          />

          <ReflectionCard
            fieldKey="wentWell"
            label="What Went Well"
            emoji="✅"
            iconComponent={<ReflectionWentWellBadgeIcon size={34} />}
            subtitle="What went well today?"
            placeholder="What went well today?"
            value={reflections.wentWell}
            onChangeText={(text) => onChangeReflection('wentWell', text)}
            accentColor="#10B981"
            bgLight="rgba(16, 185, 129, 0.12)"
            isExpanded={openFieldKey === 'wentWell'}
            onToggle={() => toggleField('wentWell')}
          />

          <ReflectionCard
            fieldKey="improvement"
            label="For Tomorrow"
            emoji="📈"
            iconComponent={<ReflectionTomorrowBadgeIcon size={34} />}
            subtitle="What could be better tomorrow?"
            placeholder="What could be better tomorrow?"
            value={reflections.improvement}
            onChangeText={(text) => onChangeReflection('improvement', text)}
            accentColor="#0EA5E9"
            bgLight="rgba(14, 165, 233, 0.12)"
            isExpanded={openFieldKey === 'improvement'}
            onToggle={() => toggleField('improvement')}
          />

          <ReflectionCard
            fieldKey="dua"
            label="Heartfelt Dua"
            emoji="🌙"
            iconComponent={<ReflectionDuaBadgeIcon size={34} />}
            subtitle="Any prayers or duas on your heart today?"
            placeholder="Any prayers or duas on your heart today?"
            value={reflections.dua}
            onChangeText={(text) => onChangeReflection('dua', text)}
            accentColor="#8B5CF6"
            bgLight="rgba(139, 92, 246, 0.12)"
            isExpanded={openFieldKey === 'dua'}
            onToggle={() => toggleField('dua')}
          />
        </View>
      )}
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsContainer: {
    width: '100%',
    paddingTop: 4,
  },
});
