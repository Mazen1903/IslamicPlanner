import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useSettingsMutation } from '@/hooks/useSettingsMutation';
import {
  SettingsScreenHeader,
  SettingsSectionHeader,
  SettingsSelectOption,
  SettingsStepper,
  SettingsInfoCard,
} from '@/components/settings';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import {
  CALCULATION_METHOD_LABELS,
} from '@/domain/prayer/calculationMethods';
import { calculate } from '@/domain/prayer/PrayerEngine';
import { buildPrayerAdjustments } from '@/services/temporalSettingsHelper';
import type { UserSettingsRow } from '@/data/repositories/UserSettingsRepository';
import type {
  CalculationMethodKey,
  AsrMethodKey,
  HighLatitudeRuleKey,
  PolarCircleResolutionKey,
  PrayerAdjustments,
  PrayerCalculationParams,
  Coordinates,
} from '@/domain/prayer/types';

const METHOD_KEYS: CalculationMethodKey[] = [
  'MWL',
  'ISNA',
  'EGYPT',
  'MAKKAH',
  'KARACHI',
  'TEHRAN',
  'SINGAPORE',
  'TURKEY',
  'DUBAI',
  'QATAR',
  'KUWAIT',
  'MOONSIGHTING',
];

const HIGH_LAT_RULES: { key: HighLatitudeRuleKey; label: string; desc: string }[] = [
  { key: 'AUTO', label: 'Automatic', desc: 'Recommended by astronomical authorities based on location' },
  { key: 'MIDDLE_OF_NIGHT', label: 'Middle of Night', desc: 'Fajr and Isha do not exceed half the night' },
  { key: 'ONE_SEVENTH', label: 'One Seventh', desc: 'Fajr and Isha do not exceed 1/7th of the night' },
  { key: 'ANGLE_BASED', label: 'Angle Based', desc: 'Calculates boundaries relative to twilight angle' },
];

const POLAR_RESOLUTIONS: { key: PolarCircleResolutionKey; label: string; desc: string }[] = [
  { key: 'AQRAB_YAUM', label: 'Nearest Day', desc: 'Uses times from the nearest day with standard sun transitions' },
  { key: 'AQRAB_BALAD', label: 'Nearest Place', desc: 'Uses times from the nearest location outside polar circle' },
  { key: 'UNRESOLVED', label: 'Unresolved', desc: 'Does not apply special polar fallback' },
];

interface PrayerCalculationFormProps {
  settings: UserSettingsRow;
  reload: () => Promise<void>;
}

