import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { purchaseService, type SubscriptionPackage } from '@/services/purchase/PurchaseService';
import type { PremiumFeature } from '@/domain/entitlement/types';

export interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  gatedFeature?: PremiumFeature | null;
}

interface FeatureHighlight {
  key: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}

const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    key: 'TASK_ICONS_EXTENDED',
    icon: 'mosque',
    title: '125+ Tailored Islamic & Life Icons',
    description: 'Expanded visual library for every Sunnah, habit, and daily chore.',
  },
  {
    key: 'ISLAMIC_THEMES_EXTENDED',
    icon: 'palette',
    title: '9 Rich Islamic Aesthetic Themes',
    description: 'Fajr dawn, Rawdah emerald, Sacred Tawaf, and ambient night themes.',
  },
  {
    key: 'REMINDER_ENHANCED',
    icon: 'bell-ring',
    title: 'Full-Screen Lock Alarms & Custom Sounds',
    description: 'Persistent prayer-relative alarms, singing bowl, and gentle Adhan tones.',
  },
  {
    key: 'PLANNING_DAY_CUSTOM',
    icon: 'clock-time-four',
    title: 'Custom Day-Start & Midnight Boundaries',
    description: 'Flexibility to match your night shift, Tahajjud, or circadian routine.',
  },
  {
    key: 'PRIORITY',
    icon: 'fire',
    title: 'Priority Levels & Habit Streaks',
    description: 'Focus on high-value tasks and build lasting consistency.',
  },
  {
    key: 'JOURNAL_PHOTOS',
    icon: 'book-open-page-variant',
    title: 'Encrypted Photo Journal & Mood Analytics',
    description: 'Capture daily reflections, photos, and spiritual growth trends.',
  },
];

