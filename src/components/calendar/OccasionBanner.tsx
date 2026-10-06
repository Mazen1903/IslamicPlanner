import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { Occasion, OccasionTint } from '@/domain/calendar/IslamicOccasions';
import { useAddTaskModalStore } from '@/stores/useAddTaskModalStore';

export interface OccasionBannerProps {
  occasions: Occasion[];
  selectedDate: string; // YYYY-MM-DD
  testID?: string;
}

export function getOccasionPalette(tint: OccasionTint, isDark: boolean) {
  switch (tint) {
    case 'gold':
      return {
        bg: isDark ? 'rgba(234, 179, 8, 0.14)' : 'rgba(234, 179, 8, 0.10)',
        border: isDark ? 'rgba(234, 179, 8, 0.32)' : 'rgba(202, 138, 4, 0.22)',
        text: isDark ? '#FACC15' : '#92400E',
        icon: isDark ? '#FACC15' : '#D97706',
        badgeBg: isDark ? 'rgba(234, 179, 8, 0.22)' : 'rgba(234, 179, 8, 0.15)',
      };
    case 'teal':
      return {
        bg: isDark ? 'rgba(20, 184, 166, 0.14)' : 'rgba(20, 184, 166, 0.10)',
        border: isDark ? 'rgba(20, 184, 166, 0.32)' : 'rgba(13, 148, 136, 0.22)',
        text: isDark ? '#2DD4BF' : '#0F766E',
        icon: isDark ? '#2DD4BF' : '#0D9488',
        badgeBg: isDark ? 'rgba(20, 184, 166, 0.22)' : 'rgba(20, 184, 166, 0.15)',
      };
    case 'green':
      return {
        bg: isDark ? 'rgba(34, 197, 94, 0.14)' : 'rgba(34, 197, 94, 0.10)',
        border: isDark ? 'rgba(34, 197, 94, 0.32)' : 'rgba(22, 163, 74, 0.22)',
        text: isDark ? '#4ADE80' : '#166534',
        icon: isDark ? '#4ADE80' : '#16A34A',
        badgeBg: isDark ? 'rgba(34, 197, 94, 0.22)' : 'rgba(34, 197, 94, 0.15)',
      };
    case 'indigo':
      return {
        bg: isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.10)',
        border: isDark ? 'rgba(99, 102, 241, 0.32)' : 'rgba(79, 70, 229, 0.22)',
        text: isDark ? '#A5B4FC' : '#3730A3',
        icon: isDark ? '#A5B4FC' : '#4F46E5',
        badgeBg: isDark ? 'rgba(99, 102, 241, 0.22)' : 'rgba(99, 102, 241, 0.15)',
      };
    case 'rose':
    default:
      return {
        bg: isDark ? 'rgba(244, 63, 94, 0.14)' : 'rgba(244, 63, 94, 0.10)',
        border: isDark ? 'rgba(244, 63, 94, 0.32)' : 'rgba(225, 29, 72, 0.22)',
        text: isDark ? '#FB7185' : '#9F1239',
        icon: isDark ? '#FB7185' : '#E11D48',
        badgeBg: isDark ? 'rgba(244, 63, 94, 0.22)' : 'rgba(244, 63, 94, 0.15)',
      };
  }
}

export function OccasionBanner({ occasions, selectedDate, testID }: OccasionBannerProps) {
  const { colors, isDark, radii, typography, spacing } = useTheme();
  const openModal = useAddTaskModalStore(s => s.openModal);

  if (!occasions || occasions.length === 0) {
    return null;
  }

  const civilToday = DateTime.now().toISODate()!;
  const isFutureOrToday = selectedDate >= civilToday;

  return (
    <View testID={testID ?? 'occasion-banner-container'} style={styles.container}>
      {occasions.map((occasion) => {
        const palette = getOccasionPalette(occasion.tint, isDark);
        const hasSuggestion = Boolean(occasion.suggestedTaskTitle);

        return (
          <View
            key={occasion.id}
            testID={`occasion-card-${occasion.id}`}
            style={[
              styles.card,
              {
                backgroundColor: palette.bg,
                borderColor: palette.border,
                borderRadius: radii.md,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.headerRow}>
              {/* Squircle Badge Icon */}
              <View
                style={[
                  styles.iconSquircle,
                  {
                    backgroundColor: palette.badgeBg,
                    borderRadius: radii.sm,
                  },
                ]}
              >
                <Icon
                  name={occasion.group === 'SUNNAH' ? 'star' : 'calendar-star'}
                  size="sm"
                  color={palette.icon}
                />
              </View>

              {/* Title and Tier/Type */}
              <View style={styles.titleColumn}>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.textPrimary, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {occasion.name}
                  </Text>
                  {occasion.tier === 'MAJOR' && (
                    <View
                      style={[
                        styles.tierPill,
                        {
                          backgroundColor: palette.badgeBg,
                          borderRadius: radii.pill,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: palette.text, fontSize: 10, fontWeight: '700' },
                        ]}
                      >
                        Special
                      </Text>
                    </View>
                  )}
                </View>

                {occasion.description ? (
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textSecondary, marginTop: 2 },
                    ]}
                    numberOfLines={2}
                  >
                    {occasion.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Theological Fasting Info / Suggested Action */}
            <View style={styles.footerRow}>
              {/* Fasting Badge */}
              {!occasion.fastingAllowed ? (
                <View
                  style={[
                    styles.fastingPill,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isDark ? '#FCA5A5' : '#B91C1C',
                        fontWeight: '600',
                        fontSize: 11,
                      },
                    ]}
                  >
                    Fasting Prohibited (Haram)
                  </Text>
                </View>
              ) : occasion.isFastingDay && occasion.fastingAllowed ? (
                <View
                  style={[
                    styles.fastingPill,
                    {
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isDark ? '#86EFAC' : '#15803D',
                        fontWeight: '600',
                        fontSize: 11,
                      },
                    ]}
                  >
                    {occasion.id === 'RAMADAN_START' ? 'Obligatory Fast' : 'Sunnah Fast'}
                  </Text>
                </View>
              ) : null}

              {/* 1-Tap Add to Plan Button */}
              {isFutureOrToday && hasSuggestion && (
                <Pressable
                  onPress={() => {
                    openModal(
                      undefined,
                      undefined,
                      selectedDate,
                      occasion.suggestedTaskTitle
                    );
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: pressed ? palette.badgeBg : 'transparent',
                      borderColor: palette.border,
                      borderRadius: radii.pill,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Add task for ${occasion.name}: ${occasion.suggestedTaskTitle}`}
                  testID={`add-occasion-task-${occasion.id}`}
                >
                  <Icon name="plus" size="xs" color={palette.icon} />
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: palette.text,
                        fontWeight: '700',
                        marginStart: 4,
                      },
                    ]}
                  >
                    Add to my plan
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSquircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  fastingPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginStart: 'auto',
  },
});
