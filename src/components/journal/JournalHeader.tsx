import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { JournalSaveStatus } from './JournalSaveStatus';
import type { SaveState } from '@/services/journal/JournalAutosaveController';

export interface JournalHeaderProps {
  gregorianDisplay: string;
  hijriDisplay: string;
  saveState: SaveState;
  isHistorical?: boolean;
  lockEnabled?: boolean;
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
  onHistoryPress,
  onPrivacyPress,
  onReturnToTodayPress,
  testID = 'journal-header',
}: JournalHeaderProps) {
  const { colors, spacing, typography, touchTargets, radii } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]} testID={testID}>
      {/* Top row: Title and Action Buttons */}
      <View style={styles.topRow}>
        <View>
          <Text style={[typography.displaySmall, { color: colors.textPrimary }]}>
            Journal
          </Text>
        </View>

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
                  backgroundColor: lockEnabled ? colors.primaryLight : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              testID="journal-privacy-btn"
            >
              <Icon
                name="lock"
                size={20}
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
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              testID="journal-history-btn"
            >
              <Icon name="clock" size={20} color={colors.textSecondary} decorative />
            </Pressable>
          )}
        </View>
      </View>

      {/* Date row */}
      <View style={styles.dateRow}>
        <View style={styles.dateTextContainer}>
          <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]} testID="journal-gregorian-date">
            {gregorianDisplay}
          </Text>
          {hijriDisplay.length > 0 && (
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xxs }]} testID="journal-hijri-date">
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
                borderRadius: radii.sm,
              },
            ]}
            testID="journal-back-to-today"
          >
            <Icon name="chevron-left" size={16} color={colors.primary} decorative directional />
            <Text style={[typography.labelMedium, { color: colors.primary, marginStart: spacing.xs }]}>
              Back to Today
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 6,
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
    paddingHorizontal: 12,
    borderWidth: 1,
  },
});
