import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JournalSaveStatus } from './JournalSaveStatus';
import { StreakRing } from './StreakRing';
import { AppHeroHeader } from '@/components/common/AppHeroHeader';
import type { SaveState } from '@/services/journal/JournalAutosaveController';

export interface JournalHeaderProps {
  gregorianDisplay: string;
  hijriDisplay: string;
  saveState: SaveState;
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
  saveState,
  isHistorical = false,
  lockEnabled = false,
  streak,
  onHistoryPress,
  onPrivacyPress,
  onReturnToTodayPress,
  testID = 'journal-header',
}: JournalHeaderProps) {
  const { colors, spacing, typography, touchTargets, radii, isDark } = useTheme();

  // Dynamic greeting based on device hour
  const getGreeting = () => {
    if (isHistorical) return 'Past Reflection 📜';
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning Reflection 🌅';
    if (hour < 17) return 'Afternoon Reflection ☀️';
    return 'Evening Muhasaba 🌙';
  };

  return (
    <AppHeroHeader
      testID={testID}
      title={
        <View style={styles.titleColumn}>
          <Text style={[typography.headlineLarge, styles.titleText, { color: colors.textPrimary }]}>
            Journal
          </Text>
          <Text
            style={[
              typography.labelSmall,
              { color: colors.primaryDark, marginTop: spacing.xxs, fontWeight: '700' },
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
            <Pressable
              onPress={onPrivacyPress}
              accessibilityRole="button"
              accessibilityLabel={`Journal privacy. Biometric lock is ${lockEnabled ? 'enabled' : 'disabled'}.`}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  minWidth: touchTargets.min,
                  minHeight: touchTargets.min,
                  borderRadius: radii.pill,
                  backgroundColor: lockEnabled
                    ? (isDark ? 'rgba(15, 159, 74, 0.25)' : colors.primaryLight)
                    : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              testID="journal-privacy-btn"
            >
              <Icon
                name="lock"
                size={18}
                color={lockEnabled ? colors.primary : colors.textSecondary}
                decorative
              />
            </Pressable>
          )}

          {onHistoryPress && (
            <Pressable
              onPress={onHistoryPress}
              accessibilityRole="button"
              accessibilityLabel="View journal history"
              style={({ pressed }) => [
                styles.iconButton,
                {
                  minWidth: touchTargets.min,
                  minHeight: touchTargets.min,
                  borderRadius: radii.pill,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              testID="journal-history-btn"
            >
              <Icon name="clock" size={18} color={colors.textSecondary} decorative />
            </Pressable>
          )}
        </View>
      }
      bottomElement={
        <View style={styles.bottomContainer}>
          {/* Streak Ring Row */}
          {streak !== undefined && !isHistorical && (
            <View style={[styles.streakRow, { marginBottom: spacing.xs }]}>
              <StreakRing streak={streak} onPress={onHistoryPress} testID="streak-banner" />
            </View>
          )}

          {/* Date & Save Status Row */}
          <View style={styles.dateRow}>
            <View style={styles.dateTextContainer}>
              <Text
                style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '700' }]}
                testID="journal-gregorian-date"
              >
                {gregorianDisplay}
              </Text>
              {hijriDisplay.length > 0 && (
                <Text
                  style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xxs }]}
                  testID="journal-hijri-date"
                >
                  {hijriDisplay}
                </Text>
              )}
            </View>

            <View style={styles.saveStatusContainer}>
              <JournalSaveStatus state={saveState} />
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
                    borderColor: colors.border,
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
                    { color: colors.primary, marginStart: spacing.xs, fontWeight: '700' },
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
    fontWeight: '800',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContainer: {
    width: '100%',
    marginTop: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dateTextContainer: {
    flex: 1,
  },
  saveStatusContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 2,
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
