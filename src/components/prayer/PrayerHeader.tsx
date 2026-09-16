import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { PRAYER_NAMES, type Prayer } from '@/constants/prayers';
import { PRAYER_ARABIC_NAMES } from '@/services/TodayViewModelProjection';
import { Icon } from '@/components/common/Icon';

export interface PrayerHeaderProps {
  currentPrayer: Prayer;
  nextPrayer: { prayer: Prayer; time: string } | null;
  countdownDisplay: string | null;
}

export function PrayerHeader({
  currentPrayer,
  nextPrayer,
  countdownDisplay,
}: PrayerHeaderProps) {
  const { colors, spacing, radii, typography } = useTheme();

  const currentPrayerName = PRAYER_NAMES[currentPrayer] ?? currentPrayer;
  const currentArabicName = PRAYER_ARABIC_NAMES[currentPrayer] ?? '';
  const nextPrayerName = nextPrayer ? PRAYER_NAMES[nextPrayer.prayer] : null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          borderBottomLeftRadius: radii.card,
          borderBottomRightRadius: radii.card,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
        },
      ]}
      testID="prayer-header"
    >
      {/* Decorative background visual elements */}
      <View style={styles.ornamentRow}>
        <View
          style={[
            styles.archMotif,
            { borderColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1 },
          ]}
        />
      </View>

      <View style={styles.topRow}>
        <View style={styles.prayerTitleGroup}>
          <View style={styles.currentBadge}>
            <Text style={[typography.caption, { color: colors.primaryLight, fontWeight: '700' }]}>
              CURRENT PRAYER
            </Text>
          </View>
          <View style={styles.titleWithArabic}>
            <Text style={[typography.displaySmall, { color: colors.textOnPrimary, fontWeight: '700' }]}>
              {currentPrayerName}
            </Text>
            <Text
              style={[
                typography.headlineMedium,
                { color: 'rgba(255, 255, 255, 0.75)', marginLeft: spacing.md },
              ]}
            >
              {currentArabicName}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: radii.pill },
          ]}
        >
          <Icon name="prayer" size={28} color={colors.textOnPrimary} />
        </View>
      </View>

      {/* Countdown row */}
      {nextPrayerName && countdownDisplay ? (
        <View
          style={[
            styles.countdownContainer,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              borderRadius: radii.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              marginTop: spacing.md,
            },
          ]}
          testID="prayer-countdown"
        >
          <Icon name="clock" size={16} color={colors.primaryLight} style={{ marginRight: spacing.xs }} />
          <Text style={[typography.bodySmall, { color: colors.textOnPrimary }]}>
            {nextPrayerName} in{' '}
            <Text style={{ fontWeight: '700', color: colors.primaryLight }}>
              {countdownDisplay}
            </Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  ornamentRow: {
    position: 'absolute',
    right: -30,
    top: -30,
    opacity: 0.5,
  },
  archMotif: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayerTitleGroup: {
    flex: 1,
  },
  currentBadge: {
    marginBottom: 2,
  },
  titleWithArabic: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});