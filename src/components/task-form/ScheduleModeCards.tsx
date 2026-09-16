import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { FormState, FormAction, ScheduleMode, SchedulePreviewResult } from '@/features/task-form/types';
import type { Prayer } from '@/constants/prayers';
import { DatePickerInput, TimePickerInput } from './DateTimePickerInput';

const PRAYERS: Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

interface ScheduleModeCardsProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  previewResult: SchedulePreviewResult | null;
  style?: StyleProp<ViewStyle>;
}

export function ScheduleModeCards({
  state,
  dispatch,
  previewResult,
  style,
}: ScheduleModeCardsProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const modes: { mode: ScheduleMode; label: string; icon: 'clock' | 'prayer' | 'calendar' | 'sun'; desc: string }[] = [
    {
      mode: 'EXACT_TIME',
      label: 'Exact Time',
      icon: 'clock',
      desc: 'Specific wall-clock time on a date',
    },
    {
      mode: 'PRAYER_RELATIVE',
      label: 'Relative to Prayer',
      icon: 'prayer',
      desc: 'Before or after a prayer time',
    },
    {
      mode: 'PRAYER_WINDOW',
      label: 'Prayer Window',
      icon: 'calendar',
      desc: 'Between two consecutive prayers',
    },
    {
      mode: 'ANYTIME_TODAY',
      label: 'Anytime Today',
      icon: 'sun',
      desc: 'Flexible for the planning day',
    },
  ];

  return (
    <View style={[styles.container, style]}>
      <Text style={[typography.headlineMedium, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        Schedule
      </Text>

      {/* Mode Selector Cards */}
      <View style={styles.modeGrid}>
        {modes.map(item => {
          const isSelected = state.scheduleMode === item.mode;
          return (
            <Pressable
              key={item.mode}
              onPress={() => dispatch({ type: 'SET_SCHEDULE_MODE', payload: item.mode })}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.label}: ${item.desc}`}
              testID={`schedule-mode-${item.mode.toLowerCase()}`}
              style={({ pressed }) => [
                styles.modeCard,
                shadows.card,
                {
                  backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radii.card,
                  minHeight: touchTargets.min,
                  padding: spacing.md,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.modeCardHeader}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={16}
                    color={isSelected ? colors.textOnPrimary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    typography.labelLarge,
                    {
                      color: isSelected ? colors.primaryDark : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '600',
                      marginLeft: spacing.sm,
                      flex: 1,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              <Text
                style={[
                  typography.caption,
                  { color: isSelected ? colors.textPrimary : colors.textSecondary, marginTop: spacing.xs },
                ]}
              >
                {item.desc}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Active Mode Fields */}
      <View
        style={[
          styles.fieldsContainer,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.lg,
            marginTop: spacing.md,
          },
        ]}
      >
        {state.scheduleMode === 'EXACT_TIME' && (
          <View testID="exact-time-fields">
            <DatePickerInput
              value={state.civilSeedDate}
              onChange={d => dispatch({ type: 'SET_CIVIL_SEED_DATE', payload: d })}
              label="Date"
              testID="exact-date-picker"
            />
            <TimePickerInput
              value={state.exactDraft.localTime}
              onChange={t => dispatch({ type: 'UPDATE_EXACT_DRAFT', payload: { localTime: t } })}
              label="Time"
              testID="exact-time-picker"
            />
            {state.validationErrors.localTime && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
                {state.validationErrors.localTime}
              </Text>
            )}
          </View>
        )}

        {state.scheduleMode === 'PRAYER_RELATIVE' && (
          <View testID="prayer-relative-fields">
            <DatePickerInput
              value={state.civilSeedDate}
              onChange={d => dispatch({ type: 'SET_CIVIL_SEED_DATE', payload: d })}
              label="Date"
              testID="relative-date-picker"
            />

            {/* Prayer Anchor Selection - NO Sunrise! */}
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
              Prayer Anchor
            </Text>
            <View style={styles.prayerRow}>
              {PRAYERS.map(p => {
                const isAnchorSelected = state.relativeDraft.prayer === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => dispatch({ type: 'UPDATE_RELATIVE_DRAFT', payload: { prayer: p } })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isAnchorSelected }}
                    accessibilityLabel={`Anchor prayer: ${p}`}
                    testID={`relative-prayer-${p.toLowerCase()}`}
                    style={({ pressed }) => [
                      styles.prayerChip,
                      {
                        backgroundColor: isAnchorSelected ? colors.primary : colors.surfaceSecondary,
                        borderColor: isAnchorSelected ? colors.primary : colors.border,
                        borderRadius: radii.md,
                        minHeight: touchTargets.min,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        { color: isAnchorSelected ? colors.textOnPrimary : colors.textPrimary, fontWeight: '600' },
                      ]}
                    >
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Relation Toggle (BEFORE / AFTER) */}
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Direction
            </Text>
            <View style={styles.directionRow}>
              {(['BEFORE', 'AFTER'] as const).map(dir => {
                const isDirSelected = state.relativeDraft.relation === dir;
                return (
                  <Pressable
                    key={dir}
                    onPress={() => dispatch({ type: 'UPDATE_RELATIVE_DRAFT', payload: { relation: dir } })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isDirSelected }}
                    accessibilityLabel={`Direction: ${dir}`}
                    testID={`relative-dir-${dir.toLowerCase()}`}
                    style={({ pressed }) => [
                      styles.directionButton,
                      {
                        backgroundColor: isDirSelected ? colors.primaryLight : colors.surfaceSecondary,
                        borderColor: isDirSelected ? colors.primary : colors.border,
                        borderRadius: radii.md,
                        minHeight: touchTargets.min,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelLarge,
                        { color: isDirSelected ? colors.primaryDark : colors.textSecondary, fontWeight: '600' },
                      ]}
                    >
                      {dir === 'BEFORE' ? 'Before' : 'After'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Offset Minutes */}
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Minutes Offset
            </Text>
            <View style={styles.offsetPresetRow}>
              {[0, 15, 30, 45, 60].map(min => {
                const isMinSelected = state.relativeDraft.offsetMinutes === min;
                return (
                  <Pressable
                    key={min}
                    onPress={() => dispatch({ type: 'UPDATE_RELATIVE_DRAFT', payload: { offsetMinutes: min } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${min} minutes`}
                    testID={`relative-offset-${min}`}
                    style={[
                      styles.offsetChip,
                      {
                        backgroundColor: isMinSelected ? colors.primary : colors.surfaceSecondary,
                        borderColor: isMinSelected ? colors.primary : colors.border,
                        borderRadius: radii.sm,
                        minHeight: touchTargets.min,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        { color: isMinSelected ? colors.textOnPrimary : colors.textPrimary },
                      ]}
                    >
                      {min === 0 ? 'Exact' : `${min}m`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {state.validationErrors.offsetMinutes && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
                {state.validationErrors.offsetMinutes}
              </Text>
            )}
          </View>
        )}

        {state.scheduleMode === 'PRAYER_WINDOW' && (
          <View testID="prayer-window-fields">
            <DatePickerInput
              value={state.civilSeedDate}
              onChange={d => dispatch({ type: 'SET_CIVIL_SEED_DATE', payload: d })}
              label="Date"
              testID="window-date-picker"
            />

            {/* Start Prayer */}
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              Start Prayer (inclusive)
            </Text>
            <View style={styles.prayerRow}>
              {PRAYERS.slice(0, 4).map(p => {
                const isStartSelected = state.windowDraft.startPrayer === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => dispatch({ type: 'UPDATE_WINDOW_DRAFT', payload: { startPrayer: p } })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isStartSelected }}
                    accessibilityLabel={`Start prayer: ${p}`}
                    testID={`window-start-${p.toLowerCase()}`}
                    style={[
                      styles.prayerChip,
                      {
                        backgroundColor: isStartSelected ? colors.primary : colors.surfaceSecondary,
                        borderColor: isStartSelected ? colors.primary : colors.border,
                        borderRadius: radii.md,
                        minHeight: touchTargets.min,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        { color: isStartSelected ? colors.textOnPrimary : colors.textPrimary, fontWeight: '600' },
                      ]}
                    >
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* End Prayer */}
            <Text style={[typography.labelMedium, { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              End Prayer (exclusive)
            </Text>
            <View style={styles.prayerRow}>
              {PRAYERS.slice(1).map(p => {
                const isEndSelected = state.windowDraft.endPrayer === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => dispatch({ type: 'UPDATE_WINDOW_DRAFT', payload: { endPrayer: p } })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isEndSelected }}
                    accessibilityLabel={`End prayer: ${p}`}
                    testID={`window-end-${p.toLowerCase()}`}
                    style={[
                      styles.prayerChip,
                      {
                        backgroundColor: isEndSelected ? colors.primary : colors.surfaceSecondary,
                        borderColor: isEndSelected ? colors.primary : colors.border,
                        borderRadius: radii.md,
                        minHeight: touchTargets.min,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        { color: isEndSelected ? colors.textOnPrimary : colors.textPrimary, fontWeight: '600' },
                      ]}
                    >
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {state.validationErrors.windowOrder && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
                {state.validationErrors.windowOrder}
              </Text>
            )}
          </View>
        )}

        {state.scheduleMode === 'ANYTIME_TODAY' && (
          <View testID="anytime-today-fields">
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
              This task has no fixed time. It will appear in the Anytime Today section for your active planning day.
            </Text>
            <View style={[styles.infoBanner, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md, marginTop: spacing.md, padding: spacing.md }]}>
              <Icon name="info" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                Planning day date: {state.planningDayDate}
              </Text>
            </View>
          </View>
        )}

        {/* Live Derived Preview */}
        {previewResult && previewResult.status === 'READY' && (
          <View
            style={[
              styles.previewBanner,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.primary,
                borderRadius: radii.md,
                padding: spacing.md,
                marginTop: spacing.md,
              },
            ]}
            testID="schedule-preview-banner"
          >
            <View style={styles.previewHeader}>
              <Icon name="clock" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
              <Text style={[typography.labelMedium, { color: colors.primaryDark, fontWeight: '700' }]}>
                Schedule Preview
              </Text>
            </View>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600', marginTop: 2 }]}>
              {previewResult.primaryLabel}
            </Text>
            {previewResult.secondaryLabel ? (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {previewResult.secondaryLabel}
              </Text>
            ) : null}
          </View>
        )}

        {previewResult && (previewResult.status === 'CONTEXT_UNAVAILABLE' || previewResult.status === 'INVALID') && (
          <View
            style={[
              styles.previewBanner,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {previewResult.reason || 'Preview unavailable'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeCard: {
    width: '48%',
    borderWidth: 1.5,
    justifyContent: 'flex-start',
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldsContainer: {
    borderWidth: 1,
  },
  prayerRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  prayerChip: {
    flex: 1,
    minWidth: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  directionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  offsetPresetRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  offsetChip: {
    flex: 1,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewBanner: {
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
