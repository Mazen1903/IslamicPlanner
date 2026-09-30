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
  const isDefaultTheme = item.id === 'default' || !item.wallpaperAsset;

  const textColor = isDefaultTheme
    ? isDark
      ? '#F8FAFC'
      : '#1E293B'
    : '#FFFFFF';
  const textMuted = isDefaultTheme
    ? isDark
      ? '#94A3B8'
      : '#64748B'
    : 'rgba(255, 255, 255, 0.8)';
  const pillInactiveBg = isDefaultTheme
    ? isDark
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.05)'
    : 'rgba(255, 255, 255, 0.22)';

  const frostedTaskBg = isDefaultTheme
    ? isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.04)'
    : isDark
    ? 'rgba(15, 23, 42, 0.45)'
    : 'rgba(255, 255, 255, 0.65)';

  const taskBorderColor = isDefaultTheme
    ? isDark
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(0, 0, 0, 0.08)'
    : 'rgba(255, 255, 255, 0.35)';

  const taskLineColor = isDefaultTheme
    ? isDark
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.1)'
    : 'rgba(255, 255, 255, 0.45)';

  return (
    <View style={[styles.cardShadow, style]} testID={testID}>
      <View
        style={[
          styles.phoneChassis,
          { backgroundColor: isDark ? '#121626' : '#F8FAFC' },
        ]}
      >
        {/* Full Wallpaper Background for Islamic Themes */}
        {item.wallpaperAsset && (
          <Image
            source={item.wallpaperAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        {/* Subtle Dark/Light Vignette for Readability if Wallpaper is Present */}
        {item.wallpaperAsset && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(10, 14, 28, 0.28)'
                  : 'rgba(0, 0, 0, 0.12)',
              },
            ]}
          />
        )}

        {/* Top Header & Filter Chips */}
        <View style={styles.topHeader}>
          <View style={styles.pillRow}>
            {/* Active Chip 'All' */}
            <View style={[styles.pillChipActive, { backgroundColor: primaryColor }]}>
              <Text style={styles.pillTextActive}>All</Text>
            </View>

            {/* Inactive Filter Chips */}
            <View style={[styles.pillChipInactive, { backgroundColor: pillInactiveBg }]}>
              <Text style={[styles.pillTextInactive, { color: textColor }]}>Personal</Text>
            </View>
            <View style={[styles.pillChipInactive, { backgroundColor: pillInactiveBg }]}>
              <Text style={[styles.pillTextInactive, { color: textColor }]}>Deen</Text>
            </View>
            <View style={[styles.pillChipInactive, { backgroundColor: pillInactiveBg }]}>
              <Text style={[styles.pillTextInactive, { color: textColor }]}>Worship</Text>
            </View>

            {/* Overflow icon */}
            <View style={styles.moreIconContainer}>
              <Text style={[styles.moreDotsText, { color: textMuted }]}>⋮</Text>
            </View>
          </View>
        </View>

        {/* Body Content: Frosted Task Rows Over Wallpaper */}
        <View style={styles.taskContentArea}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeaderText, { color: textColor }]}>Today</Text>
            <Text style={[styles.sectionHeaderTriangle, { color: textMuted }]}>▲</Text>
          </View>

          {/* 4 Frosted Interactive-style Task Bars */}
          {[1, 2, 3, 4].map((_, i) => (
            <View
              key={i}
              style={[
                styles.frostedTaskRow,
                {
                  backgroundColor: frostedTaskBg,
                  borderColor: taskBorderColor,
                },
              ]}
            >
              <View
                style={[
                  styles.taskCircleCheckbox,
                  { borderColor: primaryColor },
                ]}
              >
                {i === 0 && (
                  <View
                    style={[
                      styles.taskInnerCheckDot,
                      { backgroundColor: primaryColor },
                    ]}
                  />
                )}
              </View>

              <View
                style={[
                  styles.taskLinePlaceholder,
                  {
                    backgroundColor: taskLineColor,
                    width: i === 0 ? '60%' : i === 1 ? '75%' : i === 2 ? '50%' : '68%',
                  },
                ]}
              />

              <View style={styles.bookmarkIcon}>
                <Icon
                  name="flag"
                  size={12}
                  color={textMuted}
                  decorative
                />
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Floating Action Button '+' */}
        <View style={[styles.fabButton, { backgroundColor: primaryColor }]}>
          <Text style={styles.fabPlusText}>+</Text>
        </View>

        {/* Bottom Navigation Bar */}
        <View
          style={[
            styles.bottomNavBar,
            {
              backgroundColor: isDark
                ? 'rgba(18, 22, 38, 0.92)'
                : 'rgba(255, 255, 255, 0.92)',
              borderTopColor: isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          {/* Menu / Hamburger Icon */}
          <View style={styles.navItemSmall}>
            <Text style={[styles.hamburgerIcon, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              ☰
            </Text>
          </View>

          {/* Tasks Tab (Active) */}
          <View style={styles.navItem}>
            <Icon name="checkbox" size={17} color={primaryColor} decorative />
            <Text style={[styles.navLabel, { color: primaryColor, fontWeight: '700' }]}>
              Tasks
            </Text>
          </View>

          {/* Calendar Tab */}
          <View style={styles.navItem}>
            <Icon
              name="calendar"
              size={17}
              color={isDark ? '#94A3B8' : '#64748B'}
              decorative
            />
            <Text style={[styles.navLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Calendar
            </Text>
          </View>

          {/* Mine Tab */}
          <View style={styles.navItem}>
            <Icon
              name="user"
              size={17}
              color={isDark ? '#94A3B8' : '#64748B'}
              decorative
            />
            <Text style={[styles.navLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Mine
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
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  phoneChassis: {
    width: 268,
    height: 520,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  topHeader: {
    paddingTop: 16,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillChipActive: {
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  pillChipInactive: {
    paddingHorizontal: 7.5,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  pillTextInactive: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreIconContainer: {
    marginLeft: 'auto',
    paddingHorizontal: 4,
  },
  moreDotsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  taskContentArea: {
    paddingTop: 16,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionHeaderTriangle: {
    fontSize: 8,
  },
  frostedTaskRow: {
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 9,
    borderWidth: 1,
  },
  taskCircleCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInnerCheckDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  taskLinePlaceholder: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 10,
  },
  bookmarkIcon: {
    marginLeft: 'auto',
  },
  fabButton: {
    position: 'absolute',
    right: 18,
    bottom: 58,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
  },
  fabPlusText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '400',
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    zIndex: 20,
  },
  navItemSmall: {
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerIcon: {
    fontSize: 14,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 9,
    marginTop: 2,
  },
});
