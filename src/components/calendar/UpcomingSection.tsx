import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import type {
  UpcomingTaskItem,
  UpcomingOccasionItem,
} from '@/services/CalendarMonthOrchestrator';
import { Icon } from '@/components/common/Icon';
import { getOccasionPalette } from './OccasionBanner';
import { useAddTaskModalStore } from '@/stores/useAddTaskModalStore';

export interface UpcomingSectionProps {
  upcomingTasks: UpcomingTaskItem[];
  upcomingOccasions?: UpcomingOccasionItem[];
  hasMoreUpcoming: boolean;
  testID?: string;
}

type UpcomingListItem =
  | { type: 'TASK'; date: string; task: UpcomingTaskItem }
  | { type: 'OCCASION'; date: string; occasion: UpcomingOccasionItem };

export function UpcomingSection({
  upcomingTasks,
  upcomingOccasions = [],
  hasMoreUpcoming,
  testID = 'upcoming-section',
}: UpcomingSectionProps) {
  const { colors, spacing, typography, radii, shadows, isDark } = useTheme();
  const openModal = useAddTaskModalStore(s => s.openModal);

  // Combine and sort chronologically by date
  const combinedItems: UpcomingListItem[] = [
    ...upcomingTasks.map(t => ({
      type: 'TASK' as const,
      date: t.planningDayKey,
      task: t,
    })),
    ...upcomingOccasions.map(o => ({
      type: 'OCCASION' as const,
      date: o.date,
      occasion: o,
    })),
  ].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // Occasions show before tasks on the same date
    if (a.type !== b.type) {
      return a.type === 'OCCASION' ? -1 : 1;
    }
    return 0;
  });

  const totalCount = combinedItems.length;

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]} testID={testID}>
      {/* Section Header */}
      <View style={[styles.headerRow, { marginBottom: spacing.md }]}>
        <View style={styles.titleWithIcon}>
          <Icon name="calendar" size={20} color={colors.primary} style={{ marginEnd: spacing.xs }} decorative />
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
            Upcoming This Month
          </Text>
        </View>
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: colors.primaryLight,
              borderRadius: radii.pill,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
            },
          ]}
        >
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
            {totalCount}
          </Text>
        </View>
      </View>

      {/* List Content */}
      {totalCount === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: radii.card,
              padding: spacing.lg,
            },
          ]}
        >
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
            No upcoming tasks or occasions for the remainder of this month
          </Text>
        </View>
      ) : (
        <View style={styles.itemsList}>
          {combinedItems.map((item, index) => {
            if (item.type === 'OCCASION') {
              const occ = item.occasion;
              const palette = getOccasionPalette(occ.tint, isDark);
              const dateDt = DateTime.fromISO(occ.date);
              const gregorianBadge = dateDt.isValid ? dateDt.toFormat('MMM d') : occ.date;

              return (
                <View
                  key={`occ-${occ.id}-${index}`}
                  style={[
                    styles.card,
                    shadows.card,
                    {
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                      borderRadius: radii.card,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                  testID={`upcoming-occasion-${occ.id}`}
                >
                  <View style={styles.cardHeaderRow}>
                    {/* 40x40 squircle icon badge */}
                    <View
                      style={[
                        styles.squircleBadge,
                        {
                          backgroundColor: palette.badgeBg,
                          borderRadius: radii.md,
                        },
                      ]}
                    >
                      <Icon name="calendar-star" size="sm" color={palette.icon} />
                    </View>

                    <View style={styles.headerMeta}>
                      <View style={styles.badgePillsRow}>
                        {/* Gregorian Date */}
                        <View
                          style={[
                            styles.pill,
                            {
                              backgroundColor: palette.badgeBg,
                              borderRadius: radii.pill,
                            },
                          ]}
                        >
                          <Text style={[typography.caption, { color: palette.text, fontWeight: '700', fontSize: 11 }]}>
                            {gregorianBadge}
                          </Text>
                        </View>

                        {/* Hijri Date */}
                        {occ.hijriFormatted ? (
                          <View
                            style={[
                              styles.pill,
                              {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                borderRadius: radii.pill,
                              },
                            ]}
                          >
                            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                              {occ.hijriFormatted}
                            </Text>
                          </View>
                        ) : null}

                        {/* Occasion Label */}
                        <View
                          style={[
                            styles.pill,
                            {
                              backgroundColor: palette.badgeBg,
                              borderRadius: radii.pill,
                            },
                          ]}
                        >
                          <Text style={[typography.caption, { color: palette.text, fontWeight: '700', fontSize: 10 }]}>
                            Special
                          </Text>
                        </View>
                      </View>

                      {/* Occasion Name */}
                      <Text
                        style={[
                          typography.bodyLarge,
                          { color: colors.textPrimary, fontWeight: '700', marginTop: 4 },
                        ]}
                        numberOfLines={2}
                      >
                        {occ.name}
                      </Text>
                    </View>
                  </View>

                  {/* Description & 1-Tap Add to Plan */}
                  {occ.description || occ.suggestedTaskTitle ? (
                    <View style={styles.occasionFooter}>
                      {occ.description ? (
                        <Text
                          style={[
                            typography.caption,
                            { color: colors.textSecondary, flex: 1, marginEnd: 8 },
                          ]}
                          numberOfLines={2}
                        >
                          {occ.description}
                        </Text>
                      ) : (
                        <View style={{ flex: 1 }} />
                      )}

                      {occ.suggestedTaskTitle && (
                        <Pressable
                          onPress={() => {
                            openModal(undefined, undefined, occ.date, occ.suggestedTaskTitle);
                          }}
                          style={({ pressed }) => [
                            styles.planButton,
                            {
                              backgroundColor: pressed ? palette.badgeBg : 'transparent',
                              borderColor: palette.border,
                              borderRadius: radii.pill,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Add task for ${occ.name}: ${occ.suggestedTaskTitle}`}
                          testID={`upcoming-add-task-${occ.id}`}
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
                            Plan
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            }

            // Task item
            const task = item.task;
            const dateDt = DateTime.fromISO(task.planningDayKey);
            const dateBadgeText = dateDt.isValid ? dateDt.toFormat('MMM d') : task.planningDayKey;

            return (
              <View
                key={task.occurrenceId}
                style={[
                  styles.card,
                  shadows.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.card,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}
                testID={`upcoming-item-${task.occurrenceId}`}
              >
                <View style={styles.cardHeaderRow}>
                  {/* 40x40 squircle icon badge */}
                  <View
                    style={[
                      styles.squircleBadge,
                      {
                        backgroundColor: colors.primaryLight,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <Icon name="calendar" size="sm" color={colors.primary} />
                  </View>

                  <View style={styles.headerMeta}>
                    <View style={styles.badgePillsRow}>
                      {/* Date badge */}
                      <View
                        style={[
                          styles.pill,
                          {
                            backgroundColor: colors.surfaceSecondary,
                            borderRadius: radii.pill,
                          },
                        ]}
                      >
                        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', fontSize: 11 }]}>
                          {dateBadgeText}
                        </Text>
                      </View>

                      {/* Schedule label */}
                      {task.scheduleLabel ? (
                        <View style={styles.scheduleInfo}>
                          <Icon name="clock" size={11} color={colors.textTertiary} style={{ marginEnd: 4 }} decorative />
                          <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                            {task.scheduleLabel}
                          </Text>
                        </View>
                      ) : null}

                      {/* Important Priority Badge */}
                      {task.priority === 'IMPORTANT' && (
                        <View
                          style={[
                            styles.importantBadge,
                            {
                              backgroundColor: colors.danger + '1A',
                              borderColor: colors.danger,
                              borderRadius: radii.pill,
                            },
                          ]}
                        >
                          <Text style={[typography.caption, { color: colors.danger, fontWeight: '700', fontSize: 10 }]}>
                            IMPORTANT
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Task Title */}
                    <Text
                      style={[
                        typography.bodyLarge,
                        { color: colors.textPrimary, fontWeight: '600', marginTop: 4 },
                      ]}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* More items indicator (capped at 50) */}
          {hasMoreUpcoming && (
            <View
              style={[
                styles.moreContainer,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  marginTop: spacing.xs,
                },
              ]}
              testID="upcoming-more-items-indicator"
            >
              <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
                More items this month...
              </Text>
            </View>
          )}
        </View>
      )}
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
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    width: '100%',
  },
  card: {
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  squircleBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  headerMeta: {
    flex: 1,
  },
  badgePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importantBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  occasionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});