function PrayerCalculationForm({ settings, reload }: PrayerCalculationFormProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const { isSaving, applyTemporalSettings } = useSettingsMutation();

  // Local draft initialized from committed settings
  const [method, setMethod] = useState<CalculationMethodKey>(
    () => (settings.calculationMethod as CalculationMethodKey) || 'MWL'
  );
  const [asrMethod, setAsrMethod] = useState<AsrMethodKey>(
    () => (settings.asrMethod as AsrMethodKey) || 'SHAFI'
  );
  const [highLatitudeRule, setHighLatitudeRule] = useState<HighLatitudeRuleKey>(
    () => (settings.highLatitudeRule as HighLatitudeRuleKey) || 'AUTO'
  );
  const [polarCircleResolution, setPolarCircleResolution] = useState<PolarCircleResolutionKey>(
    () => (settings.polarCircleResolution as PolarCircleResolutionKey) || 'AQRAB_YAUM'
  );
  const [adjustments, setAdjustments] = useState<PrayerAdjustments>(() =>
    buildPrayerAdjustments(settings.prayerAdjustments)
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Read-only prayer time preview based on draft settings
  const preview = useMemo(() => {
    let coords: Coordinates | null = null;
    let tz: string | null = null;

    if (settings.locationMode === 'AUTO') {
      if (settings.lastAutoLatitude != null && settings.lastAutoLongitude != null) {
        coords = { latitude: settings.lastAutoLatitude, longitude: settings.lastAutoLongitude };
        tz = settings.lastKnownTimezone;
      }
    } else {
      if (settings.manualLatitude != null && settings.manualLongitude != null) {
        coords = { latitude: settings.manualLatitude, longitude: settings.manualLongitude };
        tz = settings.manualTimezone;
      }
    }

    if (!coords || !tz) return null;

    try {
      const todayCivil = DateTime.now().setZone(tz).toISODate();
      if (!todayCivil) return null;

      const params: PrayerCalculationParams = {
        method,
        asrMethod,
        highLatitudeRule,
        polarCircleResolution,
        adjustments,
        timezone: tz,
      };

      return calculate(todayCivil, coords, params);
    } catch {
      return null;
    }
  }, [settings, method, asrMethod, highLatitudeRule, polarCircleResolution, adjustments]);

  const handleAdjustmentChange = (key: keyof PrayerAdjustments, val: number) => {
    setAdjustments(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  const handleApplyChanges = async () => {
    const patch = {
      calculationMethod: method,
      asrMethod,
      highLatitudeRule,
      polarCircleResolution,
      prayerAdjustments: JSON.stringify(adjustments),
    };

    const res = await applyTemporalSettings(patch);

    if (res.status === 'SUCCESS') {
      setIsDirty(false);
      await reload();
      Alert.alert(
        'Prayer Settings Applied',
        'Prayer calculation parameters and schedule have been refreshed.',
        [{ text: 'OK' }]
      );
    } else if (res.status === 'PERSISTED_REFRESH_FAILED') {
      setIsDirty(false);
      await reload();
      Alert.alert(
        'Settings Saved',
        'Your calculation settings were saved, but planner refresh encountered a temporary issue. It will refresh automatically when you view Today.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Save Failed', res.error, [{ text: 'OK' }]);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
      testID="prayer-calculation-screen"
    >
      {/* INFO NOTICE */}
      <SettingsInfoCard
        title={CALCULATION_METHOD_LABELS[method]?.label ?? 'Calculation Method'}
        message={CALCULATION_METHOD_LABELS[method]?.description ?? 'Standard calculation parameters.'}
        icon="prayer"
        testID="calc-method-info-card"
      />

      {/* READ-ONLY PREVIEW */}
      {preview && (
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              marginHorizontal: spacing.md,
              padding: spacing.md,
            },
          ]}
          testID="prayer-preview-card"
        >
          <Text style={[typography.labelMedium, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            {"TODAY'S ESTIMATED PRAYER TIMES (PREVIEW)"}
          </Text>
          <View style={styles.previewGrid}>
            <View style={styles.previewItem}>
              <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>Fajr</Text>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                {preview.fajr.toFormat('HH:mm')}
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Text style={[typography.labelSmall, { color: colors.textTertiary }]}>Sunrise</Text>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
                {preview.sunrise.toFormat('HH:mm')}
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>Dhuhr</Text>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                {preview.dhuhr.toFormat('HH:mm')}
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>Asr</Text>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                {preview.asr.toFormat('HH:mm')}
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>Maghrib</Text>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                {preview.maghrib.toFormat('HH:mm')}
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>Isha</Text>
              <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                {preview.isha.toFormat('HH:mm')}
              </Text>
            </View>
          </View>
          <Text
            style={[
              typography.bodySmall,
              { color: colors.textTertiary, marginTop: spacing.xs, fontStyle: 'italic' },
            ]}
          >
            Sunrise is astronomical and informational only.
          </Text>
        </View>
      )}

      {/* 1. CALCULATION METHOD */}
      <SettingsSectionHeader title="Calculation Method" />
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {METHOD_KEYS.map(key => {
          const item = CALCULATION_METHOD_LABELS[key];
          return (
            <SettingsSelectOption
              key={key}
              label={item.label}
              description={item.description}
              selected={method === key}
              onSelect={() => {
                setMethod(key);
                setIsDirty(true);
              }}
              testID={`calc-method-option-${key}`}
            />
          );
        })}
      </View>

      {/* 2. ASR SCHOOL */}
      <SettingsSectionHeader title="Asr Jurisprudence" />
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingsSelectOption
          label="Standard (Shafi'i, Maliki, Hanbali)"
          description="Shadow length equals the object's height."
          selected={asrMethod === 'SHAFI'}
          onSelect={() => {
            setAsrMethod('SHAFI');
            setIsDirty(true);
          }}
          testID="asr-method-shafi"
        />
        <SettingsSelectOption
          label="Hanafi"
          description="Shadow length equals twice the object's height."
          selected={asrMethod === 'HANAFI'}
          onSelect={() => {
            setAsrMethod('HANAFI');
            setIsDirty(true);
          }}
          testID="asr-method-hanafi"
        />
      </View>

      {/* 3. HIGH LATITUDE RULE */}
      <SettingsSectionHeader title="High Latitude Rule" />
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {HIGH_LAT_RULES.map(rule => (
          <SettingsSelectOption
            key={rule.key}
            label={rule.label}
            description={rule.desc}
            selected={highLatitudeRule === rule.key}
            onSelect={() => {
              setHighLatitudeRule(rule.key);
              setIsDirty(true);
            }}
            testID={`high-lat-${rule.key}`}
          />
        ))}
      </View>

      {/* 4. MANUAL ADJUSTMENTS */}
      <SettingsSectionHeader title="Manual Prayer Adjustments (Minutes)" />
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingsStepper
          label="Fajr"
          value={adjustments.fajr}
          min={-60}
          max={60}
          unit="min"
          onChange={v => handleAdjustmentChange('fajr', v)}
          testID="stepper-fajr"
        />
        <SettingsStepper
          label="Sunrise (Informational)"
          value={adjustments.sunrise}
          min={-60}
          max={60}
          unit="min"
          onChange={v => handleAdjustmentChange('sunrise', v)}
          testID="stepper-sunrise"
        />
        <SettingsStepper
          label="Dhuhr"
          value={adjustments.dhuhr}
          min={-60}
          max={60}
          unit="min"
          onChange={v => handleAdjustmentChange('dhuhr', v)}
          testID="stepper-dhuhr"
        />
        <SettingsStepper
          label="Asr"
          value={adjustments.asr}
          min={-60}
          max={60}
          unit="min"
          onChange={v => handleAdjustmentChange('asr', v)}
          testID="stepper-asr"
        />
        <SettingsStepper
          label="Maghrib"
          value={adjustments.maghrib}
          min={-60}
          max={60}
          unit="min"
          onChange={v => handleAdjustmentChange('maghrib', v)}
          testID="stepper-maghrib"
        />
        <SettingsStepper
          label="Isha"
          value={adjustments.isha}
          min={-60}
          max={60}
          unit="min"
          onChange={v => handleAdjustmentChange('isha', v)}
          testID="stepper-isha"
        />
      </View>

      {/* 5. ADVANCED: POLAR CIRCLE RESOLUTION */}
      <Pressable
        onPress={() => setShowAdvanced(!showAdvanced)}
        style={[styles.advancedToggle, { marginHorizontal: spacing.md, marginTop: spacing.md }]}
        accessibilityRole="button"
        testID="toggle-advanced-polar"
      >
        <Text style={[typography.labelMedium, { color: colors.primary }]}>
          {showAdvanced ? 'Hide Advanced Polar Circle Settings' : 'Show Advanced Polar Circle Settings'}
        </Text>
        <Icon name={showAdvanced ? 'chevron-down' : 'chevron-right'} size={16} color={colors.primary} />
      </Pressable>

      {showAdvanced && (
        <>
          <SettingsSectionHeader title="Polar Circle Resolution" />
          <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {POLAR_RESOLUTIONS.map(res => (
              <SettingsSelectOption
                key={res.key}
                label={res.label}
                description={res.desc}
                selected={polarCircleResolution === res.key}
                onSelect={() => {
                  setPolarCircleResolution(res.key);
                  setIsDirty(true);
                }}
                testID={`polar-resolution-${res.key}`}
              />
            ))}
          </View>
        </>
      )}

      {/* APPLY BUTTON */}
      <View style={[styles.applyContainer, { padding: spacing.md }]}>
        <Button
          title={isSaving ? 'Applying Changes...' : isDirty ? 'Apply Changes' : 'Saved'}
          onPress={handleApplyChanges}
          disabled={isSaving || !isDirty}
          testID="apply-changes-button"
        />
      </View>
    </ScrollView>
  );
}

export default function PrayerCalculationScreen() {
  const { colors } = useTheme();
  const { settings, isLoading, reload } = useUserSettings();

  if (isLoading || !settings) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <SettingsScreenHeader title="Prayer Calculation" backTestID="prayer-calc-back-button" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <SettingsScreenHeader title="Prayer Calculation" backTestID="prayer-calc-back-button" />
      <PrayerCalculationForm settings={settings} reload={reload} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  previewItem: {
    width: '30%',
    paddingVertical: 6,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  applyContainer: {
    marginTop: 16,
  },
});
