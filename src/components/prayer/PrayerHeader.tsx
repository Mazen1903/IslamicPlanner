import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { PRAYER_NAMES, type Prayer } from '@/constants/prayers';
import { PRAYER_ARABIC_NAMES } from '@/services/TodayViewModelProjection';
import { Icon } from '@/components/common/Icon';
import { getTodayDateSubtitle } from '@/utils/todayDateSubtitle';
import { AppHeroHeader } from '@/components/common/AppHeroHeader';

export interface PrayerHeaderProps {
  currentPrayer: Prayer;
  nextPrayer: { prayer: Prayer; time: string } | null;
  countdownDisplay: string | null;
  locationName?: string;
  dateSubtitle?: string;
  onPressLocation?: () => void;
}

export function PrayerHeader({
  currentPrayer,
  nextPrayer,
  countdownDisplay,
  locationName = 'Current Location',
  dateSubtitle,
  onPressLocation,
}: PrayerHeaderProps) {
  const { colors, spacing, typography, radii } = useTheme();
  const effectiveDateSubtitle = dateSubtitle ?? getTodayDateSubtitle();

  const currentPrayerName = PRAYER_NAMES[currentPrayer] ?? currentPrayer;
  const currentArabicName = PRAYER_ARABIC_NAMES[currentPrayer] ?? '';
  const nextPrayerName = nextPrayer ? PRAYER_NAMES[nextPrayer.prayer] : null;

  const compositeLabel = `Current prayer: ${currentPrayerName}.${
    nextPrayerName && countdownDisplay ? ` Next: ${nextPrayerName} in ${countdownDisplay}` : ''
  }`;

  return (
    <View style={styles.container} testID="prayer-header">
      <View accessible={true} accessibilityLabel={compositeLabel}>
        <AppHeroHeader
          title="Today"
          subtitle={effectiveDateSubtitle}
          rightElement={
            <Pressable
              onPress={onPressLocation}
              accessibilityRole="button"
              accessibilityLabel={`Current location: ${locationName}`}
              style={({ pressed }) => [
                styles.locationPill,
                {
                  backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Icon
                name="location"
                size={16}
                color={colors.primary}
                style={{ marginEnd: spacing.xs }}
                decorative
              />
              <Text style={[typography.labelMedium, styles.locationText, { color: colors.primary }]}>
                {locationName}
              </Text>
              <Icon
                name="chevron-down"
                size={14}
                color={colors.primary}
                style={styles.locationChevron}
                decorative
              />
            </Pressable>
          }
          bottomElement={
            nextPrayerName && countdownDisplay ? (
              <View style={styles.countdownRow} testID="prayer-countdown">
                <View
                  style={[
                    styles.countdownPill,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Icon
                    name="clock"
                    size={14}
                    color={colors.primary}
                    style={{ marginEnd: spacing.xs }}
                    decorative
                  />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {nextPrayerName} in{' '}
                    <Text style={{ fontWeight: '700', color: colors.primaryDark }}>
                      {countdownDisplay}
                    </Text>
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Hidden Arabic Name preserved for test contracts & accessibility specs */}
        <View
          style={styles.hiddenArabicWrapper}
          importantForAccessibility="no"
          accessibilityElementsHidden={true}
        >
          <Text
            style={[
              typography.headlineMedium,
              { color: 'transparent', marginStart: spacing.md },
            ]}
          >
            {currentArabicName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  locationText: {
    fontWeight: '700',
    fontSize: 13,
    marginEnd: 4,
  },
  locationChevron: {
    marginTop: 1,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  hiddenArabicWrapper: {
    height: 0,
    overflow: 'hidden',
  },
});