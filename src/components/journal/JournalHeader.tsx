import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { StreakRing } from './StreakRing';
import { SoftCircleButton } from './JournalCard';
import { AppHeroHeader } from '@/components/common/AppHeroHeader';
import { JOURNAL_ACTION_ASSETS } from '@/constants/journalIconAssets';
import type { SaveState } from '@/services/journal/JournalAutosaveController';

export interface JournalHeaderProps {
  gregorianDisplay: string;
  hijriDisplay: string;
  saveState?: SaveState;
  isHistorical?: boolean;
  lockEnabled?: boolean;
  streak?: number;
  onHistoryPress?: () => void;
  onPrivacyPress?: () => void;
  onReturnToTodayPress?: () => void;
  testID?: string;
}

export function JournalHeader({
  gregorianDisplay,
  hijriDisplay,
  isHistorical = false,
  lockEnabled = false,
  streak,
  onHistoryPress,
  onPrivacyPress,
  onReturnToTodayPress,
  testID = 'journal-header',
}: JournalHeaderProps) {
  const router = useRouter();
  const { colors, spacing, typography, touchTargets, radii, isDark } = useTheme();

  // Dynamic greeting based on device hour
  const getGreeting = () => {
    if (isHistorical) return 'Past Reflection 📜';
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning Reflection 🌅';
    if (hour < 17) return 'Afternoon Reflection ☀️';
    return 'Evening Muhasaba 🌙';
  };

  const handleSettingsPress = () => {
    router.push('/settings/journal-privacy' as any);
  };

  return (
    <AppHeroHeader
      testID={testID}
      artworkSize={{ width: 180, height: 110 }}
      artworkPosition={{ right: -4, bottom: -6 }}
      contentMaxWidth="62%"
      title={
        <View style={styles.titleColumn}>
          <Text style={[typography.headlineLarge, styles.titleText, { color: colors.textPrimary }]}>
            Journal
          </Text>
          <Text
            style={[
              typography.bodyMedium,
              styles.greetingText,
              { color: colors.primary },
            ]}
            testID="journal-greeting-text"
          >
            {getGreeting()}
          </Text>
        </View>
      }
      rightElement={
        <View style={styles.actionGroup}>
          {onPrivacyPress && (
            <SoftCircleButton
              onPress={onPrivacyPress}
              icon={undefined}
              active={lockEnabled}
              activeBgColor={isDark ? 'rgba(15, 159, 74, 0.25)' : colors.primaryLight}
              iconColor={lockEnabled ? colors.primary : colors.textSecondary}
              accessibilityLabel={`Journal privacy. Biometric lock is ${lockEnabled ? 'enabled' : 'disabled'}.`}
              testID="journal-privacy-btn"
            >
              <Image
                source={JOURNAL_ACTION_ASSETS.headerLock}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
            </SoftCircleButton>
          )}

          <SoftCircleButton
            onPress={handleSettingsPress}
            icon={undefined}
            accessibilityLabel="Journal settings"
            testID="journal-settings-btn"
          >
            <Image
              source={JOURNAL_ACTION_ASSETS.headerSettings}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
          </SoftCircleButton>
        </View>
      }
      bottomElement={
        <View style={styles.bottomContainer}>
          {/* Streak Card (Today only) */}
          {streak !== undefined && !isHistorical && (
            <View style={[styles.streakRow, { marginBottom: spacing.sm }]}>
              <StreakRing streak={streak} onPress={onHistoryPress} testID="streak-banner" />
            </View>
          )}

          {/* Date Row */}
          <View style={styles.dateRow}>
            <View style={styles.dateTextContainer}>
              <Text
                style={[typography.bodyMedium, styles.gregorianDate, { color: colors.textPrimary }]}
                testID="journal-gregorian-date"
              >
                {gregorianDisplay}
              </Text>
              {hijriDisplay.length > 0 && (
                <Text
                  style={[typography.bodySmall, styles.hijriDate, { color: colors.textSecondary }]}
                  testID="journal-hijri-date"
                >
                  {hijriDisplay}
                </Text>
              )}
            </View>
          </View>

          {/* Historical return banner if viewing past entry */}
          {isHistorical && onReturnToTodayPress && (
            <View style={[styles.historicalBanner, { marginTop: spacing.sm }]}>
              <Pressable
                onPress={onReturnToTodayPress}
                accessibilityRole="button"
                accessibilityLabel="Return to today's entry"
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    backgroundColor: pressed ? colors.primaryLight : colors.surface,
                    borderColor: colors.primary,
                    minHeight: touchTargets.min,
                    borderRadius: radii.pill,
                  },
                ]}
                testID="journal-back-to-today"
              >
                <Icon name="chevron-left" size={16} color={colors.primary} decorative directional />
                <Text
                  style={[
                    typography.labelMedium,
                    { color: colors.primary, marginStart: spacing.xs },
                  ]}
                >
                  Back to Today
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  titleColumn: {
    justifyContent: 'center',
  },
  titleText: {
    letterSpacing: -0.5,
  },
  greetingText: {
    marginTop: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomContainer: {
    width: '100%',
    marginTop: 10,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateTextContainer: {
    flex: 1,
  },
  gregorianDate: {
    letterSpacing: -0.2,
  },
  hijriDate: {
    marginTop: 2,
  },
  historicalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
});
