import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { PRAYER_NAMES, type Prayer } from '@/constants/prayers';
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
  const nextPrayerName = nextPrayer ? PRAYER_NAMES[nextPrayer.prayer] : null;

  const compositeLabel = `Current prayer: ${currentPrayerName}.${
    nextPrayerName && countdownDisplay ? ` Next: ${nextPrayerName} in ${countdownDisplay}` : ''
  }`;

  return (
    <View style={styles.container} testID="prayer-header">
      <View accessible={true} accessibilityLabel={compositeLabel}>
        <AppHeroHeader
          title="Planner"
          subtitle={effectiveDateSubtitle}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
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
});