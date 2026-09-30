import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { PrayerTabIcon } from '@/components/prayer/PrayerTabBar';
import type { Prayer } from '@/constants/prayers';
import {
  SettingsPastelHeader,
  SettingsSectionCard,
  SettingsSecLocationIcon,
  SettingsRowManualPinIcon,
  SettingsSecCalculatorIcon,
  SettingsSecAsrSunIcon,
  SettingsRowAsrCheckIcon,
  SettingsSecAdjustSlidersIcon,
  SettingsRowPreviewClockIcon,
  SettingsSecInfoCircleIcon,
  SettingsStepperMinusIcon,
  SettingsStepperPlusIcon,
  SettingsRowChevronDownIcon,
} from '@/components/settings';
import { useLocation } from '@/hooks/useLocation';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useSettingsMutation } from '@/hooks/useSettingsMutation';
import { loadCityDataset } from '@/domain/location/cityLoader';
import { searchCities } from '@/domain/location/citySearch';
import { CALCULATION_METHOD_LABELS } from '@/domain/prayer/calculationMethods';
import type { CityRecord } from '@/domain/location/types';
import type { CalculationMethodKey, AsrMethodKey, PrayerAdjustments } from '@/domain/prayer/types';

const METHOD_KEYS: CalculationMethodKey[] = [
  'ISNA',
  'MWL',
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

export default function PrayerLocationScreen() {
  const { colors, spacing, radii, typography, touchTargets, shadows } = useTheme();
  const router = useRouter();
  const {
    locationMode,
    latitude,
    longitude,
    locationName,
    isLoading: isLocationLoading,
    error: locationError,
    requestAutoLocation,
    setManualLocation,
  } = useLocation();

  const { settings, reload } = useUserSettings();
  const { applyTemporalSettings } = useSettingsMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [cityDataset, setCityDataset] = useState<CityRecord[]>([]);
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  // Parse prayer adjustments from user settings
  const adjustments: PrayerAdjustments = useMemo(() => {
    try {
      if (settings?.prayerAdjustments) {
        return JSON.parse(settings.prayerAdjustments);
      }
    } catch {
      // fallback
    }
    return { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
  }, [settings]);

  // Current calculation and asr methods
  const currentMethod = (settings?.calculationMethod as CalculationMethodKey) || 'ISNA';
  const currentAsrMethod = (settings?.asrMethod as AsrMethodKey) || 'SHAFI';

  // Lazy load cities on-demand
  useEffect(() => {
    let mounted = true;
    loadCityDataset().then(data => {
      if (mounted) {
        setCityDataset(data);
        setDatasetLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!datasetLoaded || searchQuery.trim().length < 2) {
      return [];
    }
    return searchCities(searchQuery, 10, cityDataset);
  }, [searchQuery, datasetLoaded, cityDataset]);

  const handleSelectCity = async (city: CityRecord) => {
    const success = await setManualLocation(city);
    if (success) {
      setSearchQuery('');
      setShowSearchInput(false);
      Alert.alert('Location Updated', `Prayer location set to ${city.name} (${city.countryCode}).`);
    }
  };

  const handleToggleAutoLocation = async (value: boolean) => {
    if (value) {
      await requestAutoLocation();
    } else {
      setShowSearchInput(true);
      Alert.alert('Manual Location', 'Search and select a city below to set your manual location.');
    }
  };

  const handleSelectMethod = async (m: CalculationMethodKey) => {
    setShowMethodPicker(false);
    await applyTemporalSettings({
      calculationMethod: m,
      asrMethod: currentAsrMethod,
      highLatitudeRule: settings?.highLatitudeRule as any,
      polarCircleResolution: settings?.polarCircleResolution as any,
      prayerAdjustments: settings?.prayerAdjustments,
    });
    await reload();
  };

  const handleSelectAsrMethod = async (asr: AsrMethodKey) => {
    await applyTemporalSettings({
      calculationMethod: currentMethod,
      asrMethod: asr,
      highLatitudeRule: settings?.highLatitudeRule as any,
      polarCircleResolution: settings?.polarCircleResolution as any,
      prayerAdjustments: settings?.prayerAdjustments,
    });
    await reload();
  };

  const handleAdjustPrayer = async (prayer: keyof PrayerAdjustments, delta: number) => {
    const nextAdjustments: PrayerAdjustments = {
      ...adjustments,
      [prayer]: Math.max(-60, Math.min(60, (adjustments[prayer] ?? 0) + delta)),
    };
    await applyTemporalSettings({
      calculationMethod: currentMethod,
      asrMethod: currentAsrMethod,
      highLatitudeRule: settings?.highLatitudeRule as any,
      polarCircleResolution: settings?.polarCircleResolution as any,
      prayerAdjustments: JSON.stringify(nextAdjustments),
    });
    await reload();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <SettingsPastelHeader
        title="Prayer & Location"
        subtitle="Set your location and prayer time preferences"
        showBack
        showMosqueArt
        onBack={() => router.back()}
        testID="section-header-prayer-location"
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        testID="prayer-location-scroll"
      >
        {/* CARD 1: LOCATION */}
        <SettingsSectionCard
          bgColor={colors.primaryLight}
          customBadge={<SettingsSecLocationIcon size={40} />}
          title="Location"
          subtitle="Used to calculate accurate prayer times"
          testID="location-section-card"
        >
          {/* Row 1: Automatic (Recommended) */}
          <View style={[styles.subRow, { borderBottomColor: colors.border, paddingVertical: spacing.sm }]}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={[typography.labelMedium, { color: colors.textPrimary }]}>
                Automatic (Recommended)
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Use your device&apos;s location
              </Text>
            </View>
            <Switch
              value={locationMode === 'AUTO'}
              onValueChange={handleToggleAutoLocation}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              testID="auto-location-switch"
            />
          </View>

          {/* Row 2: Manual Location */}
          <Pressable
            onPress={() => setShowSearchInput(!showSearchInput)}
            style={({ pressed }) => [
              styles.subRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <SettingsRowManualPinIcon size={26} style={{ marginRight: spacing.xs }} />
            <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
              <Text style={[typography.labelMedium, { color: colors.textPrimary }]}>
                Manual Location
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {locationName || (latitude != null ? `${latitude.toFixed(2)}, ${longitude?.toFixed(2)}` : 'Fort Worth, Texas, USA')}
              </Text>
            </View>
            <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
          </Pressable>

          {/* Search Input when searching */}
          {showSearchInput && (
            <View style={{ marginTop: spacing.xs }}>
              <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: radii.md }]}>
                <Icon name="search" size="sm" color={colors.textSecondary} decorative style={{ marginEnd: spacing.xs }} />
                <TextInput
                  style={[styles.searchInput, typography.bodyMedium, { color: colors.textPrimary }]}
                  placeholder="Search city (e.g. Makkah, London, Chicago)"
                  placeholderTextColor={colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="words"
                  autoFocus
                  testID="city-search-input"
                />
                {isLocationLoading && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {searchResults.length > 0 && (
                <View style={[styles.resultsList, { borderColor: colors.border, marginTop: spacing.xs }]}>
                  {searchResults.map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.resultRow,
                        {
                          backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                          borderBottomColor: colors.border,
                          minHeight: touchTargets.min,
                        },
                      ]}
                      onPress={() => handleSelectCity(item)}
                    >
                      <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
                        {item.name}, {item.countryCode}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.timezone}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {locationError && (
            <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}>
              {locationError}
            </Text>
          )}
        </SettingsSectionCard>

        {/* CARD 2: CALCULATION METHOD */}
        <SettingsSectionCard
          bgColor={colors.primaryLight}
          customBadge={<SettingsSecCalculatorIcon size={40} />}
          title="Calculation Method"
          subtitle="Choose the method used to calculate prayer times"
          testID="calculation-method-card"
        >
          <Pressable
            onPress={() => setShowMethodPicker(!showMethodPicker)}
            accessibilityRole="button"
            accessibilityLabel="Calculation Method"
            style={({ pressed }) => [
              styles.methodCardInner,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID="calculation-method-selector"
          >
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={[typography.labelMedium, { color: colors.textPrimary }]}>
                {CALCULATION_METHOD_LABELS[currentMethod]?.label || 'Islamic Society of North America (ISNA)'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {CALCULATION_METHOD_LABELS[currentMethod]?.description || 'Fajr 15°, Isha 15°'}
              </Text>
            </View>
            <SettingsRowChevronDownIcon
              size={18}
              style={showMethodPicker ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </Pressable>

          {/* Expanded Method List */}
          {showMethodPicker && (
            <View style={[styles.methodList, { borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.xs }]}>
              {METHOD_KEYS.map((k) => {
                const info = CALCULATION_METHOD_LABELS[k];
                const isSelected = currentMethod === k;
                return (
                  <Pressable
                    key={k}
                    style={({ pressed }) => [
                      styles.methodRow,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : pressed ? colors.surfaceSecondary : 'transparent',
                        borderRadius: radii.sm,
                        padding: spacing.sm,
                        marginBottom: 4,
                      },
                    ]}
                    onPress={() => handleSelectMethod(k)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyMedium, { color: isSelected ? colors.primary : colors.textPrimary, fontWeight: isSelected ? '700' : '400' }]}>
                        {info.label}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                        {info.description}
                      </Text>
                    </View>
                    {isSelected && <Icon name="check" size="sm" color={colors.primary} decorative />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </SettingsSectionCard>

        {/* CARD 3: ASR CALCULATION METHOD */}
        <SettingsSectionCard
          bgColor={colors.primaryLight}
          customBadge={<SettingsSecAsrSunIcon size={40} />}
          title="Asr Calculation Method"
          subtitle="Choose the juristic method for Asr prayer"
          testID="asr-calculation-card"
        >
          <View style={styles.asrRow}>
            {/* Standard */}
            <Pressable
              onPress={() => handleSelectAsrMethod('SHAFI')}
              accessibilityRole="button"
              accessibilityLabel="Standard Shafi'i, Maliki, Hanbali"
              style={({ pressed }) => [
                styles.asrCard,
                {
                  backgroundColor: currentAsrMethod === 'SHAFI' ? colors.primaryLight : colors.surfaceSecondary,
                  borderColor: currentAsrMethod === 'SHAFI' ? colors.primary : colors.border,
                  borderWidth: currentAsrMethod === 'SHAFI' ? 1.5 : 1,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="asr-method-shafi"
            >
              <View style={styles.asrCardHeader}>
                <Text style={[typography.labelMedium, { color: currentAsrMethod === 'SHAFI' ? colors.primary : colors.textPrimary, flex: 1 }]}>
                  Standard (Shafi&apos;i, Maliki, Hanbali)
                </Text>
                {currentAsrMethod === 'SHAFI' && <SettingsRowAsrCheckIcon size={20} />}
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                Shadow = 1x
              </Text>
            </Pressable>

            {/* Hanafi */}
            <Pressable
              onPress={() => handleSelectAsrMethod('HANAFI')}
              accessibilityRole="button"
              accessibilityLabel="Hanafi"
              style={({ pressed }) => [
                styles.asrCard,
                {
                  backgroundColor: currentAsrMethod === 'HANAFI' ? colors.primaryLight : colors.surfaceSecondary,
                  borderColor: currentAsrMethod === 'HANAFI' ? colors.primary : colors.border,
                  borderWidth: currentAsrMethod === 'HANAFI' ? 1.5 : 1,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              testID="asr-method-hanafi"
            >
              <View style={styles.asrCardHeader}>
                <Text style={[typography.labelMedium, { color: currentAsrMethod === 'HANAFI' ? colors.primary : colors.textPrimary, flex: 1 }]}>
                  Hanafi
                </Text>
                {currentAsrMethod === 'HANAFI' && <SettingsRowAsrCheckIcon size={20} />}
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                Shadow = 2x
              </Text>
            </Pressable>
          </View>
        </SettingsSectionCard>

        {/* CARD 4: ADJUST PRAYER TIMES */}
        <SettingsSectionCard
          bgColor={colors.primaryLight}
          customBadge={<SettingsSecAdjustSlidersIcon size={40} />}
          title="Adjust Prayer Times"
          subtitle="Fine-tune prayer times if needed"
          testID="adjust-prayer-times-card"
        >
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((p) => {
              const val = adjustments[p] ?? 0;
              const displayName = p.charAt(0).toUpperCase() + p.slice(1);
              return (
                <View key={p} style={[styles.adjustmentRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <PrayerTabIcon prayer={p.toUpperCase() as Prayer} size={22} style={{ marginEnd: spacing.sm }} />
                    <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                      {displayName}
                    </Text>
                  </View>
                  <View style={styles.stepperContainer}>
                    <Text style={[styles.stepperText, typography.labelMedium, { color: colors.textSecondary }]}>
                      {val > 0 ? `+ ${val} min` : val < 0 ? `- ${Math.abs(val)} min` : '+ 0 min'}
                    </Text>

                    <Pressable
                      onPress={() => handleAdjustPrayer(p, -1)}
                      style={({ pressed }) => [
                        styles.stepperBtn,
                        {
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      accessibilityLabel={`Decrease ${displayName}`}
                    >
                      <SettingsStepperMinusIcon size={30} />
                    </Pressable>

                    <Pressable
                      onPress={() => handleAdjustPrayer(p, 1)}
                      style={({ pressed }) => [
                        styles.stepperBtn,
                        {
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      accessibilityLabel={`Increase ${displayName}`}
                    >
                      <SettingsStepperPlusIcon size={30} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </SettingsSectionCard>

        {/* ROW 5: PREVIEW TODAY'S PRAYER TIMES */}
        <Pressable
          style={({ pressed }) => [
            styles.previewCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.card,
              padding: spacing.md,
              marginBottom: spacing.md,
              opacity: pressed ? 0.85 : 1,
            },
            shadows.card,
          ]}
          onPress={() => router.push('/(tabs)/prayer' as any)}
        >
          <SettingsRowPreviewClockIcon size={36} style={{ marginRight: spacing.sm }} />
          <Text style={[typography.labelLarge, { color: colors.textPrimary, fontStyle: 'italic', flex: 1 }]}>
            Preview Today&apos;s Prayer Times
          </Text>
          <Icon name="chevron-right" size="sm" color={colors.textTertiary} decorative />
        </Pressable>

        {/* BOTTOM LOCAL CALCULATION INFO NOTICE */}
        <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight, borderRadius: radii.card, padding: spacing.md }]}>
          <SettingsSecInfoCircleIcon size={28} style={{ marginRight: 10 }} />
          <Text style={[typography.caption, { color: colors.primary, flex: 1, lineHeight: 18, fontStyle: 'italic' }]}>
            Prayer times are calculated locally on your device. You can adjust them anytime if needed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallIconCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    height: 42,
  },
  resultsList: {
    borderTopWidth: 1,
    maxHeight: 180,
  },
  resultRow: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  methodList: {
    borderTopWidth: 1,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  asrRow: {
    flexDirection: 'row',
    gap: 10,
  },
  asrCard: {
    flex: 1,
  },
  asrCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    minWidth: 54,
    textAlign: 'right',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  clockBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
