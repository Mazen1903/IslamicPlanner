import React, { useState } from 'react';
import { View, Text, Switch, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { TimePickerInput } from '../DateTimePickerInput';
import { formatReminderOffset, DEFAULT_ANYTIME_REMINDER_TIME } from '@/domain/notification/reminderRule';

export interface ReminderInlinePanelProps {
  reminders: number[];
  onAddReminder: (offsetMinutes: number) => void;
  onRemoveReminder: (offsetMinutes: number) => void;
  scheduleMode?: string | null;
  reminderTimeOfDay: string | null;
  onSetReminderTimeOfDay: (timeStr: string | null) => void;
  onOpenReminderSettings: () => void;
}

const COMMON_PRESETS = [0, -10, -15, -30, -60];

export function ReminderInlinePanel({
  reminders,
  onAddReminder,
  onRemoveReminder,
  scheduleMode,
  reminderTimeOfDay,
  onSetReminderTimeOfDay,
  onOpenReminderSettings,
}: ReminderInlinePanelProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  const [customMinutes, setCustomMinutes] = useState('15');

  const isAnytime = scheduleMode === 'ANYTIME_TODAY';
  const hasReminders = reminders.length > 0 || (isAnytime && !!reminderTimeOfDay);

  const handleToggleMaster = (enabled: boolean) => {
    if (!enabled) {
      // Clear all
      for (const r of reminders) {
        onRemoveReminder(r);
      }
      if (isAnytime) {
        onSetReminderTimeOfDay(null);
      }
    } else {
      // Turn on default
      if (isAnytime) {
        onSetReminderTimeOfDay(DEFAULT_ANYTIME_REMINDER_TIME);
      } else if (reminders.length === 0) {
        onAddReminder(0);
      }
    }
  };

  return (
    <View style={styles.container} testID="reminder-inline-panel">
      {/* Top Toggle Switch */}
      <View
        style={[
          styles.switchRow,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
          },
        ]}
      >
        <View style={styles.switchTextContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 15, fontWeight: '700' }]}>
            Reminder Notifications
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {hasReminders ? `${reminders.length} reminder(s) active` : 'Off'}
          </Text>
        </View>

        <Switch
          value={hasReminders}
          onValueChange={handleToggleMaster}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
          accessibilityLabel="Toggle reminder notifications"
          testID="reminder-master-switch-inline"
        />
      </View>

      {/* Anytime Time of Day Picker */}
      {isAnytime && (
        <View style={{ marginTop: spacing.sm }}>
          <TimePickerInput
            value={reminderTimeOfDay ?? DEFAULT_ANYTIME_REMINDER_TIME}
            onChange={t => onSetReminderTimeOfDay(t)}
            label="Remind at Time of Day"
            testID="anytime-reminder-time-input"
          />
        </View>
      )}

      {/* Quick Offset Chips */}
      {!isAnytime && hasReminders && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
            Quick Presets:
          </Text>
          <View style={styles.presetsRow}>
            {COMMON_PRESETS.map(offset => {
              const isSelected = reminders.includes(offset);
              const label = formatReminderOffset(offset);
              return (
                <Pressable
                  key={offset}
                  onPress={() => {
                    if (isSelected) {
                      onRemoveReminder(offset);
                    } else {
                      onAddReminder(offset);
                    }
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Reminder ${label}`}
                  testID={`reminder-preset-${offset}`}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Custom Duration Input Row */}
      {!isAnytime && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: spacing.sm,
          }}
        >
          <TextInput
            value={customMinutes}
            onChangeText={setCustomMinutes}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Custom reminder duration"
            testID="custom-reminder-input"
            style={[
              typography.bodyMedium,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: radii.sm,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 8,
                width: 70,
                textAlign: 'center',
                fontWeight: '600',
              },
            ]}
          />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>min before</Text>
          <Pressable
            onPress={() => {
              const val = parseInt(customMinutes, 10);
              if (!isNaN(val) && val > 0) {
                onAddReminder(-val);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Add custom reminder"
            testID="add-custom-reminder-btn"
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[typography.labelSmall, { color: colors.textOnPrimary, fontWeight: '700' }]}>
              Add
            </Text>
          </Pressable>
        </View>
      )}

      {/* Active reminders badges list */}
      {reminders.length > 0 && (
        <View style={styles.activeRemindersRow}>
          {reminders.map(offset => (
            <View
              key={offset}
              style={[
                styles.activeBadge,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  borderRadius: radii.pill,
                },
              ]}
              testID={`reminder-chip-${offset}`}
            >
              <Text style={[typography.caption, { color: colors.primaryDark, fontWeight: '700', marginEnd: 4 }]}>
                {formatReminderOffset(offset)}
              </Text>
              <Pressable
                onPress={() => onRemoveReminder(offset)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Remove reminder ${formatReminderOffset(offset)}`}
              >
                <Icon name="close" size={14} color={colors.primaryDark} decorative />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Button to open Full Reminder Page */}
      <Pressable
        onPress={onOpenReminderSettings}
        accessibilityRole="button"
        accessibilityLabel="Open full reminder settings"
        testID="open-full-reminder-settings-btn"
        style={({ pressed }) => [
          styles.fullSettingsBtn,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing.md,
            marginTop: spacing.sm,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={styles.fullSettingsContent}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
              Advanced Reminder Settings ›
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
              Sounds, Enhanced alarms, Prayer Adhan anchors & repeating nags
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.primary} directional decorative />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  switchTextContainer: {
    flex: 1,
    marginEnd: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
  },
  activeRemindersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullSettingsBtn: {
    borderWidth: 1,
  },
  fullSettingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