export function PaywallSheet({
  visible,
  onClose,
  onSuccess,
  gatedFeature,
}: PaywallSheetProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();

  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('islamic_planner_annual');
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setIsLoading(true);

    purchaseService
      .getPackages()
      .then(pkgs => {
        if (!active) return;
        setPackages(pkgs);
        const popular = pkgs.find(p => p.isPopular);
        if (popular) {
          setSelectedPackageId(popular.id);
        } else if (pkgs.length > 0) {
          setSelectedPackageId(pkgs[0].id);
        }
      })
      .catch(err => {
        console.warn('[PaywallSheet] Failed to load packages:', err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible]);

  const selectedPackage = packages.find(p => p.id === selectedPackageId);

  const handlePurchase = useCallback(async () => {
    if (!selectedPackageId) return;
    setIsPurchasing(true);
    try {
      const result = await purchaseService.purchasePackage(selectedPackageId);
      if (result.success) {
        if (result.isPremium) {
          Alert.alert(
            'Welcome to Premium! 🌙',
            'All premium features, themes, icons, and reminders are now unlocked.',
            [
              {
                text: 'Start Exploring',
                onPress: () => {
                  onSuccess?.();
                  onClose();
                },
              },
            ]
          );
        }
      } else if (!result.userCancelled && result.error) {
        Alert.alert('Purchase Error', result.error);
      }
    } catch (err: any) {
      Alert.alert('Purchase Failed', err?.message ?? 'An unexpected error occurred.');
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedPackageId, onSuccess, onClose]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const result = await purchaseService.restorePurchases();
      if (result.success && result.isPremium) {
        Alert.alert('Purchases Restored', 'Your Premium access has been verified and restored.', [
          {
            text: 'OK',
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]);
      } else {
        Alert.alert('No Active Purchases', 'No active subscription found for this account.');
      }
    } catch (err: any) {
      Alert.alert('Restore Failed', err?.message ?? 'Failed to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  }, [onSuccess, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="paywall-sheet-modal"
    >
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
        testID="paywall-sheet"
        accessibilityViewIsModal={true}
      >
        {/* Header Bar */}
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close paywall"
            testID="paywall-close-button"
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View style={styles.heroSection}>
            <View
              style={[
                styles.crownBadge,
                { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
            >
              <MaterialCommunityIcons name="crown" size={32} color={colors.primary} />
            </View>
            <Text
              accessibilityRole="header"
              style={[
                typography.headlineLarge,
                { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md },
              ]}
            >
              Unlock Islamic Planner Premium
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: spacing.xs,
                  paddingHorizontal: spacing.sm,
                },
              ]}
            >
              Elevate your daily worship with prayer-anchored routines, widgets, custom alarms, and themes.
            </Text>
          </View>

          {/* Feature Highlights */}
          <View
            style={[
              styles.featuresCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                marginTop: spacing.lg,
              },
              shadows.card,
            ]}
          >
            {FEATURE_HIGHLIGHTS.map(f => {
              const isHighlight = gatedFeature && gatedFeature === f.key;
              return (
                <View
                  key={f.key}
                  style={[
                    styles.featureItemRow,
                    isHighlight && {
                      backgroundColor: colors.primaryLight,
                      borderRadius: radii.sm,
                      paddingHorizontal: spacing.xs,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.featureIconBox,
                      {
                        backgroundColor: isHighlight ? colors.primary : colors.surfaceSecondary,
                        borderRadius: radii.sm,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={f.icon}
                      size={20}
                      color={isHighlight ? colors.textOnPrimary : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, marginStart: spacing.sm }}>
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: colors.textPrimary, fontWeight: '600' },
                      ]}
                    >
                      {f.title}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textSecondary, marginTop: 1 },
                      ]}
                    >
                      {f.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Plan Selector */}
          <Text
            style={[
              typography.headlineMedium,
              { color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
            ]}
          >
            Choose Your Plan
          </Text>

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <View style={styles.packagesContainer}>
              {packages.map(pkg => {
                const isSelected = pkg.id === selectedPackageId;
                return (
                  <Pressable
                    key={pkg.id}
                    testID={`package-option-${pkg.tier.toLowerCase()}`}
                    accessibilityRole="radio"
                    accessibilityLabel={`${pkg.title}, ${pkg.priceString}`}
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => setSelectedPackageId(pkg.id)}
                    style={({ pressed }) => [
                      styles.packageCard,
                      {
                        backgroundColor: isSelected
                          ? colors.surfaceElevated
                          : pressed
                          ? colors.surfaceSecondary
                          : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: radii.card,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                      },
                      isSelected ? shadows.elevated : shadows.card,
                    ]}
                  >
                    <View style={styles.packageCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View
                          style={[
                            styles.radioCircle,
                            {
                              borderColor: isSelected ? colors.primary : colors.textTertiary,
                              backgroundColor: isSelected ? colors.primary : 'transparent',
                            },
                          ]}
                        >
                          {isSelected ? (
                            <View
                              style={[
                                styles.radioInnerDot,
                                { backgroundColor: colors.textOnPrimary },
                              ]}
                            />
                          ) : null}
                        </View>
                        <View style={{ marginStart: spacing.sm, flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text
                              style={[
                                typography.bodyLarge,
                                { color: colors.textPrimary, fontWeight: '700' },
                              ]}
                            >
                              {pkg.title}
                            </Text>
                            {pkg.isPopular ? (
                              <View
                                style={[
                                  styles.badgePill,
                                  { backgroundColor: colors.primary, marginStart: spacing.xs },
                                ]}
                              >
                                <Text
                                  style={[
                                    typography.caption,
                                    { color: colors.textOnPrimary, fontWeight: '700' },
                                  ]}
                                >
                                  POPULAR
                                </Text>
                              </View>
                            ) : null}
                            {pkg.savingsBadge ? (
                              <View
                                style={[
                                  styles.badgePill,
                                  { backgroundColor: colors.surfaceSecondary, marginStart: spacing.xs },
                                ]}
                              >
                                <Text
                                  style={[
                                    typography.caption,
                                    { color: colors.primary, fontWeight: '600' },
                                  ]}
                                >
                                  {pkg.savingsBadge}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          {pkg.introductoryTrial ? (
                            <Text
                              style={[
                                typography.caption,
                                { color: colors.primary, fontWeight: '600', marginTop: 2 },
                              ]}
                            >
                              {pkg.introductoryTrial}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            typography.headlineMedium,
                            { color: colors.textPrimary, fontWeight: '700' },
                          ]}
                        >
                          {pkg.priceString}
                        </Text>
                        {pkg.pricePerMonthString ? (
                          <Text
                            style={[typography.caption, { color: colors.textSecondary }]}
                          >
                            {pkg.pricePerMonthString}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Action Button */}
          <Pressable
            onPress={handlePurchase}
            disabled={isPurchasing || isLoading}
            accessibilityRole="button"
            accessibilityLabel={
              selectedPackage?.introductoryTrial
                ? 'Start 7-day free trial'
                : 'Upgrade to Premium'
            }
            testID="paywall-action-button"
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                borderRadius: radii.pill,
                minHeight: touchTargets.comfortable,
                marginTop: spacing.md,
              },
              shadows.elevated,
            ]}
          >
            {isPurchasing ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text
                style={[
                  typography.labelLarge,
                  { color: colors.textOnPrimary, fontWeight: '700' },
                ]}
              >
                {selectedPackage?.introductoryTrial
                  ? 'Start 7-Day Free Trial'
                  : 'Upgrade to Premium'}
              </Text>
            )}
          </Pressable>

          {/* Footer Actions & Info */}
          <View style={[styles.footerSection, { marginTop: spacing.md, marginBottom: spacing.xl }]}>
            <Pressable
              onPress={handleRestore}
              disabled={isRestoring}
              accessibilityRole="button"
              accessibilityLabel="Restore purchases"
              testID="paywall-restore-button"
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, textDecorationLine: 'underline' },
                  ]}
                >
                  Restore Purchases
                </Text>
              )}
            </Pressable>

            <Text
              style={[
                typography.caption,
                { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm },
              ]}
            >
              Recurring billing. Cancel anytime in App Store / Google Play account settings at least 24 hours before renewal.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingVertical: 16,
  },
  heroSection: {
    alignItems: 'center',
  },
  crownBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresCard: {
    borderWidth: 1,
    gap: 12,
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packagesContainer: {
    marginTop: 4,
  },
  packageCard: {
    borderWidth: 1.5,
  },
  packageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSection: {
    alignItems: 'center',
  },
});
