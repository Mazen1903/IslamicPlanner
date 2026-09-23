import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { FormState, FormAction, RecurrencePreset } from '@/features/task-form/types';
import type { ISOWeekday } from '@/domain/recurrence/types';
import { CustomRecurrenceModal } from './CustomRecurrenceModal';

interface RecurrenceSubViewProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  onBack: () => void;
  onNext: () => void;
}

const PRESET_OPTIONS: {
  preset: RecurrencePreset;
  title: string;
  subtitle: string;
  icon: 'edit' | 'calendar' | 'moon' | 'calendar-star';
  hasChevron?: boolean;
}[] = [
  { preset: 'NONE', title: "Doesn't repeat", subtitle: 'Only once', icon: 'edit' },
  { preset: 'DAILY', title: 'Daily', subtitle: 'Repeats every day', icon: 'calendar' },
  { preset: 'WEEKDAYS', title: 'Weekdays', subtitle: 'Every Monday to Friday', icon: 'calendar' },
  { preset: 'WEEKLY', title: 'Weekly', subtitle: 'Repeats every week', icon: 'calendar', hasChevron: true },
  { preset: 'MONTHLY', title: 'Monthly', subtitle: 'Repeats every month', icon: 'calendar', hasChevron: true },
  { preset: 'SPECIFIC_DAYS', title: 'Specific days', subtitle: 'Choose specific days of the week', icon: 'moon', hasChevron: true },
  { preset: 'CUSTOM', title: 'Custom', subtitle: 'Set advanced recurrence', icon: 'calendar-star', hasChevron: true },
];

const ALL_WEEKDAYS: { iso: ISOWeekday; label: string }[] = [
  { iso: 1, label: 'M' },
  { iso: 2, label: 'T' },
  { iso: 3, label: 'W' },
  { iso: 4, label: 'T' },
  { iso: 5, label: 'F' },
  { iso: 6, label: 'S' },
  { iso: 7, label: 'S' },
];

