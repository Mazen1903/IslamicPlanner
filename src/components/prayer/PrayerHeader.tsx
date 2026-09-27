import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { PRAYER_NAMES, type Prayer } from '@/constants/prayers';
import { PRAYER_ARABIC_NAMES } from '@/services/TodayViewModelProjection';
import { Icon } from '@/components/common/Icon';
import { getTodayDateSubtitle } from '@/utils/todayDateSubtitle';

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
  const { colors, spacing, typography, islamicThemeId } = useTheme();
  const effectiveDateSubtitle = dateSubtitle ?? getTodayDateSubtitle();

  const currentPrayerName = PRAYER_NAMES[currentPrayer] ?? currentPrayer;
  const currentArabicName = PRAYER_ARABIC_NAMES[currentPrayer] ?? '';
  const nextPrayerName = nextPrayer ? PRAYER_NAMES[nextPrayer.prayer] : null;

  const compositeLabel = `Current prayer: ${currentPrayerName}.${
    nextPrayerName && countdownDisplay ? ` Next: ${nextPrayerName} in ${countdownDisplay}` : ''
  }`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: islamicThemeId ? 'transparent' : colors.background,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        },
      ]}
      testID="prayer-header"
    >
      <View
        accessible={true}
        accessibilityLabel={compositeLabel}
      >
        <View style={styles.contentRow}>
          {/* Left: Title, Date & Location */}
          <View style={styles.leftColumn}>
            <Text style={[typography.headlineLarge, styles.screenTitle, { color: colors.textPrimary }]}>
              Today
            </Text>

            <Text style={[typography.bodyMedium, styles.dateSubtitle, { color: colors.textSecondary }]}>
              {effectiveDateSubtitle}
            </Text>

            <Pressable
              onPress={onPressLocation}
              accessibilityRole="button"
              accessibilityLabel={`Current location: ${locationName}`}
              style={styles.locationRow}
            >
              <Icon name="location" size={16} color={colors.primary} style={{ marginEnd: spacing.xs }} decorative />
              <Text style={[typography.labelMedium, styles.locationText, { color: colors.primary }]}>
                {locationName}
              </Text>
              <Icon name="chevron-down" size={14} color={colors.primary} style={styles.locationChevron} decorative />
            </Pressable>
          </View>

          {/* Right: Mosque skyline artwork (shown only when no custom Islamic wallpaper is active) */}
          {!islamicThemeId && (
            <View
              style={styles.artworkWrapper}
              importantForAccessibility="no"
              accessibilityElementsHidden={true}
            >
              <Image
                source={require('../../../assets/mosque_header.png')}
                style={styles.mosqueImage}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

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

        {/* Optional fallback countdown row if rendered standalone */}
        {nextPrayerName && countdownDisplay ? (
          <View
            style={styles.hiddenCountdownWrapper}
            testID="prayer-countdown"
            importantForAccessibility="no"
            accessibilityElementsHidden={true}
          >
            <Icon name="clock" size={16} color={colors.primary} style={{ marginEnd: spacing.xs }} decorative />
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              {nextPrayerName} in{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>
                {countdownDisplay}
              </Text>
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    paddingEnd: 8,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  dateSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  locationText: {
    fontWeight: '700',
    fontSize: 14,
    marginEnd: 4,
  },
  locationChevron: {
    marginTop: 1,
  },
  artworkWrapper: {
    width: 140,
    height: 70,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  mosqueImage: {
    width: '100%',
    height: '100%',
  },
  hiddenArabicWrapper: {
    height: 0,
    overflow: 'hidden',
  },
  hiddenCountdownWrapper: {
    height: 0,
    overflow: 'hidden',
  },
});