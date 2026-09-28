import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import { PRAYER_NAMES } from '@/constants/prayers';
import { getEmptyStateMessage } from '@/services/TodayViewModelProjection';
import { PrayerTabIcon } from '@/components/prayer/PrayerTabBar';

export interface EmptyPrayerStateProps {
  selectedPrayer: Prayer;
  currentPrayer: Prayer;
  nextPrayer: Prayer | null;
  onAddTask?: (prayer: Prayer) => void;
}

const PRAYER_HERO_ASSETS: Record<Prayer, any> = {
  FAJR: require('../../../assets/prayers/fajr.png'),
  DHUHR: require('../../../assets/dhuhr_badge.png'),
  ASR: require('../../../assets/prayers/asr.png'),
  MAGHRIB: require('../../../assets/prayers/maghrib.png'),
  ISHA: require('../../../assets/prayers/isha.png'),
};

export function EmptyPrayerState({
  selectedPrayer,
  currentPrayer,
  nextPrayer,
  onAddTask: _onAddTask,
}: EmptyPrayerStateProps) {
  const { colors, spacing, typography, radii, shadows, isDark } = useTheme();

  const prayerName = PRAYER_NAMES[selectedPrayer] ?? selectedPrayer;
  const message = getEmptyStateMessage(
    'NOTHING_SCHEDULED',
    selectedPrayer,
    currentPrayer,
    nextPrayer
  );

  const asset = PRAYER_HERO_ASSETS[selectedPrayer];

  return (
    <View style={[styles.container, { padding: spacing.lg }]} testID="empty-prayer-state">
      <View
        style={[
          styles.card,
          shadows.card,
          {
            backgroundColor: isDark ? 'rgba(28, 35, 43, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: colors.border,
            borderRadius: radii.card,
            padding: spacing.xl,
          },
        ]}
      >
        <View style={styles.badgeWrapper}>
          {asset ? (
            <Image source={asset} style={styles.prayerBadge} resizeMode="contain" />
          ) : (
            <View style={[styles.fallbackIcon, { backgroundColor: colors.surfaceSecondary }]}>
              <PrayerTabIcon prayer={selectedPrayer} size={40} />
            </View>
          )}
        </View>

        <Text
          style={[
            typography.headlineMedium,
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          {`No tasks scheduled for ${prayerName}`}
        </Text>

        <Text
          style={[
            typography.bodyMedium,
            styles.message,
            { color: colors.textSecondary },
          ]}
        >
          {message}
        </Text>

        <Text
          style={[
            typography.bodySmall,
            styles.subtitle,
            { color: colors.textSecondary },
          ]}
        >
          Align your daily tasks with your prayers. Plan ahead or take this time for dhikr and reflection.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  prayerBadge: {
    width: 64,
    height: 64,
  },
  fallbackIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
    maxWidth: 290,
  },
});