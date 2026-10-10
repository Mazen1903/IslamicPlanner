import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Vibration,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { Prayer } from '@/constants/prayers';
import type { TaskCardViewModel } from '@/services/types';
import type { ScheduleConfig } from '@/domain/task/types';
import { buildRescheduleConfig } from './rescheduleConfigBuilder';

export interface ReschedulePrayerModalProps {
  visible: boolean;
  task: TaskCardViewModel | null;
  targetPrayer: Prayer | null;
  targetPrayerTime?: string;
  onConfirm: (config: ScheduleConfig) => void;
  onEditTask?: (task: TaskCardViewModel, targetPrayer: Prayer) => void;
  onCancel: () => void;
}

export function ReschedulePrayerModal({
  visible,
  task,
  targetPrayer,
  targetPrayerTime = '',
  onConfirm,
  onEditTask,
  onCancel,
}: ReschedulePrayerModalProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const [offsetMinutes, setOffsetMinutes] = useState<number>(0);

  // Initialize offset when opening
  useEffect(() => {
    if (visible) {
      setOffsetMinutes(0);
    }
  }, [visible, targetPrayer]);

  const prayerCapitalized = useMemo(() => {
    if (!targetPrayer) return '';
    return targetPrayer.charAt(0) + targetPrayer.slice(1).toLowerCase();
  }, [targetPrayer]);

  // Parse targetPrayerTime (e.g. "4:35 PM" or "16:35") into base hours and minutes
  const parsedPrayerTime = useMemo(() => {
    if (!targetPrayerTime) return { hours: 12, minutes: 0 };
    const match = targetPrayerTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return { hours: 12, minutes: 0 };
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }, [targetPrayerTime]);

  // Live formatted scheduled time reflecting offset
  const displayScheduledTime = useMemo(() => {
    if (!targetPrayerTime) return prayerCapitalized;
    const totalMinutes = parsedPrayerTime.hours * 60 + parsedPrayerTime.minutes + offsetMinutes;
    // Normalize to 24h cycle
    const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const h24 = Math.floor(normalizedMinutes / 60);
    const m = normalizedMinutes % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }, [targetPrayerTime, parsedPrayerTime, offsetMinutes, prayerCapitalized]);

  // Live relative preview label
  const liveRelativeLabel = useMemo(() => {
    if (!targetPrayer) return '';
    if (offsetMinutes === 0) {
      return `At ${prayerCapitalized}`;
    }
    const sign = offsetMinutes < 0 ? '−' : '+';
    return `${prayerCapitalized} ${sign} ${Math.abs(offsetMinutes)} min`;
  }, [targetPrayer, prayerCapitalized, offsetMinutes]);

  const handleStepOffset = useCallback((delta: number) => {
    setOffsetMinutes(prev => {
      const updated = prev + delta;
      // Clamp between -120 and +120 minutes
      return Math.min(120, Math.max(-120, updated));
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!task || !targetPrayer) return;
    try {
      Vibration.vibrate(30);
    } catch {}

    const direction = offsetMinutes < 0 ? 'BEFORE' : 'AFTER';
    const absOffset = Math.abs(offsetMinutes);

    const config = buildRescheduleConfig({
      mode: 'PRAYER_RELATIVE',
      targetPrayer,
      direction,
      offsetMinutes: absOffset,
      exactTime: '12:00',
      endPrayer: targetPrayer,
    });

    onConfirm(config);
  }, [task, targetPrayer, offsetMinutes, onConfirm]);

  if (!visible || !task || !targetPrayer) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
      testID="reschedule-modal-root"
    >
      <View style={styles.modalRoot}>
        {/* Dimmed solid overlay backdrop */}
        <Pressable
          style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss reschedule backdrop"
        />

        {/* Clean, opaque dialog card */}
        <View
          accessibilityViewIsModal={true}
          style={[
            styles.dialogContainer,
            shadows.elevated,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
              padding: spacing.lg,
            },
          ]}
          testID="reschedule-prayer-modal"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Text
                accessibilityRole="header"
                style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 18 }]}
              >
                Reschedule Task
              </Text>
              <Text
                style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}
                numberOfLines={1}
              >
                {task.title}
              </Text>
            </View>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel reschedule"
              style={[styles.closeButton, { minHeight: touchTargets.min, minWidth: touchTargets.min }]}
              testID="reschedule-modal-close"
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Time Transition Showcase Card */}
          <View
            style={[
              styles.transitionCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                marginVertical: spacing.md,
              },
            ]}
            testID="reschedule-transition-card"
          >
            <View style={styles.prayerBadge}>
              <Text style={[typography.caption, { color: colors.textTertiary, textTransform: 'uppercase' }]}>
                Current
              </Text>
              <Text style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                {task.scheduleLabel || 'Anytime'}
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Icon name="chevron-right" size={20} color={colors.primary} />
            </View>

            <View style={styles.prayerBadge}>
              <Text style={[typography.caption, { color: colors.primary, textTransform: 'uppercase', fontWeight: '700' }]}>
                New Prayer
              </Text>
              <Text style={[typography.bodyLarge, { color: colors.primary, fontWeight: '700' }]}>
                {prayerCapitalized}
              </Text>
              {targetPrayerTime ? (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {targetPrayerTime}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Time Stepper Adjustment Card */}
          <View
            style={[
              styles.timeAdjustmentCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radii.md,
                padding: spacing.md,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
              SCHEDULED TIME
            </Text>
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => handleStepOffset(-5)}
                accessibilityRole="button"
                accessibilityLabel="Subtract 5 minutes"
                testID="reschedule-offset-minus"
                style={({ pressed }) => [
                  styles.stepperBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[typography.labelLarge, { color: colors.primary, fontWeight: '700' }]}>
                  −5m
                </Text>
              </Pressable>

              <View
                style={[
                  styles.timeDisplayBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {displayScheduledTime}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                  {liveRelativeLabel}
                </Text>
              </View>

              <Pressable
                onPress={() => handleStepOffset(5)}
                accessibilityRole="button"
                accessibilityLabel="Add 5 minutes"
                testID="reschedule-offset-plus"
                style={({ pressed }) => [
                  styles.stepperBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[typography.labelLarge, { color: colors.primary, fontWeight: '700' }]}>
                  +5m
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionButtonsCol}>
            <Pressable
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm reschedule"
              testID="reschedule-confirm-button"
              style={({ pressed }) => [
                styles.confirmButton,
                {
                  backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                  borderRadius: radii.md,
                  minHeight: touchTargets.min,
                  paddingVertical: 12,
                },
              ]}
            >
              <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700', textAlign: 'center' }]}>
                Confirm Reschedule
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onEditTask?.(task, targetPrayer)}
              accessibilityRole="button"
              accessibilityLabel="Edit full task details"
              testID="reschedule-edit-task-button"
              style={({ pressed }) => [
                styles.editTaskButton,
                {
                  backgroundColor: pressed ? colors.primaryLight : colors.surfaceSecondary,
                  borderColor: colors.primary,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  minHeight: touchTargets.min,
                  paddingVertical: 10,
                  marginTop: spacing.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="pencil" size={16} color={colors.primary} style={{ marginEnd: 6 }} />
                <Text style={[typography.labelLarge, { color: colors.primary, fontWeight: '600' }]}>
                  Edit Full Task
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel reschedule"
              testID="reschedule-cancel-button"
              style={[styles.cancelButton, { minHeight: 36, marginTop: spacing.xs, alignItems: 'center', justifyContent: 'center' }]}
            >
              <Text style={[typography.labelMedium, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialogContainer: {
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flex: 1,
    marginEnd: 8,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  prayerBadge: {
    flex: 1,
  },
  arrowContainer: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeAdjustmentCard: {
    alignItems: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  stepperBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayBox: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsCol: {
    width: '100%',
  },
  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTaskButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
  },
});
