import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Image,
  Animated,
  type StyleProp,
  type ViewStyle,
  type ImageSourcePropType,
} from 'react-native';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import type { PrayerTabViewModel } from '@/services/types';

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

  // Layout tracking for the smooth sliding pill indicator inside modeSegment
  const [tabLayouts, setTabLayouts] = React.useState<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const [translateX] = React.useState(() => new Animated.Value(0));
  const [indicatorWidth] = React.useState(() => new Animated.Value(0));
  const [indicatorOpacity] = React.useState(() => new Animated.Value(0));
  const isInitializedRef = React.useRef(false);

  const handleTabLayout = React.useCallback((prayer: Prayer, layout: { x: number; y: number; width: number; height: number }) => {
    setTabLayouts(prev => {
      if (prev[prayer]?.x === layout.x && prev[prayer]?.width === layout.width) {
        return prev;
      }
      return { ...prev, [prayer]: layout };
    });
  }, []);

  React.useEffect(() => {
    if (!selectedPrayer || !tabLayouts[selectedPrayer]) {
      return;
    }

    const target = tabLayouts[selectedPrayer];

    if (!isInitializedRef.current) {
      translateX.setValue(target.x);
      indicatorWidth.setValue(target.width);
      indicatorOpacity.setValue(1);
      isInitializedRef.current = true;
      return;
    }

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: target.x,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.spring(indicatorWidth, {
        toValue: target.width,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.timing(indicatorOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [selectedPrayer, tabLayouts, translateX, indicatorWidth, indicatorOpacity]);

  return (
    <View style={styles.outerWrapper}>
      {/* ── Outer Bordered Segment Container from TasbeehModeSelector ── */}
      <View
        style={[
          styles.modeSegment,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : colors.surface,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
          },
        ]}
        accessibilityRole="tablist"
        testID="prayer-tab-bar"
      >
        {/* Smooth Sliding Solid Green Highlighter for active prayer */}
        {selectedPrayer && tabLayouts[selectedPrayer] ? (
          <Animated.View
            pointerEvents="none"
            testID="prayer-tab-sliding-pill"
            style={[
              styles.slidingPill,
              {
                transform: [{ translateX }],
                width: indicatorWidth,
                opacity: indicatorOpacity,
                backgroundColor: colors.primary,
              },
            ]}
          />
        ) : null}

        {tabs.map(tab => {
          const active = tab.prayer === selectedPrayer;
          const isCurrent = tab.temporalState === 'CURRENT';
          const isPast = tab.temporalState === 'PAST';
          const isDragTarget = tab.prayer === dragTargetPrayer;

          const textColor = active
            ? colors.textOnPrimary
            : isCurrent
            ? colors.primary
            : isDragTarget
            ? colors.warning
            : isPast
            ? colors.textTertiary
            : isDark
            ? colors.textSecondary
            : colors.textSecondary;

          const timeColor = active
            ? colors.textOnPrimary
            : isCurrent
            ? colors.primary
            : isPast
            ? colors.textTertiary
            : isDark
            ? colors.textSecondary
            : colors.textSecondary;

          return (
            <TouchableOpacity
              key={tab.prayer}
              testID={`prayer-tab-${tab.prayer.toLowerCase()}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${tab.name}, ${tab.startTime}${
                isCurrent ? ', current prayer' : ''
              }`}
              onLayout={e => handleTabLayout(tab.prayer, e.nativeEvent.layout)}
              style={[
                styles.modeTab,
                // Solid green highlight fallback before layout measurement
                active && !tabLayouts[selectedPrayer] && {
                  backgroundColor: colors.primary,
                },
                // When current prayer is not the active tab, indicate with subtle primary border
                !active && isCurrent && {
                  borderColor: colors.primary,
                  borderWidth: 1.5,
                },
                isDragTarget && {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : colors.surfaceSecondary,
                  borderColor: colors.warning,
                  borderWidth: 1.5,
                },
              ]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onSelectPrayer(tab.prayer);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.tabContent}>
                <View style={styles.tabHeaderRow}>
                  <PrayerTabIcon
                    prayer={tab.prayer}
                    isSelected={active}
                    isCurrent={isCurrent}
                    isPast={isPast}
                    size={16}
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
                </View>

                {/* Start time directly inside tab so green highlighter covers the entire prayer */}
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
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {tab.startTime}
                </Text>
              </View>
            </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
    zIndex: 1,
  },

  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  modeTabText: {
    fontSize: 12,
    letterSpacing: -0.2,
  },

  visibleTimeText: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },

  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 16,
    zIndex: 0,
  },

  prayerIconContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
