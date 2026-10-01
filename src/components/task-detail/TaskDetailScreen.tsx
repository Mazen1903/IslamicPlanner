import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { TaskCategoryIcon } from '@/components/task/TaskCategoryIcon';
import { getIconIdFromTags, detectTaskIcon } from '@/constants/taskIcons';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';

// Specialized icon image assets for Task Details screen
const TASK_DETAIL_ICONS = {
  subtasks: require('../../../assets/icons/task_details/Subtasks.png') as ImageSourcePropType,
  notes: require('../../../assets/icons/task_details/Notes.png') as ImageSourcePropType,
  dateDetail: require('../../../assets/icons/task_details/Date.png') as ImageSourcePropType,
  pencil: require('../../../assets/icons/task_details/pencil.png') as ImageSourcePropType,

  anytimeToday: require('../../../assets/icons/task/anytime_today.png') as ImageSourcePropType,
  date: require('../../../assets/icons/task/date.png') as ImageSourcePropType,
  daily: require('../../../assets/icons/task/doesnt_repeat.png') as ImageSourcePropType,
  exactTime: require('../../../assets/icons/task/exact_time.png') as ImageSourcePropType,
  relativePrayer: require('../../../assets/icons/task/relative_prayer.png') as ImageSourcePropType,
  prayerWindow: require('../../../assets/icons/task/prayer_window.png') as ImageSourcePropType,
  time: require('../../../assets/icons/task/time.png') as ImageSourcePropType,
  optPriority: require('../../../assets/icons/task/opt_priority.png') as ImageSourcePropType,
  optDuration: require('../../../assets/icons/task/opt_duration.png') as ImageSourcePropType,
};

export interface TaskDetailScreenProps {
  definition: TaskDefinition;
  occurrence: TaskOccurrence | null;
  onEditFull: () => void;
  onDelete: (scope?: 'THIS_OCCURRENCE' | 'ALL_OCCURRENCES') => void;
  onBack: () => void;
  onToggleSubtask?: (occurrenceId: string, subtaskId: string) => Promise<void>;
  onAddSubtask?: (title: string) => Promise<void>;
  onUpdateNotes?: (notes: string) => Promise<void>;
}

