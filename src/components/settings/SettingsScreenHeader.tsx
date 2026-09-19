import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

export interface SettingsScreenHeaderProps {
  title: string;
  onBack?: () => void;
  backTestID?: string;
}

export function SettingsScreenHeader({
  title,
  onBack,
  backTestID = 'settings-back-button',
}: SettingsScreenHeaderProps) {
  const { colors, spacing, typography, touchTargets } = useTheme();
  const router = useRouter();

  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={[
        styles.header,
        {
          minHeight: touchTargets.min,
          paddingHorizontal: spacing.md,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable
        onPress={handleBack}
        style={[
          styles.backButton,
          { width: touchTargets.min, height: touchTargets.min },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID={backTestID}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="chevron-left" size={24} color={colors.textPrimary} decorative directional />
      </Pressable>
      <Text
        style={[styles.title, typography.headlineMedium, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={{ width: touchTargets.min }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
