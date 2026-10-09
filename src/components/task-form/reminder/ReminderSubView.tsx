import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { AppBackButton } from '@/components/common/AppBackButton';
import { PremiumLanternIcon } from '@/components/common/PremiumLanternIcon';
import type { ScheduleMode } from '@/features/task-form/types';
import type { ReminderPrayerAnchor } from '@/domain/task/types';
import { MAX_REMINDERS_PER_TASK, formatReminderOffset, formatPrayerAnchor } from '@/domain/notification/reminderRule';
import { getSoundById } from '@/constants/reminderSounds';
import { SoundPicker } from './SoundPicker';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { PaywallSheet } from '@/components/premium/PaywallSheet';

export interface ReminderSubViewProps {
  taskTitle: string;
  scheduleMode: ScheduleMode | null;
  reminderEnabled: boolean;
  reminders: number[];
  prayerAnchors: ReminderPrayerAnchor[];
  reminderTimeOfDay: string | null;
  reminderType: 'STANDARD' | 'ENHANCED';
  enhancedMode: 'FULL_SCREEN' | 'PERSISTENT';
  soundId: string;
  customSoundUri: string | null;
  playbackCount: 1 | 3 | 'LOOP';
  backgroundId: string;
  timeSensitive: boolean;
  nag: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onAddReminder: (offsetMinutes: number) => void;
  onRemoveReminder: (offsetMinutes: number) => void;
  onAddPrayerAnchor: (anchor: ReminderPrayerAnchor) => void;
  onRemovePrayerAnchor: (anchor: ReminderPrayerAnchor) => void;
  onSetTimeOfDay: (timeStr: string | null) => void;
  onSetReminderType: (type: 'STANDARD' | 'ENHANCED') => void;
  onSetEnhancedMode: (mode: 'FULL_SCREEN' | 'PERSISTENT') => void;
  onSetSoundId: (soundId: string, customUri?: string | null) => void;
  onSetTimeSensitive: (val: boolean) => void;
  onSetNag: (val: boolean) => void;
  onOpenAlarmStyle: () => void;
  onBack: () => void;
}

const PRESET_OFFSETS: { label: string; offsetMinutes: number }[] = [
  { label: 'At task time', offsetMinutes: 0 },
  { label: '5m before', offsetMinutes: -5 },
  { label: '10m before', offsetMinutes: -10 },
  { label: '15m before', offsetMinutes: -15 },
  { label: '30m before', offsetMinutes: -30 },
  { label: '1h before', offsetMinutes: -60 },
  { label: '1d before', offsetMinutes: -1440 },
];

const PRAYERS: ('FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA')[] = [
  'FAJR',
  'DHUHR',
  'ASR',
  'MAGHRIB',
  'ISHA',
];

const PRAYER_OFFSETS: { label: string; offsetMinutes: number }[] = [
  { label: 'At Adhan', offsetMinutes: 0 },
  { label: '15m before', offsetMinutes: -15 },
  { label: '30m before', offsetMinutes: -30 },
  { label: '15m after', offsetMinutes: 15 },
  { label: '30m after', offsetMinutes: 30 },
];

const ANYTIME_PRESETS: { label: string; time: string }[] = [
  { label: 'Morning (09:00)', time: '09:00' },
  { label: 'Noon (12:00)', time: '12:00' },
  { label: 'Evening (18:00)', time: '18:00' },
  { label: 'Night (21:00)', time: '21:00' },
];

