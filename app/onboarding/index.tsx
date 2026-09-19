import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, type ThemeMode } from '@/theme';
import { SafeArea } from '@/components/layout/SafeArea';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useLocation } from '@/hooks/useLocation';
import {
  userSettingsRepository,
  UserSettingsRepository,
} from '@/data/repositories/UserSettingsRepository';
import {
  ILocationService,
  locationService as defaultLocationService,
} from '@/services/LocationService';
import {
  plannerRefreshCoordinator as defaultPlannerRefreshCoordinator,
  PlannerRefreshCoordinator,
} from '@/services/PlannerRefreshCoordinator';
import {
  onboardingCoordinator as defaultCoordinator,
  OnboardingCoordinator,
} from '@/services/onboarding/OnboardingCoordinator';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import {
  CALCULATION_METHOD_LABELS,
  REGION_METHOD_MAP,
  recommendCalculationMethod,
} from '@/domain/prayer/calculationMethods';
import type { CalculationMethodKey } from '@/domain/prayer/types';
import type { CityRecord } from '@/domain/location/types';
import { loadCityDataset } from '@/domain/location/cityLoader';
import { searchCities } from '@/domain/location/citySearch';
import { isValidTimezone } from '@/domain/temporal/timezoneUtils';

export type OnboardingStep =
  | 'SALAH_INTRO'
  | 'SCHEDULE_EXAMPLE'
  | 'PRAYER_SETUP'
  | 'MAKE_IT_YOURS';

export interface OnboardingScreenProps {
  coordinator?: OnboardingCoordinator;
  userSettingsRepo?: UserSettingsRepository;
  locationService?: ILocationService;
  plannerRefreshCoordinator?: PlannerRefreshCoordinator;
  initialStep?: OnboardingStep;
}

const FIVE_PRAYERS = [
  { key: 'FAJR', name: 'Fajr', description: 'Dawn prayer before sunrise' },
  { key: 'DHUHR', name: 'Dhuhr', description: 'Midday prayer after solar noon' },
  { key: 'ASR', name: 'Asr', description: 'Afternoon prayer before sunset' },
  { key: 'MAGHRIB', name: 'Maghrib', description: 'Sunset prayer right after dusk' },
  { key: 'ISHA', name: 'Isha', description: 'Night prayer after twilight ends' },
];

