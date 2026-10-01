import React, { useState, useEffect } from 'react';
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

export interface ReschedulePrayerModalProps {
  visible: boolean;
  task: TaskCardViewModel | null;
  targetPrayer: Prayer | null;
  targetPrayerTime?: string;
  onConfirm: (config: ScheduleConfig) => void;
  onCancel: () => void;
}

type OffsetOption = 'AT_PRAYER' | 'PLUS_15' | 'EXACT_TIME';

export function ReschedulePrayerModal({
  visible,
  task,
  targetPrayer,
  targetPrayerTime = '',
  onConfirm,
  onCancel,
}: ReschedulePrayerModalProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows, isDark } = useTheme();
  const [selectedOption, setSelectedOption] = useState<OffsetOption>('AT_PRAYER');

  useEffect(() => {
    if (visible) {
      setSelectedOption('AT_PRAYER');
    }
  }, [visible]);

  if (!task || !targetPrayer) {
    return null;
  }

  const prayerCapitalized = targetPrayer.charAt(0) + targetPrayer.slice(1).toLowerCase();

  const handleConfirm = () => {
    try {
      Vibration.vibrate(30);
    } catch {}

    let config: ScheduleConfig;
    if (selectedOption === 'AT_PRAYER') {
      config = {
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: targetPrayer,
          direction: 'AFTER',
          offsetMinutes: 0,
        },
      };
    } else if (selectedOption === 'PLUS_15') {
      config = {
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: targetPrayer,
          direction: 'AFTER',
          offsetMinutes: 15,
        },
      };
    } else {
      // EXACT_TIME
      // Convert targetPrayerTime (e.g. "4:35 PM" or "16:35") to "HH:mm"
      let localTime = '12:00';
      if (targetPrayerTime) {
        const match = targetPrayerTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = match[2].padStart(2, '0');
          const ampm = match[3]?.toUpperCase();
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          localTime = `${String(hours).padStart(2, '0')}:${minutes}`;
        }
      }
      config = {
        scheduleType: 'EXACT_TIME',
        scheduleData: {
          localTime,
        },
      };
    }

    onConfirm(config);
  };

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
      testID="reschedule-modal-root"
    >
    <View style={styles.modalRoot}>
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Dismiss reschedule backdrop"
      />
      <View
        accessibilityViewIsModal={true}
        style={[
          styles.sheetContainer,
          shadows.elevated,
          {
            backgroundColor: colors.surfaceElevated ?? colors.surface,
            borderRadius: radii.xl,
            padding: spacing.xl,
          },
        ]}
        testID="reschedule-prayer-modal"
      >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Text
                accessibilityRole="header"
                style={[typography.headlineMedium, { color: colors.textPrimary }]}
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
                borderRadius: radii.lg,
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
              <Icon name="chevron-right" size={22} color={colors.primary} />
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

          {/* Placement Options */}
          <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            SCHEDULE TIME
          </Text>

          <View style={styles.optionsList}>
            {/* Option 1: At Prayer */}
            <Pressable
              onPress={() => setSelectedOption('AT_PRAYER')}
              style={[
                styles.optionRow,
                {
                  borderColor: selectedOption === 'AT_PRAYER' ? colors.primary : colors.border,
                  backgroundColor: selectedOption === 'AT_PRAYER'
                    ? colors.primaryLight
                    : colors.surfaceSecondary,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                },
              ]}
              testID="option-at-prayer"
            >
              <View style={styles.optionRadio}>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: selectedOption === 'AT_PRAYER' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {selectedOption === 'AT_PRAYER' && (
                    <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  At {prayerCapitalized}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Begins when {prayerCapitalized} enters
                </Text>
              </View>
            </Pressable>

            {/* Option 2: Prayer +15m */}
            <Pressable
              onPress={() => setSelectedOption('PLUS_15')}
              style={[
                styles.optionRow,
                {
                  borderColor: selectedOption === 'PLUS_15' ? colors.primary : colors.border,
                  backgroundColor: selectedOption === 'PLUS_15'
                    ? colors.primaryLight
                    : colors.surfaceSecondary,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                },
              ]}
              testID="option-plus-15"
            >
              <View style={styles.optionRadio}>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: selectedOption === 'PLUS_15' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {selectedOption === 'PLUS_15' && (
                    <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {prayerCapitalized} + 15 min
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Starts 15 minutes after {prayerCapitalized}
                </Text>
              </View>
            </Pressable>

            {/* Option 3: Exact Time */}
            <Pressable
              onPress={() => setSelectedOption('EXACT_TIME')}
              style={[
                styles.optionRow,
                {
                  borderColor: selectedOption === 'EXACT_TIME' ? colors.primary : colors.border,
                  backgroundColor: selectedOption === 'EXACT_TIME'
                    ? colors.primaryLight
                    : colors.surfaceSecondary,
                  borderRadius: radii.md,
                  padding: spacing.md,
                },
              ]}
              testID="option-exact-time"
            >
              <View style={styles.optionRadio}>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: selectedOption === 'EXACT_TIME' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {selectedOption === 'EXACT_TIME' && (
                    <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Exact Time {targetPrayerTime ? `(${targetPrayerTime})` : ''}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Fixed clock time
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionsRow, { marginTop: spacing.lg }]}>
            <Pressable
              onPress={onCancel}
              style={[
                styles.cancelButton,
                {
                  borderRadius: radii.pill,
                  borderColor: colors.border,
                  minHeight: touchTargets.min,
                },
              ]}
              testID="reschedule-cancel-button"
            >
              <Text style={[typography.labelLarge, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              style={[
                styles.confirmButton,
                shadows.card,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.pill,
                  minHeight: touchTargets.min,
                },
              ]}
              testID="reschedule-confirm-button"
            >
              <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                Confirm Reschedule
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
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleGroup: {
    flex: 1,
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
    alignItems: 'center',
  },
  arrowContainer: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  optionRadio: {
    marginEnd: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionTextContainer: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
