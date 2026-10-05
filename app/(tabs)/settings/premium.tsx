import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '@/theme';
import {
  SettingsPastelHeader,
  SettingsPremCrownIcon,
  SettingsPremGiftMissionIcon,
  SettingsCheckCircleIcon,
} from '@/components/settings';

export const PREMIUM_NOTIFY_KEY = 'premium_notify_me_v1';

const PREMIUM_FEATURES = [
  'Custom day start time (e.g. 4:00 AM)',
  'Midnight day boundary (12:00 AM)',
  'Early access to new upcoming features',
];

const FREE_FEATURES = [
  'Fajr-based day start',
  'Precise prayer calculations',
  'All 125 task icons & categories',
  'Full theme gallery & dark mode',
  'Encrypted journal & streak tracker',
  'Offline JSON backup & restore',
];

const PREMIUM_PLAN_FEATURES = [
  'Everything in Free',
  'Midnight day boundary',
  'Custom day start boundary',
  'Future features in development',
];

export default function PremiumScreen() {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();
  const router = useRouter();

  const [isNotified, setIsNotified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(PREMIUM_NOTIFY_KEY)
      .then(val => {
        if (active) {
          setIsNotified(val === 'true');
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleToggleNotify = async () => {
    if (isNotified) {
      Alert.alert(
        'Notification Preference',
        "You're currently set to be notified when Premium launches. Would you like to opt out?",
        [
          { text: 'Keep Notification', style: 'cancel' },
          {
            text: 'Opt Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await SecureStore.deleteItemAsync(PREMIUM_NOTIFY_KEY);
                setIsNotified(false);
              } catch (err) {
                console.warn('[PremiumScreen] Failed to remove notification key:', err);
              }
            },
          },
        ]
      );
    } else {
      try {
        await SecureStore.setItemAsync(PREMIUM_NOTIFY_KEY, 'true');
        setIsNotified(true);
        Alert.alert(
          'You are on the list! 🌙',
          'Thank you for your interest. We will notify you as soon as premium features become available.',
          [{ text: 'Got it' }]
        );
      } catch (err) {
        console.warn('[PremiumScreen] Failed to save notification key:', err);
      }
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsPastelHeader
        title="Premium"
        subtitle="Unlock more to enhance your Islamic journey."
        showBack
        showMosqueArt
        backTestID="premium-back-button"
        onBack={() => router.back()}
        testID="section-header-premium"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl }]}
        testID="premium-screen"
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1: GO PREMIUM HERO */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.lg,
              marginTop: spacing.sm,
              marginBottom: spacing.md,
            },
            shadows.card,
          ]}
          testID="premium-hero-card"
        >
          <View style={styles.heroHeader}>
            <View style={{ marginRight: spacing.md }}>
              <SettingsPremCrownIcon size={44} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
                Islamic Planner Premium
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                In active development. Coming soon to all users.
              </Text>
            </View>
          </View>

          {/* Feature List */}
          <View style={[styles.featureList, { marginTop: spacing.md }]}>
            {PREMIUM_FEATURES.map((item, idx) => (
              <View key={idx} style={styles.featureRow}>
                <SettingsCheckCircleIcon size={20} style={{ marginRight: 10 }} />
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1, fontWeight: '500' }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          {/* Notify Me When Available Button */}
          <Pressable
            onPress={handleToggleNotify}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={isNotified ? "You're on the list" : "Notify Me When Available"}
            style={({ pressed }) => [
              styles.upgradeBtn,
              {
                backgroundColor: isNotified
                  ? colors.primaryLight
                  : pressed
                  ? colors.primaryPressed
                  : colors.primary,
                borderColor: colors.primary,
                borderWidth: isNotified ? 1.5 : 0,
                borderRadius: radii.pill,
                minHeight: touchTargets.comfortable,
                marginTop: spacing.lg,
              },
              shadows.elevated,
            ]}
            testID="premium-upgrade-button"
          >
            <Text
              style={[
                typography.labelLarge,
                {
                  color: isNotified ? colors.primary : colors.textOnPrimary,
                  fontWeight: '700',
                },
              ]}
            >
              {isNotified ? "You're on the list ✓" : 'Notify Me When Available'}
            </Text>
          </Pressable>
        </View>

        {/* SECTION 2: COMPARE PLANS */}
        <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700', marginVertical: spacing.sm }]}>
          Compare Plans
        </Text>

        <View style={styles.compareRow}>
          {/* Free Card */}
          <View
            style={[
              styles.planCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                marginRight: spacing.xs,
              },
              shadows.card,
            ]}
          >
            <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm }]}>
              Free
            </Text>
            {FREE_FEATURES.map((feat, idx) => (
              <View key={idx} style={styles.planFeatureRow}>
                <View
                  style={[
                    styles.greyCheckCircle,
                    { backgroundColor: colors.border, borderRadius: 8, marginRight: 8 },
                  ]}
                />
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                  {feat}
                </Text>
              </View>
            ))}
          </View>

          {/* Premium Card */}
          <View
            style={[
              styles.planCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                borderWidth: 1.5,
                borderRadius: radii.card,
                padding: spacing.md,
                marginLeft: spacing.xs,
              },
              shadows.card,
            ]}
          >
            <View style={styles.planHeaderRow}>
              <SettingsPremCrownIcon size={20} style={{ marginRight: 6 }} />
              <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                Premium
              </Text>
            </View>
            {PREMIUM_PLAN_FEATURES.map((feat, idx) => (
              <View key={idx} style={styles.planFeatureRow}>
                <SettingsCheckCircleIcon size={16} style={{ marginRight: 8 }} />
                <Text style={[typography.caption, { color: colors.textPrimary, flex: 1, fontWeight: '500' }]}>
                  {feat}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CARD 3: SUPPORT OUR MISSION */}
        <View
          style={[
            styles.missionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginTop: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
            },
            shadows.card,
          ]}
          testID="support-mission-card"
        >
          <View style={{ marginRight: spacing.md }}>
            <SettingsPremGiftMissionIcon size={40} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
              Support Our Mission
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Your support helps us keep the app growing and serve more people around the world.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroCard: {
    borderWidth: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareRow: {
    flexDirection: 'row',
  },
  planCard: {
    flex: 1,
    borderWidth: 1,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  greyCheckCircle: {
    width: 14,
    height: 14,
  },
  missionCard: {
    borderWidth: 1,
  },
});
