import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useSettingsMutation } from '@/hooks/useSettingsMutation';
import {
  hijriMonthOverrideRepository,
  type HijriMonthOverrideRow,
} from '@/data/repositories/HijriMonthOverrideRepository';
import { useRouter } from 'expo-router';
import {
  SettingsPastelHeader,
  SettingsSectionHeader,
  SettingsRow,
  SettingsStepper,
  SettingsInfoCard,
  SettingsSectionCard,
  SettingsCalDateSystemIcon,
  SettingsCalIslamicDatesIcon,
  SettingsCalIslamicEventsIcon,
  SettingsCalEventNotifIcon,
  SettingsCalPreferredViewIcon,
  SettingsCalInfoCircleIcon,
  SettingsCheckCircleIcon,
} from '@/components/settings';
import { Switch } from 'react-native';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { HijriService } from '@/domain/calendar/HijriService';
import {
  HIJRI_MONTH_NAMES,
  type HijriMonthNumber,
  type HijriAdjustmentConfig,
  getHijriMonthKey,
} from '@/domain/calendar/types';

const defaultHijriService = new HijriService();

export default function HijriCalendarScreen() {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();
  const router = useRouter();
  const { settings, reload: reloadSettings } = useUserSettings();
  const {
    isSaving,
    setHijriGlobalAdjustment,
    upsertHijriMonthOverride,
    deleteHijriMonthOverride,
  } = useSettingsMutation();

  const [overrides, setOverrides] = useState<HijriMonthOverrideRow[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(true);

  // Modal state for adding/editing an override
  const [modalVisible, setModalVisible] = useState(false);
  const [overrideYear, setOverrideYear] = useState<number>(1448);
  const [overrideMonth, setOverrideMonth] = useState<HijriMonthNumber>(9); // Ramadan by default
  const [overrideAdjustment, setOverrideAdjustment] = useState<number>(0);

  const globalAdj = settings?.hijriGlobalAdjustment ?? 0;

  // Load existing overrides
  const loadOverrides = useCallback(async () => {
    setIsLoadingOverrides(true);
    try {
      const rows = await hijriMonthOverrideRepository.list();
      setOverrides(rows);
    } catch (err) {
      console.warn('[HijriCalendarScreen] Failed to load overrides:', err);
    } finally {
      setIsLoadingOverrides(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    hijriMonthOverrideRepository
      .list()
      .then(rows => {
        if (active) {
          setOverrides(rows);
          setIsLoadingOverrides(false);
        }
      })
      .catch(err => {
        if (active) {
          console.warn('[HijriCalendarScreen] Failed to load overrides:', err);
          setIsLoadingOverrides(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Determine current Hijri date for reference
  const todayCivil = useMemo(() => DateTime.now().toISODate() ?? '2026-09-18', []);

  const currentBaseYear = useMemo(() => {
    try {
      const base = defaultHijriService.toHijri(todayCivil);
      return base.year;
    } catch {
      return 1448;
    }
  }, [todayCivil]);

  // Reset modal defaults when opening
  const openAddModal = () => {
    setOverrideYear(currentBaseYear);
    setOverrideMonth(9);
    setOverrideAdjustment(0);
    setModalVisible(true);
  };

  // Preview of effective Hijri date
  const effectiveDatePreview = useMemo(() => {
    try {
      const monthMap = new Map<string, number>();
      for (const ov of overrides) {
        monthMap.set(getHijriMonthKey(ov.hijriYear, ov.hijriMonth), ov.adjustmentDays);
      }
      const config: HijriAdjustmentConfig = {
        globalAdjustment: globalAdj,
        monthOverrides: monthMap.size > 0 ? monthMap : undefined,
      };
      const effective = defaultHijriService.toEffectiveHijri(todayCivil, config);
      const mName = HIJRI_MONTH_NAMES[effective.month as HijriMonthNumber] ?? `Month ${effective.month}`;
      return `${effective.day} ${mName} ${effective.year} AH`;
    } catch {
      return 'Calculation unavailable';
    }
  }, [todayCivil, globalAdj, overrides]);

  const handleGlobalAdjustmentChange = async (newVal: number) => {
    const res = await setHijriGlobalAdjustment(newVal);
    if (res.status === 'SUCCESS') {
      await reloadSettings();
    } else if (res.status === 'PERSISTED_REFRESH_FAILED') {
      await reloadSettings();
      Alert.alert(
        'Adjustment Saved',
        'Global adjustment was saved. Schedule refresh will synchronize automatically.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Save Failed', res.error, [{ text: 'OK' }]);
    }
  };

  const handleSaveOverride = async () => {
    const res = await upsertHijriMonthOverride(overrideYear, overrideMonth, overrideAdjustment);
    if (res.status === 'SUCCESS' || res.status === 'PERSISTED_REFRESH_FAILED') {
      setModalVisible(false);
      await loadOverrides();
      if (res.status === 'PERSISTED_REFRESH_FAILED') {
        Alert.alert(
          'Override Saved',
          'Month override was saved. Schedule refresh will synchronize automatically.',
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert('Failed to Save Override', res.error, [{ text: 'OK' }]);
    }
  };

  const handleDeleteOverride = (year: number, month: number) => {
    const monthName = HIJRI_MONTH_NAMES[month as HijriMonthNumber] ?? `Month ${month}`;
    Alert.alert(
      'Remove Override',
      `Are you sure you want to remove the override for ${monthName} ${year} AH?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteHijriMonthOverride(year, month);
            if (res.status === 'SUCCESS' || res.status === 'PERSISTED_REFRESH_FAILED') {
              await loadOverrides();
            } else {
              Alert.alert('Failed to Delete Override', res.error, [{ text: 'OK' }]);
            }
          },
        },
      ]
    );
  };

  const [dateSystem, setDateSystem] = useState<'gregorian' | 'hijri'>('gregorian');
  const [showIslamicDates, setShowIslamicDates] = useState(true);
  const [showIslamicEvents, setShowIslamicEvents] = useState(true);
  const [eventNotifications, setEventNotifications] = useState(true);
  const [preferredView, setPreferredView] = useState<'month' | 'last_viewed'>('month');

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsPastelHeader
        title="Calendar Settings"
        subtitle="Set your date preferences and Islamic events."
        showBack
        showMosqueArt
        backTestID="hijri-back-button"
        onBack={() => router.back()}
        testID="section-header-hijri-calendar"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        testID="hijri-calendar-screen"
      >
        {/* 1. DATE SYSTEM SECTION CARD */}
        <View style={{ paddingHorizontal: spacing.md }}>
          <SettingsSectionCard
            customBadge={<SettingsCalDateSystemIcon size={40} />}
            title="Date System"
            subtitle="Choose your primary calendar."
            testID="calendar-date-system-card"
          >
            {/* Gregorian */}
            <Pressable
              onPress={() => setDateSystem('gregorian')}
              style={[
                styles.radioRow,
                { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
              testID="calendar-option-gregorian"
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: dateSystem === 'gregorian' ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                {dateSystem === 'gregorian' && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={styles.radioTextContainer}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Gregorian (e.g. September 2026)
                </Text>
              </View>
            </Pressable>

            {/* Hijri */}
            <Pressable
              onPress={() => setDateSystem('hijri')}
              style={styles.radioRow}
              testID="calendar-option-hijri"
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: dateSystem === 'hijri' ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                {dateSystem === 'hijri' && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={styles.radioTextContainer}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Hijri (e.g. Rabi' al-Thani 1448 AH)
                </Text>
              </View>
            </Pressable>
          </SettingsSectionCard>

          {/* 2. SHOW ISLAMIC DATES */}
          <SettingsSectionCard
            customBadge={<SettingsCalIslamicDatesIcon size={40} />}
            title="Show Islamic Dates"
            subtitle="Display Hijri dates alongside Gregorian dates."
            rightElement={
              <Switch
                value={showIslamicDates}
                onValueChange={setShowIslamicDates}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
            testID="calendar-show-islamic-dates-card"
          />

          {/* 3. ISLAMIC EVENTS */}
          <SettingsSectionCard
            customBadge={<SettingsCalIslamicEventsIcon size={40} />}
            title="Islamic Events"
            subtitle="Show important Islamic dates on your calendar."
            rightElement={
              <Switch
                value={showIslamicEvents}
                onValueChange={setShowIslamicEvents}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
            testID="calendar-islamic-events-card"
          />

          {/* 4. EVENT NOTIFICATIONS */}
          <SettingsSectionCard
            customBadge={<SettingsCalEventNotifIcon size={40} />}
            title="Event Notifications"
            subtitle="Get notified for upcoming Islamic events."
            rightElement={
              <Switch
                value={eventNotifications}
                onValueChange={setEventNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
            testID="calendar-event-notif-card"
          />

          {/* 5. PREFERRED CALENDAR VIEW */}
          <SettingsSectionCard
            customBadge={<SettingsCalPreferredViewIcon size={40} />}
            title="Preferred Calendar View"
            subtitle="Choose how the calendar opens."
            testID="calendar-preferred-view-card"
          >
            {/* Month */}
            <Pressable
              onPress={() => setPreferredView('month')}
              style={[
                styles.radioRow,
                { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
              testID="calendar-view-month"
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: preferredView === 'month' ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                {preferredView === 'month' && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={styles.radioTextContainer}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Month
                </Text>
              </View>
            </Pressable>

            {/* Last viewed */}
            <Pressable
              onPress={() => setPreferredView('last_viewed')}
              style={styles.radioRow}
              testID="calendar-view-last-viewed"
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: preferredView === 'last_viewed' ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                {preferredView === 'last_viewed' && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={styles.radioTextContainer}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Last viewed
                </Text>
              </View>
            </Pressable>
          </SettingsSectionCard>

          {/* Bottom Info Note */}
          <View
            style={[
              styles.infoNoteCard,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.border,
                borderRadius: radii.card,
                padding: spacing.md,
                marginTop: spacing.xs,
                marginBottom: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
              },
              shadows.card,
            ]}
          >
            <View style={{ marginRight: spacing.md }}>
              <SettingsCalInfoCircleIcon size={34} />
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              Islamic dates are based on the selected calculation method and may vary by region.
            </Text>
          </View>
        </View>

        {/* EFFECTIVE PREVIEW CARD */}
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              margin: spacing.md,
              padding: spacing.md,
            },
          ]}
          testID="hijri-effective-preview"
        >
          <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>
            {"TODAY'S EFFECTIVE HIJRI DATE"}
          </Text>
          <Text
            style={[
              typography.headlineMedium,
              { color: colors.primary, marginTop: 4, fontWeight: '700' },
            ]}
          >
            {effectiveDatePreview}
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textTertiary, marginTop: 4 },
            ]}
          >
            Reflects your global adjustment and any active month overrides.
          </Text>
        </View>

        {/* 1. CALENDAR CALCULATION BASE */}
        <SettingsSectionHeader title="Calculation Authority" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            label="Calendar Calculation"
            value="Umm al-Qura"
            subtitle="Official astronomical calendar of Saudi Arabia"
            showChevron={false}
            icon="moon"
            testID="hijri-base-method-row"
          />
        </View>

        {/* 2. GLOBAL DAY ADJUSTMENT */}
        <SettingsSectionHeader title="Global Adjustment" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsStepper
            label="Global Adjustment"
            value={globalAdj}
            min={-2}
            max={2}
            unit="days"
            onChange={handleGlobalAdjustmentChange}
            testID="hijri-global-stepper"
          />
        </View>
        <SettingsInfoCard
          title="Moon Sighting Alignment"
          message="Adjust all Hijri dates by ±1 to 2 days to align with your local moon-sighting announcement. Modifying this setting reconciles all Hijri-recurring tasks."
          icon="info"
        />

        {/* 3. MONTH-BY-MONTH OVERRIDES */}
        <SettingsSectionHeader title="Month-by-Month Overrides" />
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isLoadingOverrides ? (
            <View style={{ padding: spacing.md, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : overrides.length === 0 ? (
            <View style={{ padding: spacing.md }}>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
                No month overrides configured. All months use the global adjustment ({globalAdj > 0 ? `+${globalAdj}` : globalAdj} days).
              </Text>
            </View>
          ) : (
            overrides.map(ov => {
              const mName = HIJRI_MONTH_NAMES[ov.hijriMonth as HijriMonthNumber] ?? `Month ${ov.hijriMonth}`;
              const sign = ov.adjustmentDays > 0 ? '+' : '';
              return (
                <View
                  key={`${ov.hijriYear}-${ov.hijriMonth}`}
                  style={[
                    styles.overrideRow,
                    {
                      minHeight: touchTargets.min,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  testID={`override-item-${ov.hijriYear}-${ov.hijriMonth}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                      {mName} {ov.hijriYear} AH
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                      Adjustment: {sign}{ov.adjustmentDays} {Math.abs(ov.adjustmentDays) === 1 ? 'day' : 'days'}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleDeleteOverride(ov.hijriYear, ov.hijriMonth)}
                    style={[styles.deleteButton, { minWidth: touchTargets.min, minHeight: touchTargets.min }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove override for ${mName} ${ov.hijriYear}`}
                    testID={`delete-override-${ov.hijriYear}-${ov.hijriMonth}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="trash" size={18} color={colors.error} />
                  </Pressable>
                </View>
              );
            })
          )}

          <View style={{ padding: spacing.md }}>
            <Button
              title="Add Month Override"
              variant="secondary"
              onPress={openAddModal}
              testID="add-override-button"
            />
          </View>
        </View>

        {/* OVERRIDE MODAL */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
            <View
              accessibilityViewIsModal={true}
              style={[
                styles.modalContent,
                shadows.elevated,
                {
                  backgroundColor: colors.surfaceElevated,
                  shadowColor: colors.shadowElevated,
                  borderRadius: radii.lg,
                  padding: spacing.lg,
                },
              ]}
              testID="add-override-modal"
            >
              <Text
                accessibilityRole="header"
                style={[typography.headlineMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}
              >
                Add Month Override
              </Text>

              {/* Year Selector Stepper */}
              <SettingsStepper
                label="Hijri Year (AH)"
                value={overrideYear}
                min={1343}
                max={1500}
                onChange={setOverrideYear}
                testID="modal-year-stepper"
              />

              {/* Month Selector Stepper */}
              <SettingsStepper
                label="Hijri Month"
                value={overrideMonth}
                min={1}
                max={12}
                formatValue={m => `${m}: ${HIJRI_MONTH_NAMES[m as HijriMonthNumber]}`}
                onChange={m => setOverrideMonth(m as HijriMonthNumber)}
                testID="modal-month-stepper"
              />

              {/* Adjustment Stepper */}
              <SettingsStepper
                label="Adjustment (Days)"
                value={overrideAdjustment}
                min={-2}
                max={2}
                unit="days"
                onChange={setOverrideAdjustment}
                testID="modal-adjustment-stepper"
              />

              <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
                <View style={{ flex: 1, marginEnd: spacing.sm }}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setModalVisible(false)}
                    testID="modal-cancel-button"
                  />
                </View>
                <View style={{ flex: 1, marginStart: spacing.sm }}>
                  <Button
                    title={isSaving ? 'Saving...' : 'Save Override'}
                    onPress={handleSaveOverride}
                    disabled={isSaving}
                    testID="modal-save-button"
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
  group: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewCard: {
    borderWidth: 1,
  },
  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  modalActions: {
    flexDirection: 'row',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioTextContainer: {
    flex: 1,
  },
  infoNoteCard: {
    borderWidth: 1,
  },
});