export function TaskDetailScreen({
  definition,
  occurrence,
  onEditFull,
  onDelete,
  onBack,
  onToggleSubtask,
}: TaskDetailScreenProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();

  // Subtasks state
  const [completedSubtaskIds, setCompletedSubtaskIds] = useState<string[]>(
    occurrence?.overrideData?.completedSubtaskIds ?? []
  );
  const subtasksList = definition.subtasks ?? [];

  // Notes state
  const notes =
    occurrence?.overrideData?.notes !== undefined
      ? occurrence.overrideData.notes ?? ''
      : definition.notes ?? '';

  // Resolve icon and effective title
  const iconId = getIconIdFromTags(definition.tags) || detectTaskIcon(definition.title);
  const effectiveTitle = occurrence?.overrideData?.title || definition.title;

  const isCompleted = occurrence?.status === 'COMPLETED';
  const isMissed = occurrence?.status === 'MISSED';

  // Schedule summary
  const scheduleSummary = useMemo(() => {
    switch (definition.scheduleType) {
      case 'EXACT_TIME': {
        const time = (definition.scheduleData as any)?.localTime;
        return time ? `Exact · ${time}` : 'Exact Time';
      }
      case 'PRAYER_RELATIVE': {
        const data = definition.scheduleData as any;
        const prayer = data?.anchorPrayer || data?.prayer || 'Prayer';
        const offset = data?.offsetMinutes ?? 0;
        return offset === 0 ? `At ${prayer}` : `${offset}m after ${prayer}`;
      }
      case 'PRAYER_WINDOW': {
        const data = definition.scheduleData as any;
        return `Between ${data?.startPrayer || 'Prayer'} & ${data?.endPrayer || 'Prayer'}`;
      }
      case 'ANYTIME_TODAY':
      default:
        return 'Anytime Today';
    }
  }, [definition.scheduleType, definition.scheduleData]);

  // Schedule mode icon source
  const scheduleModeIconSource = useMemo(() => {
    switch (definition.scheduleType) {
      case 'EXACT_TIME':
        return TASK_DETAIL_ICONS.exactTime;
      case 'PRAYER_RELATIVE':
        return TASK_DETAIL_ICONS.relativePrayer;
      case 'PRAYER_WINDOW':
        return TASK_DETAIL_ICONS.prayerWindow;
      case 'ANYTIME_TODAY':
      default:
        return TASK_DETAIL_ICONS.anytimeToday;
    }
  }, [definition.scheduleType]);

  // Formatted date string
  const dateDisplay = useMemo(() => {
    const rawDate = occurrence?.localDate ?? definition.startDate;
    if (!rawDate) return null;
    const dt = DateTime.fromISO(rawDate);
    if (!dt.isValid) return rawDate;
    return dt.toFormat('EEE, MMM d, yyyy');
  }, [occurrence?.localDate, definition.startDate]);

  // Recurrence summary
  const recurrenceDisplay = useMemo(() => {
    if (definition.hijriRecurrence) {
      return 'Hijri Recurring';
    }
    if (definition.recurrenceRule) {
      const rule = definition.recurrenceRule.toUpperCase();
      if (rule.includes('DAILY')) return 'Daily';
      if (rule.includes('WEEKLY')) return 'Weekly';
      if (rule.includes('MONTHLY')) return 'Monthly';
      if (rule.includes('YEARLY')) return 'Yearly';
      return 'Recurring';
    }
    return 'One-time';
  }, [definition.recurrenceRule, definition.hijriRecurrence]);

  const handleToggleSubtask = async (subtaskId: string) => {
    const isChecked = completedSubtaskIds.includes(subtaskId);
    const nextCompleted = isChecked
      ? completedSubtaskIds.filter(id => id !== subtaskId)
      : [...completedSubtaskIds, subtaskId];

    setCompletedSubtaskIds(nextCompleted);

    if (occurrence && onToggleSubtask) {
      try {
        await onToggleSubtask(occurrence.id, subtaskId);
      } catch (err) {
        // Revert on error
        setCompletedSubtaskIds(completedSubtaskIds);
      }
    }
  };
  const handleDeletePress = () => {
    const isRecurring = Boolean(definition.recurrenceRule || definition.hijriRecurrence);
    if (isRecurring) {
      Alert.alert(
        'Delete Recurring Task',
        'Would you like to delete only this occurrence, or delete all future occurrences of this recurring task?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'This Occurrence Only',
            style: 'destructive',
            onPress: () => onDelete('THIS_OCCURRENCE'),
          },
          {
            text: 'All Occurrences',
            style: 'destructive',
            onPress: () => onDelete('ALL_OCCURRENCES'),
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete Task',
        'Are you sure you want to delete this task? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete('ALL_OCCURRENCES') },
        ]
      );
    }
  };

  const completedCount = subtasksList.filter(s => completedSubtaskIds.includes(s.id)).length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
      testID="task-detail-screen"
    >
      {/* ── 1. Top Navigation Bar ── */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="task-detail-back-button"
          style={({ pressed }) => [
            styles.headerButton,
            {
              backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
              borderRadius: radii.pill,
            },
          ]}
        >
          <Icon name="arrow-left" size={24} color={colors.textPrimary} decorative />
        </Pressable>

        <Text style={[typography.headlineLarge, styles.headerTitle, { color: colors.textPrimary }]}>
          Task Details
        </Text>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
      >
        {/* ── 2. Hero Title & Status Card ── */}
        <View
          style={[
            styles.card,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.heroHeaderRow}>
            <View
              style={[
                styles.heroIconBadge,
                {
                  backgroundColor: colors.primaryLight,
                  borderRadius: 20,
                },
              ]}
            >
              <TaskCategoryIcon iconId={iconId} size={42} />
            </View>

            <View style={styles.heroTitleContainer}>
              <Text
                style={[
                  typography.headlineLarge,
                  styles.heroTitleText,
                  {
                    color: isCompleted ? colors.textMuted : colors.textPrimary,
                    textDecorationLine: isCompleted ? 'line-through' : 'none',
                  },
                ]}
              >
                {effectiveTitle}
              </Text>

              {isCompleted ? (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: colors.completed + '1A',
                      borderColor: colors.completed,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Icon name="check" size={14} color={colors.completed} decorative style={{ marginRight: 4 }} />
                  <Text style={[typography.caption, { color: colors.completed, fontWeight: '700' }]}>
                    Completed
                  </Text>
                </View>
              ) : isMissed ? (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: colors.warning + '1A',
                      borderColor: colors.warning,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.warning, fontWeight: '700' }]}>
                    Missed
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Metadata Badges Carousel / Row */}
          <View style={styles.badgesRow}>
            {/* Schedule Mode badge with Anytime Today / schedule icon */}
            <View
              style={[
                styles.pillBadge,
                { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill },
              ]}
            >
              <Image
                source={scheduleModeIconSource}
                style={{ width: 24, height: 24, marginRight: 6 }}
                resizeMode="contain"
              />
              <Text style={[typography.caption, styles.badgeText, { color: colors.textSecondary }]}>
                {scheduleSummary}
              </Text>
            </View>

            {/* Date badge with Date icon */}
            {dateDisplay ? (
              <View
                style={[
                  styles.pillBadge,
                  { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill },
                ]}
              >
                <Image
                  source={TASK_DETAIL_ICONS.dateDetail}
                  style={{ width: 24, height: 24, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text style={[typography.caption, styles.badgeText, { color: colors.textSecondary }]}>
                  {dateDisplay}
                </Text>
              </View>
            ) : null}

            {/* Recurrence badge with Daily / Repeat icon */}
            {Boolean(definition.recurrenceRule || definition.hijriRecurrence) && (
              <View
                style={[
                  styles.pillBadge,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Image
                  source={TASK_DETAIL_ICONS.daily}
                  style={{ width: 24, height: 24, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text style={[typography.caption, styles.badgeText, { color: colors.textSecondary }]}>
                  {recurrenceDisplay}
                </Text>
              </View>
            )}

            {/* Priority flag badge */}
            {definition.priority === 'IMPORTANT' && (
              <View
                style={[
                  styles.pillBadge,
                  {
                    backgroundColor: '#fee2e2',
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Image
                  source={TASK_DETAIL_ICONS.optPriority}
                  style={{ width: 24, height: 24, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text style={[typography.caption, styles.badgeText, { color: colors.danger, fontWeight: '700' }]}>
                  Important
                </Text>
              </View>
            )}

            {/* Estimated Duration badge */}
            {definition.estimatedMinutes ? (
              <View
                style={[
                  styles.pillBadge,
                  { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill },
                ]}
              >
                <Image
                  source={TASK_DETAIL_ICONS.optDuration}
                  style={{ width: 24, height: 24, marginRight: 6 }}
                  resizeMode="contain"
                />
                <Text style={[typography.caption, styles.badgeText, { color: colors.textSecondary }]}>
                  {definition.estimatedMinutes}m
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── 3. Subtasks Checklist Card (Only shown if subtasks exist) ── */}
        {subtasksList.length > 0 && (
          <View
            style={[
              styles.card,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Image
                  source={TASK_DETAIL_ICONS.subtasks}
                  style={{ width: 36, height: 36, marginRight: 10 }}
                  resizeMode="contain"
                />
                <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary }]}>
                  Subtasks
                </Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.pill }]}>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: 13 }]}>
                  {completedCount} of {subtasksList.length} done
                </Text>
              </View>
            </View>

            {/* Subtasks items */}
            <View style={styles.subtasksListContainer}>
              {subtasksList.map(item => {
                const isChecked = completedSubtaskIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleToggleSubtask(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}
                    accessibilityLabel={item.title}
                    style={({ pressed }) => [
                      styles.subtaskRow,
                      {
                        borderBottomColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.checkboxBox,
                        {
                          borderColor: isChecked ? colors.primary : colors.border,
                          backgroundColor: isChecked ? colors.primary : 'transparent',
                          borderRadius: 7,
                          width: 26,
                          height: 26,
                        },
                      ]}
                    >
                      {isChecked && <Icon name="check" size={16} color={colors.textOnPrimary} decorative />}
                    </View>
                    <Text
                      style={[
                        typography.bodyLarge,
                        styles.subtaskText,
                        {
                          color: isChecked ? colors.textMuted : colors.textPrimary,
                          textDecorationLine: isChecked ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 4. Notes Card (Only shown if notes exist) ── */}
        {Boolean(notes && notes.trim()) && (
          <View
            style={[
              styles.card,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Image
                  source={TASK_DETAIL_ICONS.notes}
                  style={{ width: 36, height: 36, marginRight: 10 }}
                  resizeMode="contain"
                />
                <Text style={[typography.headlineMedium, styles.sectionTitle, { color: colors.textPrimary }]}>
                  Notes
                </Text>
              </View>
            </View>

            <Text
              style={[
                typography.bodyLarge,
                styles.notesContent,
                {
                  color: colors.textPrimary,
                  marginTop: spacing.xs,
                },
              ]}
            >
              {notes.trim()}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── 5. Fixed Bottom Actions Bar: Delete (Left, Red) & Edit (Right, Green) ── */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleDeletePress}
          accessibilityRole="button"
          accessibilityLabel="Delete task"
          testID="task-detail-delete-button"
          style={({ pressed }) => [
            styles.actionButton,
            styles.deleteButton,
            {
              backgroundColor: isDark ? '#DC2626' : '#EF4444',
              borderRadius: radii.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Icon name="trash" size={18} color="#FFFFFF" decorative style={{ marginRight: 6 }} />
          <Text style={[typography.labelLarge, styles.actionButtonText, { color: '#FFFFFF' }]}>
            Delete Task
          </Text>
        </Pressable>

        <Pressable
          onPress={onEditFull}
          accessibilityRole="button"
          accessibilityLabel="Edit full task"
          testID="task-detail-edit-button"
          style={({ pressed }) => [
            styles.actionButton,
            styles.editButton,
            {
              backgroundColor: isDark ? '#16A34A' : '#15803D',
              borderRadius: radii.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Icon name="edit" size={18} color="#FFFFFF" decorative style={{ marginRight: 6 }} />
          <Text style={[typography.labelLarge, styles.actionButtonText, { color: '#FFFFFF' }]}>
            Edit Full Task
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 44,
    height: 44,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconBadge: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleContainer: {
    flex: 1,
  },
  heroTitleText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontWeight: '600',
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subtasksListContainer: {
    marginTop: 4,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkboxBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  subtaskText: {
    flex: 1,
  },
  notesContent: {
    lineHeight: 24,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  deleteButton: {},
  editButton: {},
  actionButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
