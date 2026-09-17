import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import type { UpcomingTaskItem } from '@/services/CalendarMonthOrchestrator';
import { Icon } from '@/components/common/Icon';

export interface UpcomingSectionProps {
  upcomingTasks: UpcomingTaskItem[];
  hasMoreUpcoming: boolean;
  testID?: string;
}

export function UpcomingSection({
  upcomingTasks,
  hasMoreUpcoming,
  testID = 'upcoming-section',
}: UpcomingSectionProps) {
  const { colors, spacing, typography, radii, shadows } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]} testID={testID}>
      {/* Section Header */}
      <View style={[styles.headerRow, { marginBottom: spacing.md }]}>
        <View style={styles.titleWithIcon}>
          <Icon name="calendar" size={20} color={colors.primary} style={{ marginRight: spacing.xs }} />
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
            {upcomingTasks.length}
          </Text>
        </View>
      </View>

      {/* Task Cards List */}
      {upcomingTasks.length === 0 ? (
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
            No upcoming tasks for the remainder of this month
          </Text>
        </View>
      ) : (
        <View style={styles.tasksList}>
          {upcomingTasks.map(item => {
            const dateDt = DateTime.fromISO(item.planningDayKey);
            const dateBadgeText = dateDt.isValid ? dateDt.toFormat('MMM d') : item.planningDayKey;

            return (
              <View
                key={item.occurrenceId}
                style={[
                  styles.taskCard,
                  shadows.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.card,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}
                testID={`upcoming-item-${item.occurrenceId}`}
              >
                <View style={styles.cardHeaderRow}>
                  {/* Date badge */}
                  <View
                    style={[
                      styles.dateBadge,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radii.sm,
                        paddingHorizontal: spacing.xs,
                        paddingVertical: 2,
                      },
                    ]}
                  >
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                      {dateBadgeText}
                    </Text>
                  </View>

                  {/* Schedule label */}
                  {item.scheduleLabel ? (
                    <View style={styles.scheduleInfo}>
                      <Icon name="clock" size={12} color={colors.textTertiary} style={{ marginRight: 4 }} />
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {item.scheduleLabel}
                      </Text>
                    </View>
                  ) : null}

                  {/* Important Priority Badge */}
                  {item.priority === 'IMPORTANT' && (
                    <View
                      style={[
                        styles.importantBadge,
                        {
                          backgroundColor: colors.danger + '1A',
                          borderColor: colors.danger,
                          borderRadius: radii.pill,
                          paddingHorizontal: spacing.xs,
                        },
                      ]}
                    >
                      <Text style={[typography.caption, { color: colors.danger, fontWeight: '700', fontSize: 10 }]}>
                        IMPORTANT
                      </Text>
                    </View>
                  )}
                </View>

                {/* Title */}
                <Text
                  style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '600', marginTop: spacing.xs }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
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
  tasksList: {
    width: '100%',
  },
  taskCard: {
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  importantBadge: {
    borderWidth: 1,
  },
  moreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});