export default function OnboardingScreen({
  coordinator = defaultCoordinator,
  userSettingsRepo = userSettingsRepository,
  locationService = defaultLocationService,
  plannerRefreshCoordinator = defaultPlannerRefreshCoordinator,
  initialStep = 'SALAH_INTRO',
}: OnboardingScreenProps) {
  const theme = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<OnboardingStep>(initialStep);

  // Calculation method draft state
  const [draftMethod, setDraftMethod] = useState<CalculationMethodKey>('MWL');
  const [methodRecommendationSource, setMethodRecommendationSource] = useState<
    'RECOMMENDED' | 'CURRENT' | 'USER_SELECTED' | 'DEFAULT'
  >('DEFAULT');
  const [userSelectedMethod, setUserSelectedMethod] = useState<boolean>(false);
  const [isMethodSelectorExpanded, setIsMethodSelectorExpanded] = useState<boolean>(false);

  // Location hook
  const locationHook = useLocation({
    userSettingsRepo,
    locationService,
    coordinator: plannerRefreshCoordinator,
  });

  // Manual city search state
  const [isManualSearchOpen, setIsManualSearchOpen] = useState<boolean>(false);
  const [cityQuery, setCityQuery] = useState<string>('');
  const [cityResults, setCityResults] = useState<CityRecord[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState<boolean>(false);

  // Completion state
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Back button handling on Android
  useEffect(() => {
    const onBackPress = () => {
      if (step === 'SCHEDULE_EXAMPLE') {
        setStep('SALAH_INTRO');
        return true;
      }
      if (step === 'PRAYER_SETUP') {
        setStep('SCHEDULE_EXAMPLE');
        return true;
      }
      if (step === 'MAKE_IT_YOURS') {
        setStep('PRAYER_SETUP');
        return true;
      }
      // On Screen 1, allow default hardware behavior (background / exit app)
      // Never navigate into protected routes!
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [step]);

  // Initial location / calculation method draft on Screen 3 mount
  useEffect(() => {
    let active = true;
    userSettingsRepo
      .get()
      .then(settings => {
        if (!active || !settings || userSelectedMethod) return;

        const mode = settings.locationMode ?? 'AUTO';
        if (
          mode === 'AUTO' &&
          settings.lastAutoLatitude !== null &&
          settings.lastAutoLongitude !== null &&
          !(settings.lastAutoLatitude === 0 && settings.lastAutoLongitude === 0)
        ) {
          const rec = recommendCalculationMethod({
            latitude: settings.lastAutoLatitude,
            longitude: settings.lastAutoLongitude,
          });
          setDraftMethod(rec);
          setMethodRecommendationSource('RECOMMENDED');
        } else if (
          mode === 'MANUAL' &&
          settings.manualLatitude !== null &&
          settings.manualLongitude !== null &&
          !(settings.manualLatitude === 0 && settings.manualLongitude === 0)
        ) {
          // EXISTING MANUAL reused:
          // Use settings.calculationMethod as initial draft without countryCode reload
          const existingMethod = (settings.calculationMethod as CalculationMethodKey) ?? 'MWL';
          setDraftMethod(existingMethod);
          setMethodRecommendationSource('CURRENT');
        }
      })
      .catch(() => {
        // Quietly maintain default
      });

    return () => {
      active = false;
    };
  }, [userSettingsRepo, userSelectedMethod]);

  // Check if usable location exists
  const hasUsableLocation = useMemo(() => {
    const { latitude, longitude, timezone } = locationHook;
    return Boolean(
      latitude !== null &&
      longitude !== null &&
      !(latitude === 0 && longitude === 0) &&
      timezone &&
      isValidTimezone(timezone)
    );
  }, [locationHook]);

  // Auto location handler (GPS)
  const handleUseMyLocation = useCallback(async () => {
    const success = await locationHook.requestAutoLocation();
    if (success && !userSelectedMethod) {
      // Re-read fresh coords from repo to recommend calculation method
      try {
        const fresh = await userSettingsRepo.get();
        if (fresh && fresh.lastAutoLatitude !== null && fresh.lastAutoLongitude !== null) {
          const rec = recommendCalculationMethod({
            latitude: fresh.lastAutoLatitude,
            longitude: fresh.lastAutoLongitude,
          });
          setDraftMethod(rec);
          setMethodRecommendationSource('RECOMMENDED');
        }
      } catch {
        // Fallback to MWL
        setDraftMethod('MWL');
        setMethodRecommendationSource('RECOMMENDED');
      }
    }
  }, [locationHook, userSelectedMethod, userSettingsRepo]);

  // City search input change (lazy-loads dataset ONLY when query length >= 2)
  const handleCitySearchChange = useCallback(async (text: string) => {
    setCityQuery(text);
    if (text.trim().length < 2) {
      setCityResults([]);
      setIsSearchingCities(false);
      return;
    }

    setIsSearchingCities(true);
    try {
      const dataset = await loadCityDataset();
      const results = searchCities(text, 20, dataset);
      setCityResults(results);
    } catch (err) {
      console.warn('[Onboarding] City search failed:', err);
      setCityResults([]);
    } finally {
      setIsSearchingCities(false);
    }
  }, []);

  // Manual city selection
  const handleSelectCity = useCallback(
    async (city: CityRecord) => {
      const success = await locationHook.setManualLocation(city);
      if (success) {
        setIsManualSearchOpen(false);
        setCityQuery('');
        setCityResults([]);

        if (!userSelectedMethod) {
          const rec = REGION_METHOD_MAP[city.countryCode] ?? 'MWL';
          setDraftMethod(rec);
          setMethodRecommendationSource('RECOMMENDED');
        }
      }
    },
    [locationHook, userSelectedMethod]
  );

  // Method selection from list
  const handleSelectMethod = useCallback((method: CalculationMethodKey) => {
    setDraftMethod(method);
    setUserSelectedMethod(true);
    setMethodRecommendationSource('USER_SELECTED');
    setIsMethodSelectorExpanded(false);
  }, []);

  // Theme change on Screen 4
  const handleThemePress = useCallback(
    (mode: ThemeMode) => {
      theme.setThemeMode(mode);
    },
    [theme]
  );

  // Final completion CTA
  const handleStartPlanning = useCallback(async () => {
    setIsCompleting(true);
    setCompletionError(null);
    try {
      const result = await coordinator.complete({
        calculationMethod: draftMethod,
      });

      if (result.status === 'SUCCESS' || result.status === 'PERSISTED_REFRESH_FAILED') {
        // Mandatory order: markComplete() BEFORE router.replace()
        useOnboardingStore.getState().markComplete();
        router.replace('/(tabs)/today');
      } else if (result.status === 'LOCATION_REQUIRED') {
        setCompletionError('A valid location is required to finish setup. Please go back and select your location.');
      } else if (result.status === 'SETUP_INCOMPLETE') {
        setCompletionError(`Setup incomplete: ${result.reason}`);
      } else {
        setCompletionError(`Failed to save setup: ${result.error}`);
      }
    } catch (err: any) {
      setCompletionError(err?.message ?? 'An unexpected error occurred during setup.');
    } finally {
      setIsCompleting(false);
    }
  }, [coordinator, draftMethod, router]);

  // Render Step 1: SALAH INTRO
  if (step === 'SALAH_INTRO') {
    return (
      <SafeArea testID="screen-salah-intro" style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={[theme.typography.headlineLarge, { color: theme.colors.textPrimary, textAlign: 'center' }]}>
              Your day, centered around Salah
            </Text>
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm }]}>
              Organize your schedule around the five daily prayers with natural, prayer-anchored planning.
            </Text>
          </View>

          <View style={styles.prayersList}>
            {FIVE_PRAYERS.map(p => (
              <Card key={p.key} style={styles.prayerCard}>
                <View style={styles.prayerRow}>
                  <Text style={[theme.typography.headlineMedium, { color: theme.colors.primary }]}>
                    {p.name}
                  </Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                    {p.description}
                  </Text>
                </View>
              </Card>
            ))}
          </View>

          <View style={styles.footerContainer}>
            <Button
              testID="get-started-button"
              title="Get Started"
              size="lg"
              onPress={() => setStep('SCHEDULE_EXAMPLE')}
            />
          </View>
        </ScrollView>
      </SafeArea>
    );
  }

  // Render Step 2: ADAPTIVE SCHEDULE
  if (step === 'SCHEDULE_EXAMPLE') {
    return (
      <SafeArea testID="screen-schedule-example" style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={[theme.typography.headlineLarge, { color: theme.colors.textPrimary, textAlign: 'center' }]}>
              Your schedule adapts automatically
            </Text>
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm }]}>
              Prayer times shift as seasons change throughout the year. Your tasks automatically stay in the right prayer window.
            </Text>
          </View>

          <View style={styles.illustrationContainer}>
            <Card style={styles.exampleCard}>
              <Text style={[theme.typography.headlineLarge, { color: theme.colors.textPrimary, textAlign: 'center' }]}>
                Soccer — 6:00 PM
              </Text>
              <View style={[styles.exampleDivider, { backgroundColor: theme.colors.divider }]} />
              <View style={styles.exampleSeasonRow}>
                <View style={styles.seasonItem}>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.textSecondary }]}>SUMMER</Text>
                  <Text style={[theme.typography.headlineMedium, { color: theme.colors.primary, marginTop: theme.spacing.xs }]}>
                    Summer → Asr
                  </Text>
                </View>
                <View style={styles.seasonItem}>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.textSecondary }]}>WINTER</Text>
                  <Text style={[theme.typography.headlineMedium, { color: theme.colors.primary, marginTop: theme.spacing.xs }]}>
                    Winter → Maghrib
                  </Text>
                </View>
              </View>
              <Text style={[theme.typography.bodyMedium, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md }]}>
                The task remains at 6:00 PM. The app automatically places it in the prayer period where it belongs.
              </Text>
            </Card>
          </View>

          <View style={styles.footerRow}>
            <Button
              testID="back-button"
              title="Back"
              variant="ghost"
              size="lg"
              style={styles.backButton}
              onPress={() => setStep('SALAH_INTRO')}
            />
            <Button
              testID="next-button"
              title="Next"
              size="lg"
              style={styles.flexButton}
              onPress={() => setStep('PRAYER_SETUP')}
            />
          </View>
        </ScrollView>
      </SafeArea>
    );
  }

  // Render Step 3: SET YOUR PRAYER TIMES
  if (step === 'PRAYER_SETUP') {
    const calcMethodLabel = CALCULATION_METHOD_LABELS[draftMethod]?.label ?? draftMethod;

    return (
      <SafeArea testID="screen-prayer-setup" style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerContainer}>
            <Text style={[theme.typography.headlineLarge, { color: theme.colors.textPrimary, textAlign: 'center' }]}>
              Set your prayer times
            </Text>
            <Text style={[theme.typography.bodyMedium, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xs }]}>
              Accurate prayer times require your location and preferred calculation method.
            </Text>
          </View>

          {/* Location Section */}
          <Card style={styles.sectionCard}>
            <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.sm }]}>
              Location
            </Text>

            {hasUsableLocation ? (
              <View style={[styles.currentLocationBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                  {locationHook.locationMode === 'AUTO' ? 'Automatic Location' : 'Selected Location'}
                </Text>
                <Text style={[theme.typography.labelLarge, { color: theme.colors.textPrimary, marginTop: theme.spacing.xxs }]}>
                  {locationHook.locationName || `${locationHook.latitude?.toFixed(4)}, ${locationHook.longitude?.toFixed(4)}`}
                </Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.xxs }]}>
                  Timezone: {locationHook.timezone}
                </Text>
              </View>
            ) : (
              <Text style={[theme.typography.bodyMedium, { color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }]}>
                Please choose your location to calculate accurate prayer times.
              </Text>
            )}

            {locationHook.error ? (
              <Text testID="location-error-text" style={[theme.typography.bodySmall, { color: theme.colors.error, marginVertical: theme.spacing.xs }]}>
                {locationHook.error}
              </Text>
            ) : null}

            <View style={styles.locationActions}>
              <Button
                testID="use-my-location-button"
                title="Use My Location"
                variant={locationHook.locationMode === 'AUTO' && hasUsableLocation ? 'secondary' : 'primary'}
                loading={locationHook.isLoading}
                onPress={handleUseMyLocation}
                style={{ marginBottom: theme.spacing.sm }}
              />

              <Button
                testID="choose-city-manually-button"
                title={isManualSearchOpen ? 'Close City Search' : 'Choose City Manually'}
                variant="secondary"
                onPress={() => setIsManualSearchOpen(prev => !prev)}
              />
            </View>

            {isManualSearchOpen ? (
              <View style={styles.searchBox}>
                <TextInput
                  testID="city-search-input"
                  placeholder="Search city (e.g. Chicago, Medina)"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={cityQuery}
                  onChangeText={handleCitySearchChange}
                  style={[
                    styles.searchInput,
                    {
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                  autoCapitalize="words"
                />

                {isSearchingCities ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: theme.spacing.sm }} />
                ) : null}

                {cityResults.length > 0 ? (
                  <View testID="city-search-results" style={styles.searchResultsList}>
                    {cityResults.map(city => (
                      <Pressable
                        key={city.id}
                        testID={`city-result-${city.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${city.name}, ${city.countryCode}${city.adminCode ? ` (${city.adminCode})` : ''}, ${city.timezone}`}
                        style={({ pressed }) => [
                          styles.cityResultItem,
                          {
                            backgroundColor: pressed ? theme.colors.surfaceSecondary : 'transparent',
                            borderBottomColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => handleSelectCity(city)}
                      >
                        <Text style={[theme.typography.bodyMedium, { color: theme.colors.textPrimary }]}>
                          {city.name}, {city.countryCode} {city.adminCode ? `(${city.adminCode})` : ''}
                        </Text>
                        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                          {city.timezone}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : cityQuery.trim().length >= 2 && !isSearchingCities ? (
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' }]}>
                    No matching cities found
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Card>

          {/* Calculation Method Section */}
          <Card style={styles.sectionCard}>
            <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.xs }]}>
              Prayer Calculation
            </Text>

            <View style={[styles.methodInfoBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
              {methodRecommendationSource === 'RECOMMENDED' ? (
                <>
                  <Text style={[theme.typography.labelLarge, { color: theme.colors.primary }]}>
                    Recommended: {calcMethodLabel}
                  </Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.xxs }]}>
                    Recommended for your location. You can change this later in Settings.
                  </Text>
                </>
              ) : methodRecommendationSource === 'CURRENT' ? (
                <>
                  <Text style={[theme.typography.labelLarge, { color: theme.colors.textPrimary }]}>
                    Current method: {calcMethodLabel}
                  </Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.xxs }]}>
                    You can change this later in Settings.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[theme.typography.labelLarge, { color: theme.colors.textPrimary }]}>
                    {userSelectedMethod ? 'Selected method' : 'Method'}: {calcMethodLabel}
                  </Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.xxs }]}>
                    You can change this later in Settings.
                  </Text>
                </>
              )}
            </View>

            <Button
              testID="change-method-button"
              title={isMethodSelectorExpanded ? 'Hide Methods' : 'Change Method'}
              variant="ghost"
              size="sm"
              onPress={() => setIsMethodSelectorExpanded(prev => !prev)}
              style={{ marginTop: theme.spacing.sm, alignSelf: 'flex-start' }}
            />

            {isMethodSelectorExpanded ? (
              <View style={styles.methodsList}>
                {(Object.keys(CALCULATION_METHOD_LABELS) as CalculationMethodKey[]).map(methodKey => {
                  const isSelected = draftMethod === methodKey;
                  return (
                    <Pressable
                      key={methodKey}
                      testID={`calc-method-option-${methodKey}`}
                      accessibilityRole="radio"
                      accessibilityLabel={CALCULATION_METHOD_LABELS[methodKey].label}
                      accessibilityState={{ checked: isSelected }}
                      style={({ pressed }) => [
                        styles.methodOptionItem,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.surfaceSecondary
                            : pressed
                            ? theme.colors.surface
                            : 'transparent',
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => handleSelectMethod(methodKey)}
                    >
                      <Text
                        style={[
                          theme.typography.bodyMedium,
                          {
                            color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}
                      >
                        {CALCULATION_METHOD_LABELS[methodKey].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </Card>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <Button
              testID="back-button"
              title="Back"
              variant="ghost"
              size="lg"
              style={styles.backButton}
              onPress={() => setStep('SCHEDULE_EXAMPLE')}
            />
            <Button
              testID="continue-button"
              title="Continue"
              size="lg"
              disabled={!hasUsableLocation}
              style={styles.flexButton}
              onPress={() => setStep('MAKE_IT_YOURS')}
            />
          </View>
        </ScrollView>
      </SafeArea>
    );
  }

  // Render Step 4: MAKE IT YOURS
  const activeThemeMode = theme.themeMode;
  const calcMethodLabel = CALCULATION_METHOD_LABELS[draftMethod]?.label ?? draftMethod;

  return (
    <SafeArea testID="screen-make-it-yours" style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={[theme.typography.headlineLarge, { color: theme.colors.textPrimary, textAlign: 'center' }]}>
            Make it yours
          </Text>
          <Text style={[theme.typography.bodyLarge, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm }]}>
            Choose your appearance theme to personalize your experience.
          </Text>
        </View>

        {/* Theme Preference */}
        <Card style={styles.sectionCard}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.sm }]}>
            Appearance
          </Text>
          <View style={styles.themeOptionsRow}>
            <Pressable
              testID="theme-option-system"
              accessibilityRole="radio"
              accessibilityLabel="System theme"
              accessibilityState={{ checked: activeThemeMode === 'SYSTEM' }}
              style={[
                styles.themeOptionButton,
                {
                  borderColor: activeThemeMode === 'SYSTEM' ? theme.colors.primary : theme.colors.border,
                  backgroundColor: activeThemeMode === 'SYSTEM' ? theme.colors.surfaceSecondary : theme.colors.surface,
                },
              ]}
              onPress={() => handleThemePress('SYSTEM')}
            >
              <Text
                style={[
                  theme.typography.bodyMedium,
                  {
                    color: activeThemeMode === 'SYSTEM' ? theme.colors.primary : theme.colors.textPrimary,
                    fontWeight: activeThemeMode === 'SYSTEM' ? '600' : '400',
                  },
                ]}
              >
                System
              </Text>
            </Pressable>

            <Pressable
              testID="theme-option-light"
              accessibilityRole="radio"
              accessibilityLabel="Light theme"
              accessibilityState={{ checked: activeThemeMode === 'LIGHT' }}
              style={[
                styles.themeOptionButton,
                {
                  borderColor: activeThemeMode === 'LIGHT' ? theme.colors.primary : theme.colors.border,
                  backgroundColor: activeThemeMode === 'LIGHT' ? theme.colors.surfaceSecondary : theme.colors.surface,
                },
              ]}
              onPress={() => handleThemePress('LIGHT')}
            >
              <Text
                style={[
                  theme.typography.bodyMedium,
                  {
                    color: activeThemeMode === 'LIGHT' ? theme.colors.primary : theme.colors.textPrimary,
                    fontWeight: activeThemeMode === 'LIGHT' ? '600' : '400',
                  },
                ]}
              >
                Light
              </Text>
            </Pressable>

            <Pressable
              testID="theme-option-dark"
              accessibilityRole="radio"
              accessibilityLabel="Dark theme"
              accessibilityState={{ checked: activeThemeMode === 'DARK' }}
              style={[
                styles.themeOptionButton,
                {
                  borderColor: activeThemeMode === 'DARK' ? theme.colors.primary : theme.colors.border,
                  backgroundColor: activeThemeMode === 'DARK' ? theme.colors.surfaceSecondary : theme.colors.surface,
                },
              ]}
              onPress={() => handleThemePress('DARK')}
            >
              <Text
                style={[
                  theme.typography.bodyMedium,
                  {
                    color: activeThemeMode === 'DARK' ? theme.colors.primary : theme.colors.textPrimary,
                    fontWeight: activeThemeMode === 'DARK' ? '600' : '400',
                  },
                ]}
              >
                Dark
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* Setup Summary */}
        <Card style={styles.sectionCard}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.sm }]}>
            Setup Summary
          </Text>
          <View style={styles.summaryItem}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Location</Text>
            <Text style={[theme.typography.bodyMedium, { color: theme.colors.textPrimary, marginTop: theme.spacing.xxs }]}>
              {locationHook.locationName || (locationHook.locationMode === 'AUTO' ? 'Automatic (GPS)' : 'Configured')}
            </Text>
          </View>
          <View style={[styles.summaryItem, { marginTop: theme.spacing.sm }]}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Prayer Calculation</Text>
            <Text style={[theme.typography.bodyMedium, { color: theme.colors.textPrimary, marginTop: theme.spacing.xxs }]}>
              {calcMethodLabel}
            </Text>
          </View>
        </Card>

        {completionError ? (
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.error, textAlign: 'center', marginTop: theme.spacing.sm }]}>
            {completionError}
          </Text>
        ) : null}

        {/* Footer Actions */}
        <View style={styles.footerRow}>
          <Button
            testID="back-button"
            title="Back"
            variant="ghost"
            size="lg"
            style={styles.backButton}
            onPress={() => setStep('PRAYER_SETUP')}
          />
          <Button
            testID="start-planning-button"
            title="Start Planning"
            size="lg"
            loading={isCompleting}
            style={styles.flexButton}
            onPress={handleStartPlanning}
          />
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  prayersList: {
    marginBottom: 24,
  },
  prayerCard: {
    marginBottom: 10,
    padding: 14,
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  illustrationContainer: {
    marginVertical: 20,
  },
  exampleCard: {
    padding: 20,
  },
  exampleDivider: {
    height: 1,
    // backgroundColor: set inline via theme.colors.divider (M21)
    marginVertical: 16,
  },
  exampleSeasonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  seasonItem: {
    alignItems: 'center',
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  currentLocationBox: {
    padding: 12,
    borderRadius: 8,
    // backgroundColor: set inline via theme.colors.surfaceSecondary (M21)
    marginBottom: 12,
  },
  locationActions: {
    marginTop: 4,
  },
  searchBox: {
    marginTop: 12,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  searchResultsList: {
    marginTop: 8,
    maxHeight: 200,
  },
  cityResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  methodInfoBox: {
    padding: 12,
    borderRadius: 8,
    // backgroundColor: set inline via theme.colors.surfaceSecondary (M21)
    marginBottom: 4,
  },
  methodsList: {
    marginTop: 10,
  },
  methodOptionItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 6,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeOptionButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  summaryItem: {
    paddingVertical: 4,
  },
  footerContainer: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 16,
    gap: 12,
  },
  backButton: {
    minWidth: 90,
  },
  flexButton: {
    flex: 1,
  },
});
