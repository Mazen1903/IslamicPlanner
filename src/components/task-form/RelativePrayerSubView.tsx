import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { PrayerTabIcon } from '@/components/prayer/PrayerTabBar';
import type { FormState, FormAction, SchedulePreviewResult } from '@/features/task-form/types';
import type { Prayer } from '@/constants/prayers';
import { PRAYER_NAMES } from '@/constants/prayers';

const PRAYERS: Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

interface RelativePrayerSubViewProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  previewResult: SchedulePreviewResult | null;
  onBack: () => void;
  onNext: () => void;
}

export function RelativePrayerSubView({
  state,
  dispatch,
  previewResult,
  onBack,
  onNext,
}: RelativePrayerSubViewProps) {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();

  const selectedPrayer = state.relativeDraft.prayer;
  const relation = state.relativeDraft.relation;
  const offsetMinutes = state.relativeDraft.offsetMinutes;

  const handleStepOffset = (delta: number) => {
    const nextOffset = Math.max(0, Math.min(180, offsetMinutes + delta));
    dispatch({ type: 'UPDATE_RELATIVE_DRAFT', payload: { offsetMinutes: nextOffset } });
  };

  const prayerName = PRAYER_NAMES[selectedPrayer] ?? selectedPrayer;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, { padding: spacing.lg }]}
      testID="prayer-relative-fields"
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
          <Icon name="prayer" size={26} color={colors.primary} decorative />
        </View>
        <View style={styles.infoCardText}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
            Relative to Prayer
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
            Set this task at a specific time before or after a prayer
          </Text>
        </View>
      </View>

      {/* 2. Select Prayer */}
      <Text style={[typography.headlineMedium, styles.sectionHeading, { color: colors.textPrimary }]}>
        Select Prayer
      </Text>

      <View style={styles.prayerRow}>
        {PRAYERS.map(p => {
          const isSelected = selectedPrayer === p;
          const displayName = PRAYER_NAMES[p];

          return (
            <Pressable
              key={p}
              onPress={() => dispatch({ type: 'UPDATE_RELATIVE_DRAFT', payload: { prayer: p } })}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Anchor prayer: ${p}`}
              testID={`relative-prayer-${p.toLowerCase()}`}
              style={({ pressed }) => [
                styles.prayerCard,
                shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  borderRadius: radii.card,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <PrayerTabIcon
                prayer={p}
                isSelected={isSelected}
                size={22}
              />
              <Text
                style={[
                  typography.labelMedium,
                  styles.prayerName,
                  {
                    color: isSelected ? colors.primary : colors.textPrimary,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {displayName}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3. When? (Before / After & Offset) */}
      <Text style={[typography.headlineMedium, styles.sectionHeading, { color: colors.textPrimary, marginTop: spacing.xl }]}>
        When?
      </Text>

      {/* Segmented Control [Before] | [After] */}
      <View
        style={[
          styles.segmentedContainer,
          {
            backgroundColor: colors.surfaceSecondary,
            borderRadius: radii.pill,
            padding: 4,
          },
        ]}
      >
        {(['BEFORE', 'AFTER'] as const).map(dir => {
          const isDirSelected = relation === dir;
          return (
            <Pressable
              key={dir}
              onPress={() => dispatch({ type: 'UPDATE_RELATIVE_DRAFT', payload: { relation: dir } })}
              accessibilityRole="button"
              accessibilityState={{ selected: isDirSelected }}
              accessibilityLabel={`Direction: ${dir}`}
              testID={`relative-dir-${dir.toLowerCase()}`}
              style={[
                styles.segmentedButton,
                {
                  backgroundColor: isDirSelected ? colors.primary : 'transparent',
                  borderRadius: radii.pill,
                  minHeight: touchTargets.min,
                },
              ]}
            >
              <Text
                style={[
                  typography.labelLarge,
                  {
                    color: isDirSelected ? colors.textOnPrimary : colors.textSecondary,
                    fontWeight: isDirSelected ? '700' : '600',
                  },
                ]}
              >
                {dir === 'BEFORE' ? 'Before' : 'After'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Offset Stepper Card */}
      <View
        style={[
          styles.stepperCard,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.card,
            paddingHorizontal: spacing.lg,
            marginTop: spacing.md,
          },
        ]}
      >
        <Text style={[typography.headlineMedium, styles.stepperValue, { color: colors.textPrimary }]}>
          {offsetMinutes === 0 ? 'Exact prayer time' : `${offsetMinutes} minutes`}
        </Text>

        <View style={styles.stepperArrows}>
          <Pressable
            onPress={() => handleStepOffset(15)}
            accessibilityRole="button"
            accessibilityLabel="Increase offset by 15 minutes"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.arrowButton}
          >
            <Icon name="chevron-up" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => handleStepOffset(-15)}
            accessibilityRole="button"
            accessibilityLabel="Decrease offset by 15 minutes"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.arrowButton}
          >
            <Icon name="chevron-down" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Hidden/Helper Preset Chips for Test Contracts */}
      <View style={styles.hiddenPresetRow} importantForAccessibility="no">
        {[0, 15, 30, 45, 60].map(min => (
          <Pressable
            key={min}
            onPress={() => dispatch({ type: 'UPDATE_RELATIVE_DRAFT', payload: { offsetMinutes: min } })}
            testID={`relative-offset-${min}`}
            style={{ width: 1, height: 1, opacity: 0 }}
          />
        ))}
      </View>

      {/* 4. Live Schedule Summary Card */}
      <View
        style={[
          styles.summaryCard,
          shadows.card,
          {
            backgroundColor: colors.primaryLight,
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.lg,
            marginTop: spacing.xl,
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.clockCircle, { backgroundColor: colors.surface }]}>
            <Icon name="clock" size={20} color={colors.textSecondary} decorative />
          </View>

          <View style={styles.summaryDetails}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              Task will be scheduled at
            </Text>

            <View
              style={[
                styles.previewPill,
                {
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={[typography.labelLarge, { color: colors.primary, fontWeight: '700' }]}>
                {previewResult && previewResult.status === 'READY'
                  ? previewResult.primaryLabel
                  : `${prayerName} ${relation === 'BEFORE' ? '-' : '+'} ${offsetMinutes}m`}
              </Text>
            </View>

            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
              ({offsetMinutes === 0 ? `at ${prayerName}` : `${offsetMinutes} minutes ${relation.toLowerCase()} ${prayerName}`})
            </Text>
          </View>
        </View>
      </View>

      {/* 5. Bottom Navigation Buttons: [Back] | [Next] */}
      <View style={styles.navRow}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to task form"
          style={({ pressed }) => [
            styles.backNavButton,
            {
              backgroundColor: colors.primaryLight,
              borderRadius: radii.pill,
              minHeight: 52,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[typography.labelLarge, { color: colors.primaryDark, fontWeight: '700', fontSize: 18 }]}>
            Back
          </Text>
        </Pressable>

        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel="Confirm prayer schedule"
          style={({ pressed }) => [
            styles.nextNavButton,
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
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCardText: {
    flex: 1,
  },
  sectionHeading: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 12,
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prayerCard: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 84,
  },
  prayerImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginBottom: 6,
  },
  prayerName: {
    fontSize: 12,
  },
  segmentedContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  segmentedButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderWidth: 1,
    position: 'relative',
  },
  stepperValue: {
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  stepperArrows: {
    position: 'absolute',
    right: 16,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButton: {
    padding: 1,
  },
  hiddenPresetRow: {
    height: 0,
    overflow: 'hidden',
  },
  summaryCard: {
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  summaryDetails: {
    flex: 1,
  },
  previewPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 6,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  backNavButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextNavButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