export function RecurrenceSubView({
  state,
  dispatch,
  onBack,
  onNext,
}: RecurrenceSubViewProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();
  const [showCustomModal, setShowCustomModal] = useState(false);

  const handleSelectPreset = (preset: RecurrencePreset) => {
    dispatch({ type: 'SET_RECURRENCE_PRESET', payload: preset });
    if (preset === 'CUSTOM') {
      setShowCustomModal(true);
    }
  };

  const toggleSpecificDay = (iso: ISOWeekday) => {
    const existing = state.specificDays;
    const updated = existing.includes(iso)
      ? existing.filter(d => d !== iso)
      : [...existing, iso];
    dispatch({ type: 'SET_SPECIFIC_DAYS', payload: updated });
  };

  const getSummaryText = () => {
    switch (state.recurrencePreset) {
      case 'NONE':
        return {
          title: 'Repeats: Never',
          desc: 'This task is scheduled for one time only.',
        };
      case 'DAILY':
        return {
          title: 'Repeats: Daily',
          desc: 'This task will appear every day.',
        };
      case 'WEEKDAYS':
        return {
          title: 'Repeats: Weekdays',
          desc: 'This task will appear Monday through Friday.',
        };
      case 'WEEKLY':
        return {
          title: 'Repeats: Weekly',
          desc: 'This task will repeat every week.',
        };
      case 'MONTHLY':
        return {
          title: 'Repeats: Monthly',
          desc: 'This task will repeat once a month.',
        };
      case 'SPECIFIC_DAYS': {
        const dayNames: Record<ISOWeekday, string> = {
          1: 'Mon',
          2: 'Tue',
          3: 'Wed',
          4: 'Thu',
          5: 'Fri',
          6: 'Sat',
          7: 'Sun',
        };
        const selectedNames = state.specificDays.map(d => dayNames[d]).join(', ');
        return {
          title: `Repeats: ${selectedNames || 'Specific days'}`,
          desc: 'This task will repeat on the chosen days of the week.',
        };
      }
      case 'CUSTOM':
        return {
          title: 'Repeats: Custom Schedule',
          desc: state.recurrenceCalendar === 'HIJRI'
            ? 'Custom schedule based on the Hijri calendar.'
            : 'Custom schedule based on your recurrence rules.',
        };
      default:
        return {
          title: 'Repeats: None',
          desc: 'One-time task.',
        };
    }
  };

  const summary = getSummaryText();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, { padding: spacing.lg }]}
      testID="recurrence-subview"
    >
      {/* 1. Feature Info Card */}
      <View
        style={[
          styles.infoCard,
          shadows.card,
          {
            backgroundColor: colors.primaryLight,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.md,
            marginBottom: spacing.lg,
          },
        ]}
      >
        <View style={[styles.badgeIcon, { backgroundColor: colors.surface, borderRadius: radii.md }]}>
          <Icon name="refresh" size={26} color={colors.primary} decorative />
        </View>
        <View style={styles.infoCardText}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
            Repeat
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
            Choose how often this task should repeat
          </Text>
        </View>
      </View>

      {/* 2. Preset Radio Cards List */}
      <View style={styles.presetsList}>
        {PRESET_OPTIONS.map(item => {
          const isSelected = state.recurrencePreset === item.preset;
          return (
            <View key={item.preset} style={styles.cardWrapper}>
              <Pressable
                onPress={() => handleSelectPreset(item.preset)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${item.title}: ${item.subtitle}`}
                testID={`repeat-preset-${item.preset.toLowerCase()}`}
                style={({ pressed }) => [
                  styles.presetCard,
                  shadows.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                    borderRadius: radii.card,
                    padding: spacing.md,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {/* Radio Circle Indicator */}
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.radioDot,
                        {
                          backgroundColor: colors.primary,
                          borderRadius: radii.pill,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Preset Icon */}
                <View style={[styles.presetIconBox, { marginEnd: spacing.sm }]}>
                  <Icon
                    name={item.icon}
                    size={22}
                    color={colors.textSecondary}
                    decorative
                  />
                </View>

                {/* Text Content */}
                <View style={styles.cardContent}>
                  <Text
                    style={[
                      typography.labelLarge,
                      {
                        color: isSelected ? colors.primaryDark : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      { color: isSelected ? colors.textPrimary : colors.textSecondary, marginTop: 2 },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>

                {/* Chevron down if expandable */}
                {item.hasChevron && item.preset !== 'CUSTOM' && (
                  <Icon name="chevron-down" size={18} color={colors.textTertiary} decorative />
                )}

                {/* Arrow or Custom Indicator if CUSTOM */}
                {item.preset === 'CUSTOM' && (
                  <Pressable
                    onPress={() => setShowCustomModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Configure custom repeat rules"
                    testID="open-custom-recurrence-modal"
                    style={styles.customIconBtn}
                  >
                    <Icon name="chevron-down" size={18} color={colors.textTertiary} decorative />
                  </Pressable>
                )}
              </Pressable>

              {/* Inline Specific Days Selector */}
              {item.preset === 'SPECIFIC_DAYS' && isSelected && (
                <View
                  style={[
                    styles.specificDaysContainer,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: radii.md,
                      padding: spacing.md,
                      marginTop: spacing.xs,
                    },
                  ]}
                  testID="specific-days-controls"
                >
                  <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    Select Days of the Week
                  </Text>
                  <View style={styles.weekdayRow}>
                    {ALL_WEEKDAYS.map(w => {
                      const isDaySelected = state.specificDays.includes(w.iso);
                      return (
                        <Pressable
                          key={w.iso}
                          onPress={() => toggleSpecificDay(w.iso)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isDaySelected }}
                          accessibilityLabel={`Repeat on weekday ${w.iso}`}
                          testID={`weekday-toggle-${w.iso}`}
                          style={[
                            styles.weekdayCircle,
                            {
                              backgroundColor: isDaySelected ? colors.primary : colors.surface,
                              borderColor: isDaySelected ? colors.primary : colors.border,
                              borderRadius: radii.pill,
                              minHeight: touchTargets.min,
                              minWidth: touchTargets.min,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typography.labelLarge,
                              {
                                color: isDaySelected ? colors.textOnPrimary : colors.textPrimary,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {w.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 4. Summary Card */}
      <View
        style={[
          styles.summaryCard,
          shadows.card,
          {
            backgroundColor: colors.primaryLight,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.md,
            marginTop: spacing.lg,
            marginBottom: spacing.xl,
            flexDirection: 'row',
            alignItems: 'center',
          },
        ]}
      >
        <View style={[styles.badgeIcon, { backgroundColor: colors.surface, borderRadius: radii.md, marginEnd: spacing.md }]}>
          <Icon name="calendar" size={26} color={colors.primary} decorative />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {state.recurrencePreset === 'NONE'
              ? 'This task will occur once at'
              : 'This task will repeat'}
          </Text>
          <View style={[styles.summaryPill, { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4, alignSelf: 'flex-start' }]}>
            <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '700' }]}>
              {summary.title}
            </Text>
          </View>
        </View>
      </View>

      {/* 5. Bottom Navigation Buttons */}
      <View style={styles.bottomButtonsRow}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to task form"
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: colors.primaryLight,
              borderRadius: radii.pill,
              minHeight: 52,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[typography.labelLarge, { color: colors.primary, fontWeight: '700', fontSize: 18 }]}>
            Back
          </Text>
        </Pressable>

        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel="Next"
          testID="repeat-next-button"
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: colors.primary,
              borderRadius: radii.pill,
              minHeight: 52,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700', fontSize: 18 }]}>
            Next
          </Text>
        </Pressable>
      </View>

      {/* Custom Recurrence Modal */}
      <CustomRecurrenceModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        state={state}
        dispatch={dispatch}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCardText: {
    flex: 1,
  },
  sectionHeading: {
    fontWeight: '700',
    marginBottom: 12,
  },
  presetsList: {
    gap: 8,
  },
  cardWrapper: {
    width: '100%',
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDot: {
    width: 12,
    height: 12,
  },
  cardContent: {
    flex: 1,
  },
  presetIconBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryPill: {
    alignSelf: 'flex-start',
  },
  customIconBtn: {
    padding: 8,
  },
  specificDaysContainer: {
    width: '100%',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  weekdayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  summaryCard: {
    borderWidth: 1,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryHeading: {
    fontWeight: '700',
    marginLeft: 6,
  },
  summaryTitle: {
    fontWeight: '700',
    marginTop: 4,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backNavButton: {
    borderWidth: 1,
  },
  nextNavButton: {},
});
