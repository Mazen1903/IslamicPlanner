import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  PastelOptionCard,
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
        {/* 1. Prayer & Location */}
        <PastelOptionCard
          label="Prayer & Location"
          subtitle="Set your location, calculation method and prayer time preferences"
          icon="mosque"
          iconColor={colors.primary}
          badgeColor={colors.primaryLight}
          customBadge={<SettingsHubMosqueIcon size={44} />}
          onPress={() => router.push('/(tabs)/settings/prayer-location' as any)}
          testID="settings-row-prayer-location"
        />

        {/* 2. Planner */}
        <PastelOptionCard
          label="Planner"
          subtitle="Customize how your day and tasks work"
          icon="calendar-check"
          iconColor={colors.primary}
          badgeColor={colors.primaryLight}
          customBadge={<SettingsHubPlannerIcon size={44} />}
          onPress={() => router.push('/(tabs)/settings/planning-day' as any)}
          testID="settings-row-planning-day"
        />

        {/* 3. Notifications */}
        <PastelOptionCard
          label="Notifications"
          subtitle="Set reminders and alerts"
          icon="bell"
          iconColor={colors.danger}
          badgeColor={colors.dangerSurface}
          customBadge={<SettingsHubNotificationsIcon size={44} />}
          onPress={() => router.push('/(tabs)/settings/notifications' as any)}
          testID="settings-row-notifications"
        />

        {/* 4. Appearance */}
        <PastelOptionCard
          label="Appearance"
          subtitle="Theme, colors and display options"
          icon="palette"
          iconColor={colors.info}
          badgeColor={colors.prayerFajr}
          customBadge={<SettingsHubAppearanceIcon size={44} />}
          onPress={() => router.push('/(tabs)/settings/appearance' as any)}
          testID="settings-row-appearance"
        />

        {/* 5. Calendar */}
        <PastelOptionCard
          label="Calendar"
          subtitle="Gregorian & Hijri settings, Islamic events"
          icon="calendar"
          iconColor={colors.info}
          badgeColor={colors.prayerIsha}
          customBadge={<SettingsHubCalendarIcon size={44} />}
          onPress={() => router.push('/(tabs)/settings/hijri-calendar' as any)}
          testID="settings-row-hijri-calendar"
        />

        {/* 6. Account & Sync */}
        <PastelOptionCard
          label="Account & Sync"
          subtitle="Backup, devices and account settings"
          icon="user"
          iconColor={colors.primary}
          badgeColor={colors.primaryLight}
          customBadge={<SettingsHubAccountIcon size={44} />}
          onPress={() => router.push('/(tabs)/settings/journal-privacy' as any)}
          testID="settings-row-account"
        />

        {/* 8. Premium */}
        <PastelOptionCard
          label="Premium"
          subtitle="Unlock additional features"
          icon="crown"
          iconColor={colors.warning}
          badgeColor={colors.prayerAsr}
          customBadge={<SettingsHubPremiumIcon size={44} />}
          onPress={() => setPremiumModalVisible(true)}
          testID="settings-row-premium"
        />

        {/* 9. About */}
        <PastelOptionCard
          label="About"
          subtitle="Help, privacy and app information"
          icon="info"
          iconColor={colors.info}
          badgeColor={colors.prayerIsha}
          customBadge={<SettingsHubAboutIcon size={44} />}
          onPress={() => router.push('/(tabs)/settings/about' as any)}
          testID="settings-row-about"
        />

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
