import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Dimensions,
  I18nManager,
} from 'react-native';
import type {
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import type { PrayerTabViewModel } from '@/services/types';

export interface PrayerTabBarProps {
  tabs: PrayerTabViewModel[];
  selectedPrayer: Prayer | null;
  onSelectPrayer: (prayer: Prayer) => void;
  expandedPrayer?: Prayer | null;
}

export const PRAYER_IMAGES: Record<Prayer, ImageSourcePropType> = {
  FAJR: require('../../../assets/prayers/fajr.png'),
  DHUHR: require('../../../assets/prayers/dhuhr.png'),
  ASR: require('../../../assets/prayers/asr.png'),
  MAGHRIB: require('../../../assets/prayers/maghrib.png'),
  ISHA: require('../../../assets/prayers/isha.png'),
};

interface PrayerTabItemProps {
  tab: PrayerTabViewModel;
  isSelected: boolean;
  isCurrent: boolean;
  isPast: boolean;
  onPress: () => void;
}

// ─── Layout ──────────────────────────────────────────────────────────────────
/** Height of the tab row */
const TAB_BAR_HEIGHT = 40;

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
  size = 20,
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

// ─── PrayerTabItem ────────────────────────────────────────────────────────────
function PrayerTabItem({
  tab,
  isSelected,
  isCurrent,
  isPast,
  onPress,
}: PrayerTabItemProps) {
  const { colors, typography, isDark } = useTheme();

  const nameColor = isSelected
    ? colors.textOnPrimary
    : isCurrent
    ? colors.primary
    : isPast
    ? colors.textTertiary
    : colors.textPrimary;

  const timeColor = isSelected
    ? colors.primary
    : isCurrent
    ? colors.primary
    : isPast
    ? colors.textTertiary
    : colors.textSecondary;

  const hasTasks = (tab.scheduledTasks?.length ?? 0) > 0 || (tab.anytimeTasks?.length ?? 0) > 0;

  return (
    <View style={styles.tabColumn}>
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${tab.name}, ${tab.startTime}${isCurrent ? ', current prayer' : ''}`}
        testID={`prayer-tab-${tab.prayer.toLowerCase()}`}
        style={({ pressed }) => [
          styles.tabCapsule,
          {
            backgroundColor: isSelected
              ? colors.primary
              : pressed
              ? colors.surfaceSecondary
              : isDark
              ? 'rgba(28, 35, 43, 0.95)'
              : 'rgba(255, 255, 255, 0.96)',
            borderColor: isSelected
              ? colors.primary
              : isCurrent
              ? colors.primary
              : colors.border,
            borderWidth: 1.5,
            shadowColor: isSelected ? colors.primary : '#000',
            shadowOpacity: isSelected ? 0.2 : 0.04,
          },
        ]}
      >
        <View style={styles.tabContent}>
          <PrayerTabIcon
            prayer={tab.prayer}
            isSelected={isSelected}
            isCurrent={isCurrent}
            isPast={isPast}
            size={18}
          />
          <Text
            style={[
              typography.labelMedium,
              styles.tabName,
              { color: nameColor },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {tab.name}
          </Text>

          {hasTasks && (
            <View
              style={[
                styles.taskDot,
                { backgroundColor: isSelected ? colors.textOnPrimary : colors.primary },
              ]}
              importantForAccessibility="no"
              accessible={false}
            />
          )}
        </View>
      </Pressable>

      {/* Visible start time directly beneath the capsule per today1.png */}
      <Text
        style={[
          typography.caption,
          styles.visibleTimeText,
          { color: timeColor, fontWeight: isSelected || isCurrent ? '700' : '500' },
        ]}
        importantForAccessibility="no"
        accessible={false}
      >
        {tab.startTime}
      </Text>
    </View>
  );
}

// ─── PrayerTabBar ─────────────────────────────────────────────────────────────
export function PrayerTabBar({ tabs, selectedPrayer, onSelectPrayer }: PrayerTabBarProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.outerWrapper,
        {
          paddingBottom: spacing.xs,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.track,
          {
            paddingHorizontal: spacing.md,
            marginTop: spacing.xs,
            marginBottom: spacing.xs,
          },
        ]}
        accessibilityRole="tablist"
        testID="prayer-tab-bar"
      >
        {tabs.map(tab => {
          const isSelected = tab.prayer === selectedPrayer;
          const isCurrent = tab.temporalState === 'CURRENT';
          const isPast = tab.temporalState === 'PAST';
          return (
            <PrayerTabItem
              key={tab.prayer}
              tab={tab}
              isSelected={isSelected}
              isCurrent={isCurrent}
              isPast={isPast}
              onPress={() => onSelectPrayer(tab.prayer)}
            />
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
  },

  track: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  tabColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },

  tabCapsule: {
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },

  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  prayerIconContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabName: {
    fontSize: 12,
    flexShrink: 1,
    marginStart: 4,
  },

  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginStart: 4,
  },

  visibleTimeText: {
    fontSize: 11,
    marginTop: 4,
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
