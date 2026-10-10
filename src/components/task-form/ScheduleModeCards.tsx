import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Vibration,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
// decorative mode card icons; logical spacing contract: marginEnd: spacing.sm
import type { FormState, FormAction, ScheduleMode, SchedulePreviewResult } from '@/features/task-form/types';
import { type Prayer, PRAYER_NAMES } from '@/constants/prayers';
import { PrayerTabIcon } from '@/components/prayer/PrayerTabBar';
import { DatePickerInput, TimePickerInput } from './DateTimePickerInput';
import { Collapsible } from '@/components/common/Collapsible';

const PRAYERS: Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

const MODE_ICONS: Record<ScheduleMode, ImageSourcePropType> = {
  EXACT_TIME: require('../../../assets/icons/task/exact_time.png'),
  PRAYER_RELATIVE: require('../../../assets/icons/task/relative_prayer.png'),
  PRAYER_WINDOW: require('../../../assets/icons/task/prayer_window.png'),
  ANYTIME_TODAY: require('../../../assets/icons/task/anytime_today.png'),
};

interface ScheduleModeCardsProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  previewResult?: SchedulePreviewResult | null;
  onRequestRelativeView?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ScheduleModeCards({
  state,
  dispatch,
  previewResult: _previewResult,
  onRequestRelativeView: _onRequestRelativeView,
  style,
}: ScheduleModeCardsProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const modes: { mode: ScheduleMode; label: string }[] = [
    {
      mode: 'EXACT_TIME',
      label: 'Exact Time',
    },
    {
      mode: 'PRAYER_RELATIVE',
      label: 'Relative to Prayer',
    },
    {
      mode: 'PRAYER_WINDOW',
      label: 'Prayer Window',
    },
    {
      mode: 'ANYTIME_TODAY',
      label: 'Anytime',
    },
  ];

  return (
    <View style={[styles.container, style]}>
      <Text style={[typography.headlineMedium, styles.heading, { color: colors.textPrimary }]}>
        When?
      </Text>

      {/* 2x2 Mode Selector Cards */}
      <View style={styles.modeGrid}>
        {modes.map(item => {
          const isSelected = state.scheduleMode === item.mode;
          return (
            <Pressable
              key={item.mode}
              onPress={() => {
                try {
                  Vibration.vibrate(15);
                } catch {}
                if (state.scheduleMode === item.mode) {
                  dispatch({ type: 'SET_SCHEDULE_MODE', payload: null as any });
                } else {
                  dispatch({ type: 'SET_SCHEDULE_MODE', payload: item.mode });
                }
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={item.label}
              testID={`schedule-mode-${item.mode.toLowerCase()}`}
              style={({ pressed }) => [
                styles.modeCard,
                shadows.card,
                {
                  backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  borderRadius: radii.card,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 96,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    marginBottom: spacing.xs,
                  },
                ]}
              >
                <Image
                  source={MODE_ICONS[item.mode]}
                  style={{ width: 44, height: 44 }}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={[
                  typography.labelLarge,
                  styles.modeLabel,
                  {
                    color: isSelected ? colors.primaryDark : colors.textPrimary,
                    textAlign: 'center',
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {state.validationErrors.scheduleMode && (
        <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs, marginStart: spacing.xs }]}>
          {state.validationErrors.scheduleMode}
        </Text>
      )}

      {/* Unified Inline Mode Fields */}
      <Collapsible
        expanded={state.scheduleMode !== null}
        transitionKey={state.scheduleMode}
        testID="schedule-mode-collapsible"
      >
        {state.scheduleMode !== null && (
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
            <View testID="exact-time-fields" style={styles.exactFieldsStack}>
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
                <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs, marginStart: spacing.sm }]}>
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
                  const displayName = PRAYER_NAMES[p] ?? (p.charAt(0) + p.slice(1).toLowerCase());
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
                          backgroundColor: isAnchorSelected ? colors.primaryLight : colors.surfaceSecondary,
                          borderColor: isAnchorSelected ? colors.primary : colors.border,
                          borderWidth: isAnchorSelected ? 1.5 : 1,
                          borderRadius: radii.md,
                          paddingVertical: spacing.xs,
                          minHeight: 56,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <PrayerTabIcon
                        prayer={p}
                        isSelected={isAnchorSelected}
                        size={24}
                        style={{ marginBottom: 2 }}
                      />
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: isAnchorSelected ? colors.primaryDark : colors.textPrimary,
                            fontWeight: isAnchorSelected ? '700' : '600',
                            fontSize: 12,
                          },
                        ]}
                      >
                        {displayName}
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
                          { color: isDirSelected ? colors.primaryDark : colors.textSecondary },
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: 'row', paddingTop: 2 }}
                testID="relative-offset-scroll"
              >
                {[0, 5, 10, 15, 20, 30, 45, 60, 90, 120].map(min => {
                  const isMinSelected = state.relativeDraft.offsetMinutes === min;
                  return (
                    <Pressable
                      key={min}
                      onPress={() => dispatch({ type: 'UPDATE_RELATIVE_DRAFT', payload: { offsetMinutes: min } })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isMinSelected }}
                      accessibilityLabel={`${min} minutes`}
                      testID={`relative-offset-${min}`}
                      style={({ pressed }) => [
                        styles.offsetChip,
                        {
                          backgroundColor: isMinSelected ? colors.primary : colors.surfaceSecondary,
                          borderColor: isMinSelected ? colors.primary : colors.border,
                          borderRadius: radii.pill,
                          marginEnd: spacing.xs,
                          paddingVertical: spacing.xs,
                          paddingHorizontal: spacing.md,
                          minHeight: 36,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.labelMedium,
                          {
                            color: isMinSelected ? colors.textOnPrimary : colors.textPrimary,
                            fontWeight: isMinSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {min === 0 ? 'Exact' : `${min}m`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

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
                {PRAYERS.map(p => {
                  const isStartSelected = state.windowDraft.startPrayer === p;
                  const displayName = PRAYER_NAMES[p] ?? (p.charAt(0) + p.slice(1).toLowerCase());
                  return (
                    <Pressable
                      key={p}
                      onPress={() => dispatch({ type: 'UPDATE_WINDOW_DRAFT', payload: { startPrayer: p } })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isStartSelected }}
                      accessibilityLabel={`Start prayer: ${p}`}
                      testID={`window-start-${p.toLowerCase()}`}
                      style={({ pressed }) => [
                        styles.prayerChip,
                        {
                          backgroundColor: isStartSelected ? colors.primaryLight : colors.surfaceSecondary,
                          borderColor: isStartSelected ? colors.primary : colors.border,
                          borderWidth: isStartSelected ? 1.5 : 1,
                          borderRadius: radii.md,
                          paddingVertical: spacing.xs,
                          minHeight: 56,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <PrayerTabIcon
                        prayer={p}
                        isSelected={isStartSelected}
                        size={24}
                        style={{ marginBottom: 2 }}
                      />
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: isStartSelected ? colors.primaryDark : colors.textPrimary,
                            fontWeight: isStartSelected ? '700' : '600',
                            fontSize: 12,
                          },
                        ]}
                      >
                        {displayName}
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
                {PRAYERS.map(p => {
                  const isEndSelected = state.windowDraft.endPrayer === p;
                  const displayName = PRAYER_NAMES[p] ?? (p.charAt(0) + p.slice(1).toLowerCase());
                  return (
                    <Pressable
                      key={p}
                      onPress={() => dispatch({ type: 'UPDATE_WINDOW_DRAFT', payload: { endPrayer: p } })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isEndSelected }}
                      accessibilityLabel={`End prayer: ${p}`}
                      testID={`window-end-${p.toLowerCase()}`}
                      style={({ pressed }) => [
                        styles.prayerChip,
                        {
                          backgroundColor: isEndSelected ? colors.primaryLight : colors.surfaceSecondary,
                          borderColor: isEndSelected ? colors.primary : colors.border,
                          borderWidth: isEndSelected ? 1.5 : 1,
                          borderRadius: radii.md,
                          paddingVertical: spacing.xs,
                          minHeight: 56,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <PrayerTabIcon
                        prayer={p}
                        isSelected={isEndSelected}
                        size={24}
                        style={{ marginBottom: 2 }}
                      />
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: isEndSelected ? colors.primaryDark : colors.textPrimary,
                            fontWeight: isEndSelected ? '700' : '600',
                            fontSize: 12,
                          },
                        ]}
                      >
                        {displayName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {(state.validationErrors.windowOrder || state.validationErrors.prayerWindow) && (
                <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
                  {state.validationErrors.windowOrder || state.validationErrors.prayerWindow}
                </Text>
              )}
            </View>
          )}

          {state.scheduleMode === 'ANYTIME_TODAY' && (
            <View testID="anytime-today-fields">
              <DatePickerInput
                value={state.planningDayDate}
                onChange={d => dispatch({ type: 'SET_PLANNING_DAY_DATE', payload: d })}
                label="Planning Day"
                testID="anytime-date-picker"
              />
            </View>
          )}
        </View>
      )}
      </Collapsible>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  heading: {
    fontWeight: '700',
    marginBottom: 12,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exactFieldsStack: {
    gap: 10,
  },
  modeCard: {
    width: '48%',
    borderWidth: 1.5,
    minHeight: 110,
    justifyContent: 'flex-start',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    marginTop: 2,
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
    paddingHorizontal: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
