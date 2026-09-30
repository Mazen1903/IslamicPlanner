import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  SettingsGridTile,
  SettingsPastelHeader,
  SettingsQuoteCard,
  SettingsHubMosqueIcon,
  SettingsHubPlannerIcon,
  SettingsHubNotificationsIcon,
  SettingsHubAppearanceIcon,
  SettingsHubCalendarIcon,
  SettingsHubAccountIcon,
  SettingsHubPremiumIcon,
  SettingsHubAboutIcon,
  SettingsPremCrownIcon,
  SettingsCheckCircleIcon,
} from '@/components/settings';

export default function SettingsHubScreen() {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();
  const router = useRouter();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  const hubItems = [
    {
      id: 'prayer-location',
      label: 'Prayer & Location',
      badge: <SettingsHubMosqueIcon size={44} />,
      bgColor: colors.primaryLight,
      onPress: () => router.push('/(tabs)/settings/prayer-location' as any),
      testID: 'settings-row-prayer-location',
    },
    {
      id: 'planning-day',
      label: 'Planner',
      badge: <SettingsHubPlannerIcon size={44} />,
      bgColor: colors.primaryLight,
      onPress: () => router.push('/(tabs)/settings/planning-day' as any),
      testID: 'settings-row-planning-day',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      badge: <SettingsHubNotificationsIcon size={44} />,
      bgColor: colors.dangerSurface,
      onPress: () => router.push('/(tabs)/settings/notifications' as any),
      testID: 'settings-row-notifications',
    },
    {
      id: 'appearance',
      label: 'Appearance',
      badge: <SettingsHubAppearanceIcon size={44} />,
      bgColor: colors.prayerFajr,
      onPress: () => router.push('/(tabs)/settings/appearance' as any),
      testID: 'settings-row-appearance',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      badge: <SettingsHubCalendarIcon size={44} />,
      bgColor: colors.prayerIsha,
      onPress: () => router.push('/(tabs)/settings/hijri-calendar' as any),
      testID: 'settings-row-hijri-calendar',
    },
    {
      id: 'account',
      label: 'Account & Sync',
      badge: <SettingsHubAccountIcon size={44} />,
      bgColor: colors.primaryLight,
      onPress: () => router.push('/(tabs)/settings/journal-privacy' as any),
      testID: 'settings-row-account',
    },
    {
      id: 'premium',
      label: 'Premium',
      badge: <SettingsHubPremiumIcon size={44} />,
      bgColor: colors.prayerAsr,
      onPress: () => setPremiumModalVisible(true),
      testID: 'settings-row-premium',
    },
    {
      id: 'about',
      label: 'About',
      badge: <SettingsHubAboutIcon size={44} />,
      bgColor: colors.prayerIsha,
      onPress: () => router.push('/(tabs)/settings/about' as any),
      testID: 'settings-row-about',
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsPastelHeader
        title="Settings"
        subtitle="Customize your app experience"
        testID="section-header-settings"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl }]}
        testID="settings-hub"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {hubItems.map((item) => (
            <SettingsGridTile
              key={item.id}
              label={item.label}
              badge={item.badge}
              bgColor={item.bgColor}
              onPress={item.onPress}
              testID={item.testID}
              style={styles.gridTile}
            />
          ))}
        </View>

        {/* Bottom Quran Inspiration Quote */}
        <SettingsQuoteCard
          quote="“And whoever relies upon Allah then He is sufficient for him.”"
          citation="Surah At-Talaq (65:3)"
        />
      </ScrollView>

      {/* Premium Feature Sheet */}
      {premiumModalVisible && (
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                padding: spacing.xl,
              },
              shadows.elevated,
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={{ marginBottom: spacing.sm, alignItems: 'center' }}>
              <SettingsPremCrownIcon size={56} />
            </View>
            <Text style={[typography.headlineLarge, { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.xs }]}>
              Islamic Planner Premium
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 }]}>
              More features. A more purposeful you.
            </Text>

            <View style={{ width: '100%', marginTop: spacing.md, gap: 8 }}>
              {['Custom day start time', 'Advanced planner settings', 'More themes and backgrounds', 'Additional widgets', 'Advanced statistics'].map((f, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <SettingsCheckCircleIcon size={18} style={{ marginRight: 8 }} />
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '500' }]}>{f}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[
                styles.modalCloseBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.pill,
                  marginTop: spacing.lg,
                  minHeight: touchTargets.comfortable,
                },
              ]}
              onPress={() => setPremiumModalVisible(false)}
            >
              <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>Done</Text>
            </Pressable>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  gridTile: {
    width: '48.2%',
    marginBottom: 12,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalCrownBadge: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
