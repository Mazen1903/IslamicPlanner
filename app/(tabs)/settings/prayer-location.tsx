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
  SettingsGroup,
  SettingsGroupRow,
  SettingsGroupDivider,
  SettingsSecLocationIcon,
  SettingsRowManualPinIcon,
  SettingsSecCalculatorIcon,
  SettingsSecAsrSunIcon,
  SettingsRowAsrCheckIcon,
  SettingsSecAdjustSlidersIcon,
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
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
        {/* GROUP 1: LOCATION */}
        <SettingsGroup
          title="Location"
          subtitle="Used to calculate accurate prayer times"
          testID="location-section-card"
        >
          <SettingsGroupRow
            customIcon={<SettingsSecLocationIcon size={38} />}
            iconBgColor="transparent"
            title="Automatic (Recommended)"
            subtitle="Use your device's location"
            isSwitch
            switchValue={locationMode === 'AUTO'}
            onSwitchChange={handleToggleAutoLocation}
            testID="auto-location-switch"
          />
          <SettingsGroupDivider />
          <SettingsGroupRow
            customIcon={<SettingsRowManualPinIcon size={26} />}
            iconBgColor={colors.primaryLight}
            title="Manual Location"
            subtitle={locationName || (latitude != null ? `${latitude.toFixed(2)}, ${longitude?.toFixed(2)}` : 'Fort Worth, Texas, USA')}
            onPress={() => setShowSearchInput(!showSearchInput)}
            showChevron
            chevronDirection={showSearchInput ? 'down' : 'right'}
            testID="manual-location-row"
          />
          {showSearchInput && (
            <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
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
            <Text style={[typography.caption, { color: colors.danger, marginHorizontal: spacing.md, marginBottom: spacing.xs }]}>
              {locationError}
            </Text>
          )}
        </SettingsGroup>

        {/* GROUP 2: CALCULATION METHOD */}
        <SettingsGroup
          title="Calculation Method"
          subtitle="Choose the method used to calculate prayer times"
          testID="calculation-method-card"
        >
          <SettingsGroupRow
            customIcon={<SettingsSecCalculatorIcon size={38} />}
            iconBgColor="transparent"
            title={CALCULATION_METHOD_LABELS[currentMethod]?.label || 'Islamic Society of North America (ISNA)'}
            subtitle={CALCULATION_METHOD_LABELS[currentMethod]?.description || 'Fajr 15°, Isha 15°'}
            onPress={() => setShowMethodPicker(!showMethodPicker)}
            showChevron
            chevronDirection={showMethodPicker ? 'down' : 'right'}
            testID="calculation-method-selector"
          />
          {showMethodPicker && (
            <View style={[styles.methodList, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.sm }]}>
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
        </SettingsGroup>

        {/* GROUP 3: ASR CALCULATION METHOD */}
        <SettingsGroup
          title="Asr Calculation Method"
          subtitle="Choose the juristic method for Asr prayer"
          testID="asr-calculation-card"
        >
          <SettingsGroupRow
            customIcon={<SettingsSecAsrSunIcon size={38} />}
            iconBgColor="transparent"
            title="Standard (Shafi'i, Maliki, Hanbali)"
            subtitle="Shadow = 1x"
            isRadio
            radioSelected={currentAsrMethod === 'SHAFI'}
            onPress={() => handleSelectAsrMethod('SHAFI')}
            testID="asr-method-shafi"
          />
          <SettingsGroupDivider />
          <SettingsGroupRow
            customIcon={<SettingsSecAsrSunIcon size={38} />}
            iconBgColor="transparent"
            title="Hanafi"
            subtitle="Shadow = 2x"
            isRadio
            radioSelected={currentAsrMethod === 'HANAFI'}
            onPress={() => handleSelectAsrMethod('HANAFI')}
            testID="asr-method-hanafi"
          />
        </SettingsGroup>

        {/* GROUP 4: ADJUST PRAYER TIMES */}
        <SettingsGroup
          title="Adjust Prayer Times"
          subtitle="Fine-tune prayer times if needed"
          testID="adjust-prayer-times-card"
        >
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((p, index) => {
            const val = adjustments[p] ?? 0;
            const displayName = p.charAt(0).toUpperCase() + p.slice(1);
            return (
              <React.Fragment key={p}>
                {index > 0 && <SettingsGroupDivider />}
                <View style={[styles.adjustmentRow, { paddingHorizontal: spacing.md, paddingVertical: 10 }]}>
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
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityLabel={`Decrease ${displayName}`}
                    >
                      <SettingsStepperMinusIcon size={30} />
                    </Pressable>

                    <Pressable
                      onPress={() => handleAdjustPrayer(p, 1)}
                      style={({ pressed }) => [
                        styles.stepperBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityLabel={`Increase ${displayName}`}
                    >
                      <SettingsStepperPlusIcon size={30} />
                    </Pressable>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </SettingsGroup>
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
