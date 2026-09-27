import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import { PRAYER_NAMES } from '@/constants/prayers';
import type { PrayerTabViewModel } from '@/services/types';

export interface ActivePrayerHeroCardProps {
  currentTab: PrayerTabViewModel;
  allTabs: PrayerTabViewModel[];
  currentPrayer: Prayer;
  nextPrayer: { prayer: Prayer; time: string } | null;
  countdownDisplay: string | null;
}

const PRAYER_HERO_ASSETS: Record<Prayer, any> = {
  FAJR: require('../../../assets/prayers/fajr.png'),
  DHUHR: require('../../../assets/dhuhr_badge.png'),
  ASR: require('../../../assets/prayers/asr.png'),
  MAGHRIB: require('../../../assets/prayers/maghrib.png'),
  ISHA: require('../../../assets/prayers/isha.png'),
};

export function getPrayerTimeWindow(
  currentTab: PrayerTabViewModel,
  allTabs: PrayerTabViewModel[]
): string {
  const currentIndex = allTabs.findIndex(t => t.prayer === currentTab.prayer);
  if (currentIndex === -1 || allTabs.length === 0) {
    return currentTab.startTime;
  }
  const nextIndex = (currentIndex + 1) % allTabs.length;
  const nextTab = allTabs[nextIndex];
  return `${currentTab.startTime} – ${nextTab.startTime}`;
}

export function ActivePrayerHeroCard({
  currentTab,
  allTabs,
  currentPrayer,
  nextPrayer,
  countdownDisplay,
}: ActivePrayerHeroCardProps) {
  const { colors, spacing, radii, typography, shadows, isDark } = useTheme();

  const heroAsset = PRAYER_HERO_ASSETS[currentTab.prayer] ?? PRAYER_HERO_ASSETS.DHUHR;
  const timeWindow = getPrayerTimeWindow(currentTab, allTabs);
  const prayerName = PRAYER_NAMES[currentTab.prayer] ?? currentTab.name;

  // Determine countdown title and display
  const isSelectedCurrent = currentTab.prayer === currentPrayer;
  const nextName = nextPrayer ? (PRAYER_NAMES[nextPrayer.prayer] ?? nextPrayer.prayer) : null;

  let countdownHeader = nextName ? `${nextName} in` : 'Next in';
  let displayCountdown = countdownDisplay ?? '--:--';

  if (!isSelectedCurrent) {
    // If user clicked a different prayer tab
    countdownHeader = `${prayerName} time`;
    displayCountdown = currentTab.startTime;
  }

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: isDark ? 'rgba(28, 35, 43, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          borderRadius: radii.card,
          padding: spacing.md,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm,
        },
      ]}
      testID="active-prayer-hero-card"
      accessible={true}
      accessibilityLabel={`${prayerName}, ${timeWindow}. ${countdownHeader} ${displayCountdown}`}
    >
      {/* Left: Squircle prayer artwork */}
      <View style={styles.artContainer}>
        <Image source={heroAsset} style={styles.heroImage} resizeMode="contain" />
      </View>

      {/* Center: Prayer title & time range */}
      <View style={styles.centerContainer}>
        <Text
          style={[
            typography.displaySmall,
            styles.prayerTitle,
            { color: colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {prayerName}
        </Text>
        <Text
          style={[
            typography.bodySmall,
            styles.timeWindow,
            { color: colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {timeWindow}
        </Text>
      </View>

      {/* Right: Mint countdown badge pill */}
      <View
        style={[
          styles.countdownBadge,
          {
            backgroundColor: isDark ? '#14382B' : '#E8F8F0',
            borderColor: isDark ? '#10B98133' : '#A7F3D0',
          },
        ]}
      >
        <Text
          style={[
            typography.caption,
            styles.countdownHeader,
            { color: isDark ? '#34D399' : '#047857' },
          ]}
          numberOfLines={1}
        >
          {countdownHeader}
        </Text>
        <Text
          style={[
            typography.labelLarge,
            styles.countdownText,
            { color: isDark ? '#6EE7B7' : '#059669' },
          ]}
          numberOfLines={1}
        >
          {displayCountdown}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  artContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 64,
    height: 64,
  },
  centerContainer: {
    flex: 1,
    marginStart: 14,
    marginEnd: 8,
    justifyContent: 'center',
  },
  prayerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  timeWindow: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  countdownBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 84,
  },
  countdownHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  countdownText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
