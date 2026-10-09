import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme';
import { PremiumLanternIcon } from '@/components/common/PremiumLanternIcon';

export interface PremiumBadgeProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PremiumBadge({
  style,
  testID = 'premium-badge',
}: PremiumBadgeProps) {
  const { colors, typography, spacing, radii } = useTheme();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.xs + 2,
          paddingVertical: 2,
        },
        style,
      ]}
      accessible
      accessibilityLabel="Premium feature"
      testID={testID}
    >
      <PremiumLanternIcon
        size={13}
        style={{ marginEnd: 3 }}
      />
      <Text
        style={[
          typography.labelSmall,
          styles.badgeText,
          { color: colors.textSecondary },
        ]}
      >
        PREMIUM
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
