import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Vibration,
  ScrollView,
  TextInput,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { SheetSafeArea } from '@/components/layout/SheetSafeArea';
import { PRAYER_ORDER, type Prayer } from '@/constants/prayers';
import type { TaskCardViewModel } from '@/services/types';
import type { ScheduleConfig } from '@/domain/task/types';
import { buildRescheduleConfig, type RescheduleMode } from './rescheduleConfigBuilder';

export interface ReschedulePrayerModalProps {
  visible: boolean;
  task: TaskCardViewModel | null;
  targetPrayer: Prayer | null;
  targetPrayerTime?: string;
  onConfirm: (config: ScheduleConfig) => void;
  onCancel: () => void;
}

const COMMON_OFFSETS = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120];

export function ReschedulePrayerModal({
  visible,
  task,
  targetPrayer,
  targetPrayerTime = '',
  onConfirm,
  onCancel,
}: ReschedulePrayerModalProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const [mode, setMode] = useState<RescheduleMode>('PRAYER_RELATIVE');
  const [direction, setDirection] = useState<'BEFORE' | 'AFTER'>('AFTER');
  const [offsetMinutes, setOffsetMinutes] = useState<number>(0);
  const [customOffsetInput, setCustomOffsetInput] = useState<string>('0');
  const [exactTime, setExactTime] = useState<string>('12:00');
  const [endPrayer, setEndPrayer] = useState<Prayer | null>(null);

  // Initialize state whenever targetPrayer or targetPrayerTime changes
  useEffect(() => {
    if (visible && targetPrayer) {
      setMode('PRAYER_RELATIVE');
      setDirection('AFTER');
      setOffsetMinutes(0);
      setCustomOffsetInput('0');

      // Convert targetPrayerTime (e.g. "4:35 PM" or "16:35") to "HH:mm"
      let defaultTime = '12:00';
      if (targetPrayerTime) {
        const match = targetPrayerTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = match[2].padStart(2, '0');
          const ampm = match[3]?.toUpperCase();
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          defaultTime = `${String(hours).padStart(2, '0')}:${minutes}`;
        }
      }
      setExactTime(defaultTime);

      // Default end prayer for window: next prayer in cycle
      const currentIdx = PRAYER_ORDER.indexOf(targetPrayer);
      const nextPrayer = currentIdx >= 0 && currentIdx < PRAYER_ORDER.length - 1
        ? PRAYER_ORDER[currentIdx + 1]
        : 'FAJR';
      setEndPrayer(nextPrayer);
    }
  }, [visible, targetPrayer, targetPrayerTime]);

  const prayerCapitalized = useMemo(() => {
    if (!targetPrayer) return '';
    return targetPrayer.charAt(0) + targetPrayer.slice(1).toLowerCase();
  }, [targetPrayer]);

  // Available end prayers for window mode
  const availableEndPrayers = useMemo(() => {
    if (!targetPrayer) return [];
    const startIdx = PRAYER_ORDER.indexOf(targetPrayer);
    const result: { prayer: Prayer; label: string }[] = [];
    for (let i = startIdx + 1; i < PRAYER_ORDER.length; i++) {
      const p = PRAYER_ORDER[i];
      result.push({ prayer: p, label: p.charAt(0) + p.slice(1).toLowerCase() });
    }
    // Overnight window: allow next-day Fajr when start is Dhuhr, Asr, Maghrib, or Isha
    if (startIdx >= 1) {
      result.push({ prayer: 'FAJR', label: 'Fajr (+1)' });
    }
    return result;
  }, [targetPrayer]);

  const handleSelectOffset = (mins: number) => {
    setOffsetMinutes(mins);
    setCustomOffsetInput(String(mins));
  };

  const handleCustomOffsetChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomOffsetInput(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      setOffsetMinutes(Math.min(720, Math.max(0, parsed)));
    } else {
      setOffsetMinutes(0);
    }
  };

  const handleStepOffset = (delta: number) => {
    const updated = Math.min(720, Math.max(0, offsetMinutes + delta));
    setOffsetMinutes(updated);
    setCustomOffsetInput(String(updated));
  };

  const handleConfirm = () => {
    if (!task || !targetPrayer) return;
    try {
      Vibration.vibrate(30);
    } catch {}

    const config = buildRescheduleConfig({
      mode,
      targetPrayer,
      direction,
      offsetMinutes,
      exactTime,
      endPrayer: endPrayer ?? targetPrayer,
    });

    onConfirm(config);
  };

  // Live relative preview label
  const liveRelativeLabel = useMemo(() => {
    if (!targetPrayer) return '';
    if (offsetMinutes === 0) {
      return `At ${prayerCapitalized}`;
    }
    const sign = direction === 'BEFORE' ? '−' : '+';
    return `${prayerCapitalized} ${sign} ${offsetMinutes} min`;
  }, [targetPrayer, prayerCapitalized, direction, offsetMinutes]);

  const sheetBg = colors.surfaceElevated ?? colors.surface;

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
        <Pressable
          style={[styles.overlay, { backgroundColor: 'transparent' }]}
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
              backgroundColor: sheetBg,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
            },
          ]}
          testID="reschedule-prayer-modal"
        >
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={[styles.sheetScrollContent, { padding: spacing.xl }]}
            showsVerticalScrollIndicator={false}
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

            {/* Mode Segmented Chips */}
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              SCHEDULE MODE
            </Text>
            <View style={styles.modeChipsRow}>
              <Pressable
                onPress={() => setMode('PRAYER_RELATIVE')}
                style={[
                  styles.modeChip,
                  {
                    borderColor: mode === 'PRAYER_RELATIVE' ? colors.primary : colors.border,
                    backgroundColor: mode === 'PRAYER_RELATIVE' ? colors.primaryLight : colors.surfaceSecondary,
                    borderRadius: radii.pill,
                  },
                ]}
                testID="option-at-prayer"
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: mode === 'PRAYER_RELATIVE' ? colors.primaryDark : colors.textPrimary,
                      fontWeight: mode === 'PRAYER_RELATIVE' ? '700' : '500',
                    },
                  ]}
                >
                  Around Prayer
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode('EXACT_TIME')}
                style={[
                  styles.modeChip,
                  {
                    borderColor: mode === 'EXACT_TIME' ? colors.primary : colors.border,
                    backgroundColor: mode === 'EXACT_TIME' ? colors.primaryLight : colors.surfaceSecondary,
                    borderRadius: radii.pill,
                  },
                ]}
                testID="option-exact-time"
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: mode === 'EXACT_TIME' ? colors.primaryDark : colors.textPrimary,
                      fontWeight: mode === 'EXACT_TIME' ? '700' : '500',
                    },
                  ]}
                >
                  Exact Time
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode('PRAYER_WINDOW')}
                style={[
                  styles.modeChip,
                  {
                    borderColor: mode === 'PRAYER_WINDOW' ? colors.primary : colors.border,
                    backgroundColor: mode === 'PRAYER_WINDOW' ? colors.primaryLight : colors.surfaceSecondary,
                    borderRadius: radii.pill,
                  },
                ]}
                testID="option-prayer-window"
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: mode === 'PRAYER_WINDOW' ? colors.primaryDark : colors.textPrimary,
                      fontWeight: mode === 'PRAYER_WINDOW' ? '700' : '500',
                    },
                  ]}
                >
                  Window
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMode('ANYTIME_TODAY')}
                style={[
                  styles.modeChip,
                  {
                    borderColor: mode === 'ANYTIME_TODAY' ? colors.primary : colors.border,
                    backgroundColor: mode === 'ANYTIME_TODAY' ? colors.primaryLight : colors.surfaceSecondary,
                    borderRadius: radii.pill,
                  },
                ]}
                testID="option-anytime-today"
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: mode === 'ANYTIME_TODAY' ? colors.primaryDark : colors.textPrimary,
                      fontWeight: mode === 'ANYTIME_TODAY' ? '700' : '500',
                    },
                  ]}
                >
                  Anytime
                </Text>
              </Pressable>
            </View>

            {/* Mode 1: Around Prayer (Relative) */}
            {mode === 'PRAYER_RELATIVE' && (
              <View style={styles.relativeModeContainer}>
                {/* Live Relative Indicator */}
                <View
                  style={[
                    styles.liveBanner,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                      borderRadius: radii.md,
                      padding: spacing.sm,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <Text style={[typography.bodyMedium, { color: colors.primaryDark, fontWeight: '700', textAlign: 'center' }]}>
                    {liveRelativeLabel}
                  </Text>
                </View>

                {/* Direction Segment: Before | After */}
                <View style={styles.directionRow}>
                  <Pressable
                    onPress={() => setDirection('BEFORE')}
                    style={[
                      styles.directionButton,
                      {
                        backgroundColor: direction === 'BEFORE' ? colors.primary : colors.surfaceSecondary,
                        borderColor: direction === 'BEFORE' ? colors.primary : colors.border,
                        borderTopLeftRadius: radii.md,
                        borderBottomLeftRadius: radii.md,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Schedule before prayer"
                    testID="reschedule-direction-before"
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        {
                          color: direction === 'BEFORE' ? colors.textOnPrimary : colors.textPrimary,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      Before {prayerCapitalized}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setDirection('AFTER')}
                    style={[
                      styles.directionButton,
                      {
                        backgroundColor: direction === 'AFTER' ? colors.primary : colors.surfaceSecondary,
                        borderColor: direction === 'AFTER' ? colors.primary : colors.border,
                        borderTopRightRadius: radii.md,
                        borderBottomRightRadius: radii.md,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Schedule after prayer"
                    testID="reschedule-direction-after"
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        {
                          color: direction === 'AFTER' ? colors.textOnPrimary : colors.textPrimary,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      After {prayerCapitalized}
                    </Text>
                  </Pressable>
                </View>

                {/* Quick Minute Offset Chips */}
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: 6 }]}>
                  QUICK OFFSETS (MINUTES)
                </Text>
                <View style={styles.offsetChipsGrid}>
                  {COMMON_OFFSETS.map((mins) => {
                    const isSelected = offsetMinutes === mins;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => handleSelectOffset(mins)}
                        style={[
                          styles.offsetChip,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primaryLight : colors.surfaceSecondary,
                            borderRadius: radii.pill,
                          },
                        ]}
                        testID={mins === 15 ? 'option-plus-15' : undefined}
                      >
                        <Text
                          style={[
                            typography.labelSmall,
                            {
                              color: isSelected ? colors.primaryDark : colors.textPrimary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {mins === 0 ? 'Exact' : `${mins}m`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom Minutes Stepper (1-720) */}
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: 6 }]}>
                  CUSTOM OFFSET (1–720 MIN)
                </Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => handleStepOffset(-5)}
                    style={[
                      styles.stepperButton,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease offset 5 minutes"
                    testID="reschedule-stepper-minus"
                  >
                    <Icon name="minus" size={18} color={colors.textPrimary} />
                  </Pressable>

                  <View
                    style={[
                      styles.stepperInputWrapper,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <TextInput
                      value={customOffsetInput}
                      onChangeText={handleCustomOffsetChange}
                      keyboardType="number-pad"
                      maxLength={3}
                      style={[
                        typography.bodyLarge,
                        styles.stepperInput,
                        { color: colors.textPrimary, fontWeight: '700' },
                      ]}
                      testID="reschedule-custom-offset-input"
                    />
                    <Text style={[typography.caption, { color: colors.textSecondary, marginEnd: 10 }]}>min</Text>
                  </View>

                  <Pressable
                    onPress={() => handleStepOffset(5)}
                    style={[
                      styles.stepperButton,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Increase offset 5 minutes"
                    testID="reschedule-stepper-plus"
                  >
                    <Icon name="plus" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Mode 2: Exact Time */}
            {mode === 'EXACT_TIME' && (
              <View style={styles.exactModeContainer}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
                  SPECIFY EXACT TIME (24-HOUR FORMAT)
                </Text>
                <View
                  style={[
                    styles.exactTimeInputCard,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: radii.lg,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <Icon name="clock" size={24} color={colors.primary} />
                  <TextInput
                    value={exactTime}
                    onChangeText={setExactTime}
                    placeholder="HH:mm"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={5}
                    style={[
                      typography.headlineMedium,
                      styles.exactTimeInput,
                      { color: colors.textPrimary, fontWeight: '700' },
                    ]}
                    testID="reschedule-exact-time-input"
                  />
                </View>
              </View>
            )}

            {/* Mode 3: Prayer Window */}
            {mode === 'PRAYER_WINDOW' && (
              <View style={styles.windowModeContainer}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
                  CHOOSE END PRAYER (STARTS AT {targetPrayer})
                </Text>
                <View style={styles.windowChipsRow}>
                  {availableEndPrayers.map((item) => {
                    const isSelected = endPrayer === item.prayer;
                    return (
                      <Pressable
                        key={item.prayer + item.label}
                        onPress={() => setEndPrayer(item.prayer)}
                        style={[
                          styles.windowChip,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primaryLight : colors.surfaceSecondary,
                            borderRadius: radii.pill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.labelMedium,
                            {
                              color: isSelected ? colors.primaryDark : colors.textPrimary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          Until {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Mode 4: Anytime Today */}
            {mode === 'ANYTIME_TODAY' && (
              <View
                style={[
                  styles.anytimeCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                    padding: spacing.md,
                  },
                ]}
              >
                <Icon name="calendar" size={24} color={colors.primary} />
                <View style={{ marginStart: spacing.sm, flex: 1 }}>
                  <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                    Anytime Today
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Can be completed at any point during this day
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Sticky Actions Bar at bottom, wrapped in SheetSafeArea so it sits comfortably above system navigation bar */}
          <SheetSafeArea backgroundColor={sheetBg} style={styles.sheetSafeArea}>
            <View style={[styles.actionsRow, { paddingHorizontal: spacing.xl, paddingTop: spacing.md }]}>
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel reschedule"
                style={[
                  styles.cancelButton,
                  {
                    borderColor: colors.border,
                    borderRadius: radii.pill,
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
                accessibilityRole="button"
                accessibilityLabel="Confirm reschedule"
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radii.pill,
                    minHeight: touchTargets.min,
                  },
                ]}
                testID="reschedule-confirm-button"
              >
                <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                  Confirm
                </Text>
              </Pressable>
            </View>
          </SheetSafeArea>
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
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '85%',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingBottom: 8,
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
  modeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  relativeModeContainer: {
    marginTop: 4,
  },
  liveBanner: {
    borderWidth: 1,
  },
  directionRow: {
    flexDirection: 'row',
    width: '100%',
  },
  directionButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  offsetChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  offsetChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepperInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
  },
  stepperInput: {
    flex: 1,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  exactModeContainer: {
    marginTop: 4,
  },
  exactTimeInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  exactTimeInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 20,
  },
  windowModeContainer: {
    marginTop: 4,
  },
  windowChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  windowChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  anytimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  sheetSafeArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
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
