import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Animated,
  type StyleProp,
  type ViewStyle,
  type ImageSourcePropType,
} from 'react-native';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import type { PrayerTabViewModel } from '@/services/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface PrayerTabBarProps {
  tabs: PrayerTabViewModel[];
  selectedPrayer: Prayer | null;
  onSelectPrayer: (prayer: Prayer) => void;
  expandedPrayer?: Prayer | null;
  dragTargetPrayer?: Prayer | null;
}

export const PRAYER_IMAGES: Record<Prayer, ImageSourcePropType> = {
  FAJR: require('../../../assets/prayers/fajr.png'),
  DHUHR: require('../../../assets/prayers/dhuhr.png'),
  ASR: require('../../../assets/prayers/asr.png'),
  MAGHRIB: require('../../../assets/prayers/maghrib.png'),
  ISHA: require('../../../assets/prayers/isha.png'),
};

export interface PrayerTabIconProps {
  prayer: Prayer;
  isSelected?: boolean;
  isCurrent?: boolean;
  isPast?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PrayerTabIcon({
  prayer,
  isSelected,
  isCurrent,
  isPast,
  size = 24,
  style,
  testID,
}: PrayerTabIconProps) {
  const opacity = isPast && !isSelected && !isCurrent ? 0.6 : 1;
  const imageSource = PRAYER_IMAGES[prayer];

  if (!imageSource) {
    return null;
  }

  return (
    <View
      style={[
        styles.prayerIconContainer,
        {
          width: size,
          height: size,
          opacity,
        },
        style,
      ]}
      accessibilityRole="none"
      importantForAccessibility="no"
      testID={testID}
    >
      <Image
        source={imageSource}
        style={{
          width: size,
          height: size,
        }}
        resizeMode="contain"
        accessibilityRole="none"
        importantForAccessibility="no"
      />
    </View>
  );
}

export function PrayerTabBar({
  tabs,
  selectedPrayer,
  onSelectPrayer,
  dragTargetPrayer,
}: PrayerTabBarProps) {
  const { colors, isDark, typography } = useTheme();

  return (
    <View style={styles.outerWrapper}>
      {/* ── Outer Bordered Segment Container from TasbeehModeSelector ── */}
      <View
        style={[
          styles.modeSegment,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
          },
        ]}
        accessibilityRole="tablist"
        testID="prayer-tab-bar"
      >

        {tabs.map(tab => {
          const active = tab.prayer === selectedPrayer;
          const isCurrent = tab.temporalState === 'CURRENT';
          const isPast = tab.temporalState === 'PAST';
          const isDragTarget = tab.prayer === dragTargetPrayer;

          const textColor = active
            ? isDark
              ? '#4ADE80'
              : '#15803D'
            : isDragTarget
            ? '#F59E0B'
            : isPast
            ? colors.textTertiary
            : isDark
            ? '#94A3B8'
            : '#64748B';

          return (
            <TouchableOpacity
              key={tab.prayer}
              testID={`prayer-tab-${tab.prayer.toLowerCase()}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${tab.name}, ${tab.startTime}${
                isCurrent ? ', current prayer' : ''
              }`}
              style={[
                styles.modeTab,
                active && {
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.22)' : '#DCFCE7',
                  borderColor: isDark ? '#4ADE80' : '#16A34A',
                },
                !active && isCurrent && {
                  borderColor: isDark ? '#22C55E' : '#16A34A',
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.08)' : '#F0FDF4',
                },
                isDragTarget && {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7',
                  borderColor: '#F59E0B',
                },
              ]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onSelectPrayer(tab.prayer);
              }}
              activeOpacity={0.75}
            >
              {isCurrent && (
                <View
                  style={[
                    styles.currentIndicatorDot,
                    { backgroundColor: isDark ? '#4ADE80' : '#16A34A' },
                  ]}
                  testID="prayer-current-indicator"
                  importantForAccessibility="no"
                  accessible={false}
                />
              )}
              <PrayerTabIcon
                prayer={tab.prayer}
                isSelected={active}
                isCurrent={isCurrent}
                isPast={isPast}
                size={20}
              />
              <Text
                style={[
                  styles.modeTabText,
                  {
                    color: textColor,
                    fontWeight: active || isCurrent ? '700' : '600',
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Start times row directly aligned under each tab ── */}
      <View style={styles.timeRow}>
        {tabs.map(tab => {
          const active = tab.prayer === selectedPrayer;
          const isCurrent = tab.temporalState === 'CURRENT';
          const isPast = tab.temporalState === 'PAST';
          const timeColor = active
            ? isDark
              ? '#4ADE80'
              : '#15803D'
            : isCurrent
            ? isDark
              ? '#4ADE80'
              : '#15803D'
            : isPast
            ? colors.textTertiary
            : isDark
            ? '#94A3B8'
            : '#64748B';

          return (
            <View key={tab.prayer} style={styles.timeColumn}>
              <Text
                style={[
                  typography.caption,
                  styles.visibleTimeText,
                  {
                    color: timeColor,
                    fontWeight: active || isCurrent ? '700' : '500',
                  },
                ]}
                importantForAccessibility="no"
                accessible={false}
              >
                {tab.startTime}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outerWrapper: {
    width: '100%',
    paddingBottom: 6,
  },

  modeSegment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },

  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },

  modeTabText: {
    fontSize: 12.5,
    letterSpacing: -0.2,
  },

  currentIndicatorDot: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  prayerIconContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },


  timeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    paddingHorizontal: 4,
    gap: 4,
    marginTop: 2,
  },

  timeColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  visibleTimeText: {
    fontSize: 12,
    textAlign: 'center',
  },

  hiddenTimeSlot: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },

  hiddenTimeText: {
    fontSize: 0.1,
    color: 'transparent',
  },
});
