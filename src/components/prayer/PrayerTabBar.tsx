import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import type { Prayer } from '@/constants/prayers';
import type { PrayerTabViewModel } from '@/services/types';

export interface PrayerTabBarProps {
  tabs: PrayerTabViewModel[];
  selectedPrayer: Prayer | null;
  onSelectPrayer: (prayer: Prayer) => void;
}

export function PrayerTabBar({
  tabs,
  selectedPrayer,
  onSelectPrayer,
}: PrayerTabBarProps) {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.divider,
          borderBottomWidth: 1,
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
          <Pressable
            key={tab.prayer}
            onPress={() => onSelectPrayer(tab.prayer)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${tab.name}, ${tab.startTime}${isCurrent ? ', current prayer' : ''}`}
            style={({ pressed }) => [
              styles.tab,
              {
                minHeight: touchTargets.min,
                paddingVertical: spacing.sm,
                backgroundColor: pressed
                  ? colors.surfaceSecondary
                  : isSelected
                  ? colors.primaryLight
                  : 'transparent',
                borderRadius: radii.md,
              },
            ]}
            testID={`prayer-tab-${tab.prayer.toLowerCase()}`}
          >
            {isCurrent && (
              <View
                importantForAccessibility="no"
                accessible={false}
                style={[
                  styles.currentIndicator,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            )}
            <Text
              style={[
                typography.labelMedium,
                {
                  color: isSelected
                    ? colors.primary
                    : isCurrent
                    ? colors.textPrimary
                    : isPast
                    ? colors.textTertiary
                    : colors.textSecondary,
                  fontWeight: isSelected || isCurrent ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {tab.name}
            </Text>
            <Text
              style={[
                typography.caption,
                {
                  color: isSelected
                    ? colors.primaryDark
                    : isPast
                    ? colors.textTertiary
                    : colors.textTertiary,
                  marginTop: spacing.xxs,
                },
              ]}
              numberOfLines={1}
            >
              {tab.startTime}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    position: 'relative',
  },
  currentIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 4,
  },
});