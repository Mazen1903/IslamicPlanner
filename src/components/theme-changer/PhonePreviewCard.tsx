import React from 'react';
import { View, Text, StyleSheet, Image, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/components/common/Icon';
import type { ThemeGalleryItem } from './types';

interface PhonePreviewCardProps {
  item: ThemeGalleryItem;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PhonePreviewCard({ item, style, testID }: PhonePreviewCardProps) {
  const isDark = item.isDark ?? false;
  const textColor = isDark ? '#F8FAFC' : '#1E293B';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const pillInactiveBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';

  // If this theme has an explicit high-res full screen preview image (like Scenery Theme1..10)
  if (item.previewAsset) {
    return (
      <View style={[styles.cardShadow, style]} testID={testID}>
        <View style={[styles.phoneChassis, { backgroundColor: isDark ? '#141419' : '#FFFFFF' }]}>
          <Image
            source={item.previewAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </View>
      </View>
    );
  }

  // Otherwise render the dynamic live UI preview (Pure Color, Texture, etc.)
  return (
    <View style={[styles.cardShadow, style]} testID={testID}>
      <View
        style={[
          styles.phoneChassis,
          { backgroundColor: item.background || (isDark ? '#121217' : '#FFFFFF') },
        ]}
      >
        {/* If Texture theme, overlay the subtle rice paper pattern */}
        {item.category === 'texture' && (
          <Image
            source={require('../../../assets/themes/gallery/texture_paper_bg.png')}
            style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}
            resizeMode="repeat"
          />
        )}

        {/* If Scenery wallpaper without full preview */}
        {item.category === 'scenery' && item.wallpaperAsset && (
          <Image
            source={item.wallpaperAsset}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        {/* Top Header & Filter Chips */}
        <View style={styles.topHeader}>
          <View style={styles.pillRow}>
            {/* Active Chip 'All' */}
            <View style={[styles.pillChipActive, { backgroundColor: item.color }]}>
              <Text style={styles.pillTextActive}>All</Text>
            </View>

            {/* Inactive Chips */}
            <View style={[styles.pillChipInactive, { backgroundColor: pillInactiveBg }]}>
              <Text style={[styles.pillTextInactive, { color: textColor }]}>Personal</Text>
            </View>
            <View style={[styles.pillChipInactive, { backgroundColor: pillInactiveBg }]}>
              <Text style={[styles.pillTextInactive, { color: textColor }]}>Deen</Text>
            </View>
            <View style={[styles.pillChipInactive, { backgroundColor: pillInactiveBg }]}>
              <Text style={[styles.pillTextInactive, { color: textColor }]}>Hygiene</Text>
            </View>
            <View style={[styles.pillChipInactive, { backgroundColor: pillInactiveBg }]}>
              <Text style={[styles.pillTextInactive, { color: textColor }]}>Suc...</Text>
            </View>

            {/* Overflow icon */}
            <View style={styles.moreIconContainer}>
              <Text style={[styles.moreDotsText, { color: textMuted }]}>⋮</Text>
            </View>
          </View>
        </View>

        {/* Body Content */}
        {item.category === 'scenery' ? (
          /* Scenery list placeholder */
          <View style={styles.sceneryContent}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeaderText, { color: textColor }]}>Today</Text>
              <Text style={[styles.sectionHeaderTriangle, { color: textMuted }]}>▲</Text>
            </View>

            {/* 3 Frosted Task Bars */}
            {[1, 2, 3].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.frostedTaskRow,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.taskCircleCheckbox,
                    { borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' },
                  ]}
                />
                <View
                  style={[
                    styles.taskLinePlaceholder,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                />
                <View style={styles.bookmarkIcon}>
                  <Icon
                    name="flag"
                    size={13}
                    color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}
                    decorative
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* Empty State Illustration for Pure Color & Texture */
          <View style={styles.illustrationContainer}>
            <Image
              source={require('../../../assets/themes/gallery/preview_illustration_trans.png')}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Bottom Floating Action Button '+' */}
        <View style={[styles.fabButton, { backgroundColor: item.color }]}>
          <Text style={styles.fabPlusText}>+</Text>
        </View>

        {/* Bottom Navigation Bar */}
        <View
          style={[
            styles.bottomNavBar,
            {
              backgroundColor: isDark ? 'rgba(20, 20, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
        >
          {/* Menu / Hamburger Icon */}
          <View style={styles.navItemSmall}>
            <Text style={[styles.hamburgerIcon, { color: textMuted }]}>☰</Text>
          </View>

          {/* Tasks Tab (Active) */}
          <View style={styles.navItem}>
            <Icon name="checkbox" size={17} color={item.color} decorative />
            <Text style={[styles.navLabel, { color: item.color, fontWeight: '700' }]}>Tasks</Text>
          </View>

          {/* Calendar Tab */}
          <View style={styles.navItem}>
            <Icon name="calendar" size={17} color={textMuted} decorative />
            <Text style={[styles.navLabel, { color: textMuted }]}>Calendar</Text>
          </View>

          {/* Mine Tab */}
          <View style={styles.navItem}>
            <Icon name="user" size={17} color={textMuted} decorative />
            <Text style={[styles.navLabel, { color: textMuted }]}>Mine</Text>
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
    shadowOpacity: 0.16,
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
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  topHeader: {
    paddingTop: 16,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillChipActive: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  pillChipInactive: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillTextInactive: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreIconContainer: {
    marginLeft: 'auto',
    paddingHorizontal: 4,
  },
  moreDotsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sceneryContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderTriangle: {
    fontSize: 8,
  },
  frostedTaskRow: {
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  taskCircleCheckbox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  taskLinePlaceholder: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  bookmarkIcon: {
    opacity: 0.6,
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    zIndex: 5,
  },
  illustrationImage: {
    width: 150,
    height: 165,
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
    shadowOpacity: 0.25,
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
