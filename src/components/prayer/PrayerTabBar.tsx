import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
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

const PRAYER_IMAGES: Record<Prayer, any> = {
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
/** Height of the individual bordered capsule (icon + name zone) */
const CAPSULE_H = 38;
/** Height of the time label that sits below each capsule */
const TIME_SLOT_H = 18;
/** Gap between capsule bottom and time text */
const TIME_GAP = 4;

export function PrayerTabIcon({
  prayer,
  isSelected,
  isCurrent,
  isPast,
  size = 20,
}: {
  prayer: Prayer;
  isSelected?: boolean;
  isCurrent?: boolean;
  isPast?: boolean;
  size?: number;
}) {
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
          borderRadius: 6,
        },
      ]}
      accessibilityRole="none"
      importantForAccessibility="no"
    >
      <Image
        source={imageSource}
        style={{
          width: size,
          height: size,
          borderRadius: 6,
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
  const { colors, typography, radii } = useTheme();

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

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${tab.name}, ${tab.startTime}${isCurrent ? ', current prayer' : ''}`}
      testID={`prayer-tab-${tab.prayer.toLowerCase()}`}
      style={styles.itemPressable}
    >
      <View style={styles.itemWrapper}>
        {/* ── Bordered capsule: icon + name only ────────────────────────── */}
        <View
          style={[
            styles.capsule,
            {
              backgroundColor: isSelected ? colors.primary : colors.surface,
              borderColor: isSelected
                ? colors.primary
                : isCurrent
                ? colors.primary
                : colors.border,
              borderWidth: 1,
              borderRadius: radii.pill,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <View importantForAccessibility="no" accessible={false} style={styles.a11yHelper} />
          <PrayerTabIcon
            prayer={tab.prayer}
            isSelected={isSelected}
            isCurrent={isCurrent}
            isPast={isPast}
            size={20}
          />
          <Text
            style={[
              typography.labelMedium,
              styles.tabName,
              { color: nameColor, fontWeight: isSelected || isCurrent ? '700' : '600' },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {tab.name}
          </Text>
        </View>

        {/* ── Time label: below each capsule, always visible matching today1.png ── */}
        <View style={styles.timeSlot}>
          <Text
            style={[
              typography.caption,
              styles.timeText,
              { color: timeColor, fontWeight: isSelected || isCurrent ? '700' : '500' },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {tab.startTime}
          </Text>
        </View>
      </View>
    </Pressable>
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
          backgroundColor: colors.background,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={styles.container}
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

  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  itemPressable: {
    flex: 1,
    marginHorizontal: 2,
  },

  itemWrapper: {
    width: '100%',
    alignItems: 'center',
  },

  capsule: {
    width: '100%',
    height: CAPSULE_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },

  a11yHelper: { width: 0, height: 0 },

  prayerIconContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabName: {
    fontSize: 11.5,
    flexShrink: 1,
    marginStart: 4,
  },

  timeSlot: {
    height: TIME_SLOT_H,
    marginTop: TIME_GAP,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
