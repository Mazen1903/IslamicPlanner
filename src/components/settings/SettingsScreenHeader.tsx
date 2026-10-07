import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { AppBackButton } from '@/components/common/AppBackButton';

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
      <AppBackButton
        onPress={handleBack}
        accessibilityLabel="Go back"
        directional
        testID={backTestID}
        size={36}
      />
      <Text
        style={[styles.title, typography.headlineMedium, { color: colors.textPrimary }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
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
