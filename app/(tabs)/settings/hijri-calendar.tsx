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
import {
  SettingsScreenHeader,
  SettingsSectionHeader,
  SettingsRow,
  SettingsStepper,
  SettingsInfoCard,
} from '@/components/settings';
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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsScreenHeader title="Hijri Calendar" backTestID="hijri-back-button" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        testID="hijri-calendar-screen"
      >
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
              <Text style={[typography.headlineMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
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
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setModalVisible(false)}
                    testID="modal-cancel-button"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
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
});