export function ReminderSubView({
  taskTitle,
  scheduleMode,
  reminderEnabled,
  reminders,
  prayerAnchors,
  reminderTimeOfDay,
  reminderType,
  enhancedMode,
  soundId,
  timeSensitive,
  nag,
  onToggleEnabled,
  onAddReminder,
  onRemoveReminder,
  onAddPrayerAnchor,
  onRemovePrayerAnchor,
  onSetTimeOfDay,
  onSetReminderType,
  onSetEnhancedMode,
  onSetSoundId,
  onSetTimeSensitive,
  onSetNag,
  onOpenAlarmStyle,
  onBack,
}: ReminderSubViewProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();
  const { gate, paywallVisible, closePaywall, onPurchaseSuccess, isPremium, gatedFeature } = usePremiumGate();

  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [showCustomDrawer, setShowCustomDrawer] = useState(false);
  const [customMode, setCustomMode] = useState<'OFFSET' | 'PRAYER'>('OFFSET');

  // Custom offset state
  const [customAmount, setCustomAmount] = useState('20');
  const [customUnit, setCustomUnit] = useState<'MINUTES' | 'HOURS' | 'DAYS'>('MINUTES');
  const [customDirection, setCustomDirection] = useState<'BEFORE' | 'AFTER'>('BEFORE');

  // Custom prayer anchor state
  const [selectedPrayer, setSelectedPrayer] = useState<'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA'>('FAJR');
  const [selectedPrayerOffset, setSelectedPrayerOffset] = useState<number>(0);

  const totalActiveReminders = reminders.length + prayerAnchors.length;
  const isAtMaxCapacity = totalActiveReminders >= MAX_REMINDERS_PER_TASK;

  const handleTogglePreset = (offsetMinutes: number) => {
    if (!reminderEnabled) {
      onToggleEnabled(true);
    }
    const isSelected = reminders.includes(offsetMinutes);
    if (isSelected) {
      onRemoveReminder(offsetMinutes);
    } else {
      if (isAtMaxCapacity) {
        Alert.alert(
          'Maximum Reminders',
          `You can set up to ${MAX_REMINDERS_PER_TASK} reminders per task.`
        );
        return;
      }
      onAddReminder(offsetMinutes);
    }
  };

  const handleAddCustomOffset = () => {
    const num = parseInt(customAmount, 10);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a positive number.');
      return;
    }
    if (isAtMaxCapacity) {
      Alert.alert(
        'Maximum Reminders',
        `You can set up to ${MAX_REMINDERS_PER_TASK} reminders per task.`
      );
      return;
    }

    let multiplier = 1;
    if (customUnit === 'HOURS') multiplier = 60;
    if (customUnit === 'DAYS') multiplier = 1440;

    const totalMinutes = num * multiplier;
    const signedOffset = customDirection === 'BEFORE' ? -totalMinutes : totalMinutes;

    if (!reminderEnabled) {
      onToggleEnabled(true);
    }
    onAddReminder(signedOffset);
    setShowCustomDrawer(false);
  };

  const handleAddPrayerAnchor = () => {
    if (isAtMaxCapacity) {
      Alert.alert(
        'Maximum Reminders',
        `You can set up to ${MAX_REMINDERS_PER_TASK} reminders per task.`
      );
      return;
    }
    if (!reminderEnabled) {
      onToggleEnabled(true);
    }
    onAddPrayerAnchor({
      prayer: selectedPrayer,
      offsetMinutes: selectedPrayerOffset,
    });
    setShowCustomDrawer(false);
  };

  const activeSound = getSoundById(soundId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="reminder-subview">
      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <AppBackButton
          onPress={onBack}
          accessibilityLabel="Back to task details"
          testID="reminder-subview-back-btn"
          size={40}
        />

        <View style={styles.headerTitleContainer}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontWeight: '700' }]}>
            Reminder
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Set timely alerts and alarms
          </Text>
        </View>

        {/* Master Switch */}
        <View style={styles.headerSwitchContainer}>
          <Switch
            value={reminderEnabled}
            onValueChange={onToggleEnabled}
            trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel="Toggle reminders"
            testID="reminder-master-switch"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { opacity: reminderEnabled ? 1 : 0.6 }]}
        pointerEvents={reminderEnabled ? 'auto' : 'box-none'}
      >
        {/* Section 1: Quick Presets */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }]}>
            Remind Me
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {totalActiveReminders}/{MAX_REMINDERS_PER_TASK} reminders selected
          </Text>
        </View>

        <View style={styles.presetsGrid}>
          {PRESET_OFFSETS.map(preset => {
            const isSelected = reminders.includes(preset.offsetMinutes);
            return (
              <Pressable
                key={preset.offsetMinutes}
                onPress={() => handleTogglePreset(preset.offsetMinutes)}
                accessibilityRole="button"
                accessibilityLabel={`${preset.label}, ${isSelected ? 'selected' : 'not selected'}`}
                testID={`preset-chip-${preset.offsetMinutes}`}
                style={[
                  styles.presetChip,
                  {
                    borderRadius: radii.pill,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                  },
                ]}
              >
                {isSelected && (
                  <Icon
                    name="check"
                    size={14}
                    color={colors.textOnPrimary}
                    decorative
                    style={{ marginEnd: 4 }}
                  />
                )}
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}

          {/* + Custom Chip */}
          <Pressable
            onPress={() => setShowCustomDrawer(!showCustomDrawer)}
            accessibilityRole="button"
            accessibilityLabel="Add custom reminder offset"
            testID="preset-chip-custom"
            style={[
              styles.presetChip,
              {
                borderRadius: radii.pill,
                borderColor: showCustomDrawer ? colors.primary : colors.border,
                backgroundColor: showCustomDrawer ? colors.primaryLight ?? colors.surfaceSecondary : colors.surfaceSecondary,
                borderStyle: 'dashed',
              },
            ]}
          >
            <Icon
              name="plus"
              size={14}
              color={showCustomDrawer ? colors.primary : colors.textPrimary}
              decorative
              style={{ marginEnd: 4 }}
            />
            <Text
              style={[
                typography.labelMedium,
                {
                  color: showCustomDrawer ? colors.primary : colors.textPrimary,
                  fontWeight: '600',
                },
              ]}
            >
              + Custom
            </Text>
          </Pressable>
        </View>

        {/* Section 2: Custom Offset Drawer */}
        {showCustomDrawer && (
          <View
            style={[
              styles.customDrawerCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
              },
            ]}
            testID="custom-reminder-drawer"
          >
            {/* Custom Mode Tabs */}
            <View style={[styles.tabRow, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}>
              <Pressable
                onPress={() => setCustomMode('OFFSET')}
                style={[
                  styles.tabButton,
                  customMode === 'OFFSET' && [styles.activeTab, { shadowColor: colors.shadowElevated, backgroundColor: colors.surface, borderRadius: radii.md }],
                ]}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    { color: customMode === 'OFFSET' ? colors.textPrimary : colors.textSecondary, fontWeight: '600' },
                  ]}
                >
                  Relative to Task
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCustomMode('PRAYER')}
                style={[
                  styles.tabButton,
                  customMode === 'PRAYER' && [styles.activeTab, { shadowColor: colors.shadowElevated, backgroundColor: colors.surface, borderRadius: radii.md }],
                ]}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    { color: customMode === 'PRAYER' ? colors.textPrimary : colors.textSecondary, fontWeight: '600' },
                  ]}
                >
                  Relative to Prayer
                </Text>
              </Pressable>
            </View>

            {customMode === 'OFFSET' ? (
              <View style={styles.customForm}>
                <View style={styles.customInputRow}>
                  <TextInput
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    keyboardType="number-pad"
                    maxLength={3}
                    style={[
                      styles.numberInput,
                      typography.headlineMedium,
                      {
                        color: colors.textPrimary,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                        backgroundColor: colors.surfaceSecondary,
                      },
                    ]}
                    accessibilityLabel="Custom reminder duration"
                    testID="custom-reminder-amount-input"
                  />

                  {/* Unit Selector */}
                  <View style={styles.unitButtonsRow}>
                    {(['MINUTES', 'HOURS', 'DAYS'] as const).map(unit => (
                      <Pressable
                        key={unit}
                        onPress={() => setCustomUnit(unit)}
                        style={[
                          styles.unitButton,
                          {
                            borderRadius: radii.sm,
                            backgroundColor: customUnit === unit ? colors.primary : colors.surfaceSecondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: customUnit === unit ? colors.textOnPrimary : colors.textPrimary,
                              fontWeight: customUnit === unit ? '700' : '500',
                            },
                          ]}
                        >
                          {unit.charAt(0) + unit.slice(1).toLowerCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Direction Selector */}
                <View style={styles.directionRow}>
                  <Pressable
                    onPress={() => setCustomDirection('BEFORE')}
                    style={[
                      styles.directionButton,
                      {
                        borderRadius: radii.pill,
                        backgroundColor: customDirection === 'BEFORE' ? colors.primary : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        {
                          color: customDirection === 'BEFORE' ? colors.textOnPrimary : colors.textPrimary,
                          fontWeight: customDirection === 'BEFORE' ? '700' : '500',
                        },
                      ]}
                    >
                      Before
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setCustomDirection('AFTER')}
                    style={[
                      styles.directionButton,
                      {
                        borderRadius: radii.pill,
                        backgroundColor: customDirection === 'AFTER' ? colors.primary : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        {
                          color: customDirection === 'AFTER' ? colors.textOnPrimary : colors.textPrimary,
                          fontWeight: customDirection === 'AFTER' ? '700' : '500',
                        },
                      ]}
                    >
                      After
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleAddCustomOffset}
                  style={[styles.addButton, { backgroundColor: colors.primary, borderRadius: radii.md }]}
                  testID="add-custom-offset-btn"
                >
                  <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                    Add Reminder
                  </Text>
                </Pressable>
              </View>
            ) : (
              /* Custom Prayer Anchor Form */
              <View style={styles.customForm}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
                  SELECT PRAYER
                </Text>
                <View style={styles.prayerRow}>
                  {PRAYERS.map(p => (
                    <Pressable
                      key={p}
                      onPress={() => setSelectedPrayer(p)}
                      style={[
                        styles.prayerButton,
                        {
                          borderRadius: radii.md,
                          backgroundColor: selectedPrayer === p ? colors.primary : colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: selectedPrayer === p ? colors.textOnPrimary : colors.textPrimary,
                            fontWeight: selectedPrayer === p ? '700' : '500',
                          },
                        ]}
                      >
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>
                  TIMING
                </Text>
                <View style={styles.prayerOffsetGrid}>
                  {PRAYER_OFFSETS.map(item => (
                    <Pressable
                      key={item.offsetMinutes}
                      onPress={() => setSelectedPrayerOffset(item.offsetMinutes)}
                      style={[
                        styles.prayerOffsetChip,
                        {
                          borderRadius: radii.pill,
                          backgroundColor:
                            selectedPrayerOffset === item.offsetMinutes ? colors.primary : colors.surfaceSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: selectedPrayerOffset === item.offsetMinutes ? colors.textOnPrimary : colors.textPrimary,
                            fontWeight: selectedPrayerOffset === item.offsetMinutes ? '700' : '500',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={handleAddPrayerAnchor}
                  style={[styles.addButton, { backgroundColor: colors.primary, borderRadius: radii.md, marginTop: 14 }]}
                  testID="add-prayer-anchor-btn"
                >
                  <Text style={[typography.labelLarge, { color: colors.textOnPrimary, fontWeight: '700' }]}>
                    Add Prayer Reminder
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Section 3: Active Reminders List */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }]}>
            Active Reminders
          </Text>
        </View>

        {totalActiveReminders === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceSecondary, borderRadius: radii.md }]}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
              No reminders set. Select one or more presets above.
            </Text>
          </View>
        ) : (
          <View style={styles.activeList}>
            {reminders.map(offset => (
              <View
                key={`offset-${offset}`}
                style={[
                  styles.activeRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
              >
                <View style={styles.activeRowLeft}>
                  <Icon name="bell" size={16} color={colors.primary} decorative />
                  <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginStart: 10, fontWeight: '600' }]}>
                    {formatReminderOffset(offset)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => onRemoveReminder(offset)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete reminder ${formatReminderOffset(offset)}`}
                  testID={`delete-reminder-${offset}`}
                  style={styles.deleteButton}
                >
                  <Icon name="trash" size={16} color={colors.error} decorative />
                </Pressable>
              </View>
            ))}

            {prayerAnchors.map(anchor => (
              <View
                key={`anchor-${anchor.prayer}-${anchor.offsetMinutes}`}
                style={[
                  styles.activeRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
              >
                <View style={styles.activeRowLeft}>
                  <Icon name="prayer" size={16} color={colors.primary} decorative />
                  <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginStart: 10, fontWeight: '600' }]}>
                    {formatPrayerAnchor(anchor.prayer, anchor.offsetMinutes)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => onRemovePrayerAnchor(anchor)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete prayer reminder for ${anchor.prayer}`}
                  testID={`delete-prayer-anchor-${anchor.prayer}-${anchor.offsetMinutes}`}
                  style={styles.deleteButton}
                >
                  <Icon name="trash" size={16} color={colors.error} decorative />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Section 4: Anytime Today Time Picker (if ANYTIME_TODAY) */}
        {scheduleMode === 'ANYTIME_TODAY' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }]}>
                Time of Day
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Exact time to trigger anytime reminder
              </Text>
            </View>

            <View style={styles.anytimeRow}>
              {ANYTIME_PRESETS.map(item => {
                const isSelected = (reminderTimeOfDay || '09:00') === item.time;
                return (
                  <Pressable
                    key={item.time}
                    onPress={() => onSetTimeOfDay(item.time)}
                    style={[
                      styles.anytimeChip,
                      {
                        borderRadius: radii.md,
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
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
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Section 5: Reminder Delivery Type */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.headlineMedium, { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }]}>
            Reminder Type
          </Text>
        </View>

        {/* Option 1: Standard Notification */}
        <Pressable
          onPress={() => onSetReminderType('STANDARD')}
          style={[
            styles.typeCard,
            {
              backgroundColor: colors.surface,
              borderColor: reminderType === 'STANDARD' ? colors.primary : colors.border,
              borderWidth: reminderType === 'STANDARD' ? 2 : 1,
              borderRadius: radii.lg,
            },
          ]}
          testID="type-card-standard"
        >
          <View style={styles.typeCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="bell" size={20} color={reminderType === 'STANDARD' ? colors.primary : colors.textSecondary} decorative />
              <View style={{ marginStart: 10 }}>
                <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                  Standard Notification
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  System banner and chosen chime
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: reminderType === 'STANDARD' ? colors.primary : colors.border,
                },
              ]}
            >
              {reminderType === 'STANDARD' && (
                <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </View>

          {/* Sound Row */}
          {reminderType === 'STANDARD' && (
            <Pressable
              onPress={() => setShowSoundPicker(true)}
              style={[
                styles.soundSelectorRow,
                {
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                  marginTop: 12,
                  paddingTop: 12,
                },
              ]}
              testID="standard-sound-picker-row"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="bell" size={16} color={colors.textSecondary} decorative />
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginStart: 8 }]}>
                  Sound
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.labelMedium, { color: colors.primary, marginEnd: 4, fontWeight: '600' }]}>
                  {activeSound.name}
                </Text>
                <Icon name="chevron-right" size={16} color={colors.textSecondary} directional decorative />
              </View>
            </Pressable>
          )}
        </Pressable>

        {/* Option 2: Enhanced Alarm */}
        <Pressable
          onPress={() => {
            if (reminderType === 'ENHANCED') return;
            gate('REMINDER_ENHANCED', () => onSetReminderType('ENHANCED'));
          }}
          style={[
            styles.typeCard,
            {
              backgroundColor: colors.surface,
              borderColor: reminderType === 'ENHANCED' ? colors.primary : colors.border,
              borderWidth: reminderType === 'ENHANCED' ? 2 : 1,
              borderRadius: radii.lg,
              marginTop: 10,
            },
          ]}
          testID="type-card-enhanced"
        >
          <View style={styles.typeCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="alert" size={20} color={reminderType === 'ENHANCED' ? colors.primary : colors.textSecondary} decorative />
              <View style={{ marginStart: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[typography.labelLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                    Enhanced Alarm
                  </Text>
                  {!isPremium && (
                    <View style={{ marginStart: 6 }}>
                      <PremiumLanternIcon size={14} />
                    </View>
                  )}
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Full-screen lock screen alarm & persistent alerts
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.radioCircle,
                {
                  borderColor: reminderType === 'ENHANCED' ? colors.primary : colors.border,
                },
              ]}
            >
              {reminderType === 'ENHANCED' && (
                <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </View>

          {/* Enhanced Sub-options */}
          {reminderType === 'ENHANCED' && (
            <View style={[styles.enhancedOptions, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
              {/* Full Screen vs Persistent Mode */}
              <View style={styles.modeChooserRow}>
                <Pressable
                  onPress={() => onSetEnhancedMode('FULL_SCREEN')}
                  style={[
                    styles.modeChip,
                    {
                      borderRadius: radii.pill,
                      backgroundColor: enhancedMode === 'FULL_SCREEN' ? colors.primary : colors.surfaceSecondary,
                    },
                  ]}
                  testID="enhanced-mode-fullscreen"
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: enhancedMode === 'FULL_SCREEN' ? colors.textOnPrimary : colors.textPrimary,
                        fontWeight: enhancedMode === 'FULL_SCREEN' ? '700' : '500',
                      },
                    ]}
                  >
                    Full Screen Lockscreen
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => onSetEnhancedMode('PERSISTENT')}
                  style={[
                    styles.modeChip,
                    {
                      borderRadius: radii.pill,
                      backgroundColor: enhancedMode === 'PERSISTENT' ? colors.primary : colors.surfaceSecondary,
                    },
                  ]}
                  testID="enhanced-mode-persistent"
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: enhancedMode === 'PERSISTENT' ? colors.textOnPrimary : colors.textPrimary,
                        fontWeight: enhancedMode === 'PERSISTENT' ? '700' : '500',
                      },
                    ]}
                  >
                    Persistent Notification
                  </Text>
                </Pressable>
              </View>

              {/* Customize Alarm Style Button */}
              <Pressable
                onPress={onOpenAlarmStyle}
                style={[
                  styles.styleCustomizeButton,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: radii.md,
                  },
                ]}
                testID="customize-alarm-style-btn"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="palette" size={16} color={colors.primary} decorative />
                  <Text style={[typography.labelMedium, { color: colors.textPrimary, marginStart: 8, fontWeight: '600' }]}>
                    Customize Alarm Style
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textSecondary} directional decorative />
              </Pressable>

              {/* Time Sensitive Delivery Toggle */}
              <View style={styles.subToggleRow}>
                <View style={{ flex: 1, marginEnd: 8 }}>
                  <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                    Time-Sensitive Priority
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Breaks through Focus/Do Not Disturb
                  </Text>
                </View>
                <Switch
                  value={timeSensitive}
                  onValueChange={onSetTimeSensitive}
                  trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
                  thumbColor={colors.surface}
                  accessibilityRole="switch"
                  accessibilityLabel="Time-sensitive priority"
                  testID="time-sensitive-switch"
                />
              </View>

              {/* Nag Repeater Toggle */}
              <View style={styles.subToggleRow}>
                <View style={{ flex: 1, marginEnd: 8 }}>
                  <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                    Nag Repeater
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Repeats alert every 5 minutes until completed
                  </Text>
                </View>
                <Switch
                  value={nag}
                  onValueChange={onSetNag}
                  trackColor={{ false: colors.surfaceSecondary, true: colors.primary }}
                  thumbColor={colors.surface}
                  accessibilityRole="switch"
                  accessibilityLabel="Nag repeater alert"
                  testID="nag-repeater-switch"
                />
              </View>
            </View>
          )}
        </Pressable>
      </ScrollView>

      {/* Sound Picker Modal */}
      <SoundPicker
        visible={showSoundPicker}
        selectedSoundId={soundId}
        isPremium={isPremium}
        onSelectSound={id => {
          setShowSoundPicker(false);
          if (id.startsWith('custom:')) {
            gate('REMINDER_CUSTOM_SOUND', () => onSetSoundId(id));
            return;
          }
          const sound = getSoundById(id);
          if (sound && sound.tier === 'PREMIUM') {
            gate('REMINDER_SOUNDS_EXTENDED', () => onSetSoundId(id));
          } else {
            onSetSoundId(id);
          }
        }}
        onClose={() => setShowSoundPicker(false)}
      />

      {/* Paywall Sheet */}
      <PaywallSheet
        visible={paywallVisible}
        onClose={closePaywall}
        onSuccess={onPurchaseSuccess}
        gatedFeature={gatedFeature}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerSwitchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 20,
    marginBottom: 10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  customDrawerCard: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  customForm: {
    gap: 12,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  numberInput: {
    width: 70,
    height: 48,
    borderWidth: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 20,
  },
  unitButtonsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  unitButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  prayerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  prayerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  prayerOffsetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  prayerOffsetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeList: {
    gap: 8,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  activeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteButton: {
    padding: 6,
  },
  anytimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  anytimeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  typeCard: {
    padding: 14,
  },
  typeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  soundSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enhancedOptions: {
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
  },
  modeChooserRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  styleCustomizeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  subToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
