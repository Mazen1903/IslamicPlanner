import React from 'react';
import { View, Text, StyleSheet, Image, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import type { ThemeGalleryItem } from './types';

interface PhonePreviewCardProps {
  item: ThemeGalleryItem;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PhonePreviewCard({ item, style, testID }: PhonePreviewCardProps) {
  const { colors: appColors } = useTheme();
  const isDark = item.isDark ?? false;
  const primaryColor = item.previewColors?.primary ?? appColors.primary;
  const accentColor = item.previewColors?.accent ?? '#D4A017';
  const hasWallpaper = Boolean(item.wallpaperAsset);

  // Dynamic theme colors for the in-app preview
  const textColor = hasWallpaper || isDark ? '#FFFFFF' : '#111827';
  const textMuted = hasWallpaper || isDark ? 'rgba(255, 255, 255, 0.75)' : '#6B7280';
  const surfaceColor = hasWallpaper
    ? isDark
      ? 'rgba(18, 24, 46, 0.78)'
      : 'rgba(255, 255, 255, 0.85)'
    : isDark
    ? '#1A2338'
    : 'rgba(255, 255, 255, 0.95)';

  const cardBorder = hasWallpaper
    ? isDark
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(0, 0, 0, 0.08)'
    : isDark
    ? 'rgba(255, 255, 255, 0.10)'
    : 'rgba(15, 138, 82, 0.14)';

  const chipBg = hasWallpaper
    ? isDark
      ? 'rgba(255, 255, 255, 0.14)'
      : 'rgba(0, 0, 0, 0.06)'
    : isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.04)';

  return (
    <View style={[styles.cardShadow, style]} testID={testID}>
      <View
        style={[
          styles.phoneChassis,
          { backgroundColor: isDark ? '#0D111E' : '#F6F9F6' },
        ]}
      >
        {/* Full-bleed Wallpaper Background if present */}
        {item.wallpaperAsset && (
          <Image
            source={item.wallpaperAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        {/* Readability Scrim Overlay */}
        {item.wallpaperAsset && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(10, 14, 28, 0.38)'
                  : 'rgba(255, 255, 255, 0.18)',
              },
            ]}
          />
        )}

        {/* Device Top Speaker Notch */}
        <View style={styles.topNotchContainer}>
          <View style={styles.speakerPill} />
        </View>

        {/* 1. Status & App Header */}
        <View style={styles.appHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.locationPill}>
              <Icon name="location" size={10} color={primaryColor} decorative />
              <Text style={[styles.locationText, { color: textMuted }]}>
                Makkah • Mecca
              </Text>
            </View>
            <View style={styles.mosqueBadge}>
              <Icon name="mosque" size={13} color={primaryColor} decorative />
            </View>
          </View>

          <View style={styles.headerTitleRow}>
            <View>
              <Text style={[styles.screenTitle, { color: textColor }]}>Planner</Text>
              <Text style={[styles.hijriDate, { color: primaryColor }]}>
                18 Ramaḍān 1448 AH
              </Text>
            </View>
            <Text style={[styles.gregorianDate, { color: textMuted }]}>
              Tuesday, 29 Sep
            </Text>
          </View>
        </View>

        {/* 2. Active Prayer Hero Card */}
        <View
          style={[
            styles.heroPrayerCard,
            {
              backgroundColor: surfaceColor,
              borderColor: cardBorder,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadgeRow}>
              <Icon name="sun" size={12} color={accentColor} decorative />
              <Text style={[styles.heroLabel, { color: textMuted }]}>
                Next Prayer
              </Text>
            </View>
            <View style={[styles.countdownPill, { backgroundColor: primaryColor }]}>
              <Text style={styles.countdownText}>in 42m</Text>
            </View>
          </View>

          <View style={styles.heroMainRow}>
            <View style={styles.prayerNameCol}>
              <Text style={[styles.prayerNameEnglish, { color: textColor }]}>
                'Aṣr
              </Text>
            </View>
            <Text style={[styles.prayerTimeText, { color: primaryColor }]}>
              3:45 PM
            </Text>
          </View>

          {/* Time window progress indicator */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: primaryColor, width: '68%' },
              ]}
            />
          </View>
        </View>

        {/* 3. Prayer Capsules Pill Bar (5 Daily Prayers) */}
        <View style={styles.prayerPillBar}>
          {[
            { name: 'Fajr', time: '5:12', active: false },
            { name: 'Dhuhr', time: '12:24', active: false },
            { name: 'Asr', time: '3:45', active: true },
            { name: 'Maghrib', time: '6:18', active: false },
            { name: 'Isha', time: '7:48', active: false },
          ].map((p) => (
            <View
              key={p.name}
              style={[
                styles.prayerCapsule,
                {
                  backgroundColor: p.active ? primaryColor : chipBg,
                  borderColor: p.active ? primaryColor : cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.capsuleName,
                  {
                    color: p.active ? '#FFFFFF' : textColor,
                    fontWeight: p.active ? '700' : '500',
                  },
                ]}
              >
                {p.name}
              </Text>
              <Text
                style={[
                  styles.capsuleTime,
                  {
                    color: p.active ? 'rgba(255,255,255,0.9)' : textMuted,
                  },
                ]}
              >
                {p.time}
              </Text>
            </View>
          ))}
        </View>

        {/* 4. Realistic Islamic Planner Tasks */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksSectionHeader}>
            <Text style={[styles.tasksTitle, { color: textColor }]}>
              Tasks for 'Asr
            </Text>
            <View style={[styles.taskCountBadge, { backgroundColor: chipBg }]}>
              <Text style={[styles.taskCountText, { color: textMuted }]}>2</Text>
            </View>
          </View>

          {/* Task 1: Completed */}
          <View
            style={[
              styles.taskCard,
              {
                backgroundColor: surfaceColor,
                borderColor: cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.taskCheckbox,
                { backgroundColor: primaryColor, borderColor: primaryColor },
              ]}
            >
              <Icon name="check" size={10} color="#FFFFFF" decorative />
            </View>

            <View style={styles.taskTextCol}>
              <Text
                style={[
                  styles.taskTitle,
                  styles.taskCompletedText,
                  { color: textMuted },
                ]}
                numberOfLines={1}
              >
                Morning Adhkār & Witr
              </Text>
              <View style={styles.taskMetaRow}>
                <View style={[styles.metaChip, { backgroundColor: chipBg }]}>
                  <Text style={[styles.metaChipText, { color: primaryColor }]}>
                    After Fajr
                  </Text>
                </View>
                <Text style={[styles.taskSubtext, { color: textMuted }]}>
                  Dhikr
                </Text>
              </View>
            </View>
          </View>

          {/* Task 2: Active / Pending */}
          <View
            style={[
              styles.taskCard,
              {
                backgroundColor: surfaceColor,
                borderColor: cardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.taskCheckbox,
                { borderColor: primaryColor, backgroundColor: 'transparent' },
              ]}
            />

            <View style={styles.taskTextCol}>
              <Text
                style={[styles.taskTitle, { color: textColor }]}
                numberOfLines={1}
              >
                Read Sūrat Al-Kahf
              </Text>
              <View style={styles.taskMetaRow}>
                <View style={[styles.metaChip, { backgroundColor: chipBg }]}>
                  <Text style={[styles.metaChipText, { color: primaryColor }]}>
                    Before Maghrib
                  </Text>
                </View>
                <View style={styles.priorityDotContainer}>
                  <View style={[styles.priorityDot, { backgroundColor: accentColor }]} />
                  <Text style={[styles.taskSubtext, { color: textMuted }]}>
                    2 subtasks
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Floating Action Button (+) */}
        <View style={[styles.fabButton, { backgroundColor: primaryColor }]}>
          <Icon name="plus" size={18} color="#FFFFFF" decorative />
        </View>

        {/* 6. Authentic App Bottom Navigation Bar */}
        <View
          style={[
            styles.bottomNavBar,
            {
              backgroundColor: isDark
                ? 'rgba(12, 16, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              borderTopColor: cardBorder,
            },
          ]}
        >
          {/* Tab 1: Planner (Active) */}
          <View style={styles.navItem}>
            <Icon name="home" size={15} color={primaryColor} decorative />
            <Text style={[styles.navLabel, { color: primaryColor, fontWeight: '700' }]}>
              Planner
            </Text>
          </View>

          {/* Tab 2: Calendar */}
          <View style={styles.navItem}>
            <Icon name="calendar" size={15} color={textMuted} decorative />
            <Text style={[styles.navLabel, { color: textMuted }]}>
              Calendar
            </Text>
          </View>

          {/* Tab 3: Journal */}
          <View style={styles.navItem}>
            <Icon name="journal" size={15} color={textMuted} decorative />
            <Text style={[styles.navLabel, { color: textMuted }]}>
              Journal
            </Text>
          </View>

          {/* Tab 4: Settings */}
          <View style={styles.navItem}>
            <Icon name="settings" size={15} color={textMuted} decorative />
            <Text style={[styles.navLabel, { color: textMuted }]}>
              Settings
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    borderRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  phoneChassis: {
    width: 268,
    height: 524,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  topNotchContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 10,
  },
  speakerPill: {
    width: 44,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.35)',
  },
  appHeader: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  mosqueBadge: {
    opacity: 0.85,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  hijriDate: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  gregorianDate: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  heroPrayerCard: {
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  prayerNameCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  prayerNameEnglish: {
    fontSize: 16,
    fontWeight: '800',
  },
  prayerTimeText: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(128, 128, 128, 0.22)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  prayerPillBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 4,
    zIndex: 10,
  },
  prayerCapsule: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 0.8,
  },
  capsuleName: {
    fontSize: 8.5,
    marginBottom: 1,
  },
  capsuleTime: {
    fontSize: 7.5,
    fontWeight: '500',
  },
  tasksSection: {
    paddingHorizontal: 12,
    marginTop: 10,
    zIndex: 10,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tasksTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  taskCountText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    padding: 8,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  taskCheckbox: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTextCol: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  taskCompletedText: {
    textDecorationLine: 'line-through',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaChip: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  metaChipText: {
    fontSize: 8,
    fontWeight: '600',
  },
  priorityDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  priorityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  taskSubtext: {
    fontSize: 8,
  },
  fabButton: {
    position: 'absolute',
    bottom: 52,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 20,
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 0.8,
    paddingBottom: 2,
    zIndex: 15,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navLabel: {
    fontSize: 8,
  },
});
