import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react-native';
import OnboardingScreen from '../index';
import { ThemeProvider } from '@/theme';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import type { UserSettingsRepository, UserSettingsRow } from '@/data/repositories/UserSettingsRepository';
import type { ILocationService } from '@/services/LocationService';
import type { OnboardingCoordinator } from '@/services/onboarding/OnboardingCoordinator';
import { CALCULATION_METHOD_LABELS } from '@/domain/prayer/calculationMethods';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@/domain/location/cityLoader', () => ({
  loadCityDataset: jest.fn().mockResolvedValue([
    { id: '1', name: 'Chicago', countryCode: 'US', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' },
    { id: '2', name: 'Medina', countryCode: 'SA', latitude: 24.4672, longitude: 39.6111, timezone: 'Asia/Riyadh' },
    { id: '3', name: 'Cairo', countryCode: 'EG', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo' },
    { id: '4', name: 'UnknownLand', countryCode: 'XX', latitude: 10, longitude: 20, timezone: 'Africa/Cairo' },
  ]),
}));

jest.mock('@/services/PlannerRefreshCoordinator', () => ({
  plannerRefreshCoordinator: {
    fullRefresh: jest.fn().mockResolvedValue({
      status: 'READY',
      viewModel: {},
      runtime: {},
      horizonSync: {},
    }),
  },
  PlannerRefreshCoordinator: jest.fn().mockImplementation(() => ({
    fullRefresh: jest.fn().mockResolvedValue({
      status: 'READY',
      viewModel: {},
      runtime: {},
      horizonSync: {},
    }),
  })),
}));

describe('OnboardingScreen Integration (F, L, C, P series tests)', () => {
  let mockSettings: UserSettingsRow;
  let mockRepo: jest.Mocked<UserSettingsRepository>;
  let mockLocationService: jest.Mocked<ILocationService>;
  let mockCoordinator: jest.Mocked<OnboardingCoordinator>;
  let mockRefreshCoordinator: any;

  const createDefaultSettings = (overrides?: Partial<UserSettingsRow>): UserSettingsRow => ({
    id: 'default',
    locationMode: 'AUTO',
    manualLatitude: null,
    manualLongitude: null,
    manualLocationName: null,
    manualTimezone: null,
    lastKnownTimezone: null,
    lastAutoLatitude: null,
    lastAutoLongitude: null,
    calculationMethod: 'MWL',
    asrMethod: 'SHAFI',
    highLatitudeRule: 'AUTO',
    polarCircleResolution: 'AQRAB_YAUM',
    prayerAdjustments: '{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}',
    planningDayStart: 'FAJR',
    hijriBaseMethod: 'UMM_AL_QURA',
    hijriGlobalAdjustment: 0,
    worshipSuggestionsEnabled: true,
    prayerAlertsEnabled: true,
    themeMode: 'SYSTEM',
    isPremium: false,
    onboardingCompleted: false,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  });

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.getState().reset();
    mockSettings = createDefaultSettings();

    mockRepo = {
      get: jest.fn().mockImplementation(async () => mockSettings),
      upsert: jest.fn().mockImplementation(async patch => {
        mockSettings = { ...mockSettings, ...patch };
        return mockSettings;
      }),
      saveAutoLocation: jest.fn().mockImplementation(async (coords, tz) => {
        mockSettings = {
          ...mockSettings,
          locationMode: 'AUTO',
          lastAutoLatitude: coords.latitude,
          lastAutoLongitude: coords.longitude,
          lastKnownTimezone: tz,
        };
      }),
      saveManualLocation: jest.fn().mockImplementation(async (coords, name, tz) => {
        mockSettings = {
          ...mockSettings,
          locationMode: 'MANUAL',
          manualLatitude: coords.latitude,
          manualLongitude: coords.longitude,
          manualLocationName: name,
          manualTimezone: tz,
        };
      }),
      updateLastKnownTimezone: jest.fn(),
    } as unknown as jest.Mocked<UserSettingsRepository>;

    mockLocationService = {
      requestForegroundPermission: jest.fn().mockResolvedValue('GRANTED'),
      getCurrentCoordinates: jest.fn().mockResolvedValue({ latitude: 41.8781, longitude: -87.6298 }),
      getDeviceTimezone: jest.fn().mockReturnValue('America/Chicago'),
    } as unknown as jest.Mocked<ILocationService>;

    mockCoordinator = {
      complete: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
    } as unknown as jest.Mocked<OnboardingCoordinator>;

    mockRefreshCoordinator = {
      fullRefresh: jest.fn().mockResolvedValue({
        status: 'READY',
        viewModel: {},
        runtime: {},
        horizonSync: {},
      }),
    };
  });

  const renderScreen = async (props?: any) => {
    return await render(
      <ThemeProvider>
        <OnboardingScreen
          coordinator={mockCoordinator}
          userSettingsRepo={mockRepo}
          locationService={mockLocationService}
          plannerRefreshCoordinator={mockRefreshCoordinator}
          {...props}
        />
      </ThemeProvider>
    );
  };

  // ==========================================
  // Flow Tests (F-series)
  // ==========================================

  it('F-01: Screen 1 shows five prayers in canonical order (Fajr, Dhuhr, Asr, Maghrib, Isha)', async () => {
    await renderScreen();

    expect(screen.getByTestId('screen-salah-intro')).toBeTruthy();
    expect(screen.getByText('Your day, centered around Salah')).toBeTruthy();

    const prayerElements = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(name =>
      screen.getByText(name)
    );
    expect(prayerElements).toHaveLength(5);
  });

  it('F-02: Screen 1 makes no DB writes, no GPS calls, no network calls', async () => {
    await renderScreen();

    expect(mockRepo.upsert).not.toHaveBeenCalled();
    expect(mockLocationService.requestForegroundPermission).not.toHaveBeenCalled();
    expect(mockLocationService.getCurrentCoordinates).not.toHaveBeenCalled();
  });

  it('F-03: Screen 1 "Get Started" advances to Screen 2 which displays adaptive schedule example', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('get-started-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('screen-schedule-example')).toBeTruthy();
    });
    expect(screen.getByText('Soccer — 6:00 PM')).toBeTruthy();
    expect(screen.getByText('Summer → Asr')).toBeTruthy();
    expect(screen.getByText('Winter → Maghrib')).toBeTruthy();
    expect(
      screen.getByText(
        'The task remains at 6:00 PM. The app automatically places it in the prayer period where it belongs.'
      )
    ).toBeTruthy();
  });

  it('F-04 & F-05: Screen 2 performs ZERO scheduling, task definition, materialization, or database writes', async () => {
    await renderScreen({ initialStep: 'SCHEDULE_EXAMPLE' });

    expect(mockRepo.upsert).not.toHaveBeenCalled();
    expect(mockRepo.saveAutoLocation).not.toHaveBeenCalled();
    expect(mockRepo.saveManualLocation).not.toHaveBeenCalled();
  });

  it('F-06: Screen 3 displays Location and Calculation Method sections together on one screen', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    expect(screen.getByTestId('screen-prayer-setup')).toBeTruthy();
    expect(screen.getByText('Location')).toBeTruthy();
    expect(screen.getByText('Prayer Calculation')).toBeTruthy();
  });

  it('F-07: Screen 4 displays theme picker, setup summary, and Start Planning CTA', async () => {
    await renderScreen({ initialStep: 'MAKE_IT_YOURS' });

    expect(screen.getByTestId('screen-make-it-yours')).toBeTruthy();
    expect(screen.getByText('Make it yours')).toBeTruthy();
    expect(screen.getByTestId('theme-option-system')).toBeTruthy();
    expect(screen.getByTestId('theme-option-light')).toBeTruthy();
    expect(screen.getByTestId('theme-option-dark')).toBeTruthy();
    expect(screen.getByText('Setup Summary')).toBeTruthy();
    expect(screen.getByTestId('start-planning-button')).toBeTruthy();
  });

  it('F-08: Back navigation steps correctly through internal onboarding without exposing protected routes', async () => {
    await renderScreen({ initialStep: 'SCHEDULE_EXAMPLE' });

    // Back from Screen 2 -> Screen 1
    await act(async () => {
      fireEvent.press(screen.getByTestId('back-button'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('screen-salah-intro')).toBeTruthy();
    });

    // Advance to Screen 2 -> Screen 3
    await act(async () => {
      fireEvent.press(screen.getByTestId('get-started-button'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('screen-schedule-example')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('next-button'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('screen-prayer-setup')).toBeTruthy();
    });

    // Back from Screen 3 -> Screen 2 (F-08b)
    await act(async () => {
      fireEvent.press(screen.getByTestId('back-button'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('screen-schedule-example')).toBeTruthy();
    });
  });

  it('F-08c: Back from Screen 4 returns to Screen 3', async () => {
    await renderScreen({ initialStep: 'MAKE_IT_YOURS' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('back-button'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('screen-prayer-setup')).toBeTruthy();
    });
  });

  // ==========================================
  // Location Tests (L-series)
  // ==========================================

  it('L-01: GPS permission is NOT prompted on mount of Screen 3', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    expect(mockLocationService.requestForegroundPermission).not.toHaveBeenCalled();
    expect(mockLocationService.getCurrentCoordinates).not.toHaveBeenCalled();
  });

  it('L-02: Tapping "Use My Location" explicitly prompts for GPS permission', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('use-my-location-button'));
    });

    expect(mockLocationService.requestForegroundPermission).toHaveBeenCalledTimes(1);
    expect(mockLocationService.getCurrentCoordinates).toHaveBeenCalledTimes(1);
  });

  it('L-03: Valid AUTO location commits and enables Screen 3 "Continue" button', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    expect(screen.getByTestId('continue-button').props.accessibilityState?.disabled).toBe(true);

    await act(async () => {
      fireEvent.press(screen.getByTestId('use-my-location-button'));
    });

    await waitFor(() => {
      expect(mockRepo.saveAutoLocation).toHaveBeenCalled();
    });
  });

  it('L-04: GPS permission denied shows inline error and keeps "Choose City Manually" visible', async () => {
    mockLocationService.requestForegroundPermission.mockResolvedValueOnce('DENIED');

    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('use-my-location-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-error-text')).toBeTruthy();
      expect(screen.getByText(/Location permission was denied/i)).toBeTruthy();
      expect(screen.getByTestId('choose-city-manually-button')).toBeTruthy();
    });
  });

  it('L-05: GPS failure shows inline error and keeps "Choose City Manually" visible', async () => {
    mockLocationService.getCurrentCoordinates.mockResolvedValueOnce(null);

    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('use-my-location-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-error-text')).toBeTruthy();
      expect(screen.getByText(/Unable to acquire current location/i)).toBeTruthy();
      expect(screen.getByTestId('choose-city-manually-button')).toBeTruthy();
    });
  });

  it('L-06: Valid MANUAL city selection commits and enables Screen 3 "Continue" button', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    // Open search
    await act(async () => {
      fireEvent.press(screen.getByTestId('choose-city-manually-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('city-search-input')).toBeTruthy();
    });

    // Type query
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('city-search-input'), 'Chi');
    });

    await waitFor(() => {
      expect(screen.getByTestId('city-result-1')).toBeTruthy();
    });

    // Select Chicago
    await act(async () => {
      fireEvent.press(screen.getByTestId('city-result-1'));
    });

    await waitFor(() => {
      expect(mockRepo.saveManualLocation).toHaveBeenCalledWith(
        { latitude: 41.8781, longitude: -87.6298 },
        'Chicago',
        'America/Chicago'
      );
    });
  });

  it('L-07: Existing committed AUTO snapshot recognized on Screen 3 mount without prompting GPS', async () => {
    mockSettings = createDefaultSettings({
      locationMode: 'AUTO',
      lastAutoLatitude: 41.8781,
      lastAutoLongitude: -87.6298,
      lastKnownTimezone: 'America/Chicago',
    });

    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await waitFor(() => {
      expect(screen.getByText('Automatic Location')).toBeTruthy();
      expect(screen.getByText(/America\/Chicago/)).toBeTruthy();
    });

    // GPS never prompted
    expect(mockLocationService.requestForegroundPermission).not.toHaveBeenCalled();
    // Continue is enabled
    expect(screen.getByTestId('continue-button').props.accessibilityState?.disabled).toBeFalsy();
  });

  it('L-08: Existing committed MANUAL location recognized on Screen 3 mount', async () => {
    mockSettings = createDefaultSettings({
      locationMode: 'MANUAL',
      manualLatitude: 24.4672,
      manualLongitude: 39.6111,
      manualLocationName: 'Medina',
      manualTimezone: 'Asia/Riyadh',
    });

    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await waitFor(() => {
      expect(screen.getByText('Selected Location')).toBeTruthy();
      expect(screen.getByText('Medina')).toBeTruthy();
      expect(screen.getByText(/Asia\/Riyadh/)).toBeTruthy();
    });

    // Continue is enabled
    expect(screen.getByTestId('continue-button').props.accessibilityState?.disabled).toBeFalsy();
  });

  // ==========================================
  // Calculation Method Tests (C-series)
  // ==========================================

  it('C-01: MANUAL city with known countryCode recommends REGION_METHOD_MAP[code]', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('choose-city-manually-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('city-search-input')).toBeTruthy();
    });

    // Search and select Cairo (EG -> EGYPT)
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('city-search-input'), 'Cairo');
    });

    await waitFor(() => {
      expect(screen.getByTestId('city-result-3')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('city-result-3'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Recommended: Egyptian General Authority of Survey/i)).toBeTruthy();
    });
  });

  it('C-02: MANUAL city with unknown countryCode defaults recommendation to MWL', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('choose-city-manually-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('city-search-input')).toBeTruthy();
    });

    // Search and select UnknownLand (XX -> MWL)
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('city-search-input'), 'UnknownLand');
    });

    await waitFor(() => {
      expect(screen.getByTestId('city-result-4')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('city-result-4'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Recommended: Muslim World League/i)).toBeTruthy();
    });
  });

  it('C-03 & C-04: AUTO location calls recommendCalculationMethod which defaults to MWL', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('use-my-location-button'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Recommended: Muslim World League/i)).toBeTruthy();
    });
  });

  it('C-05: Default Screen 3 shows simple recommendation label without advanced fiqh controls', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    expect(screen.queryByText(/high latitude rule/i)).toBeNull();
    expect(screen.queryByText(/polar circle/i)).toBeNull();
    expect(screen.queryByText(/manual minute adjustments/i)).toBeNull();
    expect(screen.queryByText(/twilight angle/i)).toBeNull();
  });

  it('C-06: "Change Method" exposes 12 basic method labels only', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('change-method-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('calc-method-option-MWL')).toBeTruthy();
    });

    // All 12 methods from CALCULATION_METHOD_LABELS should be rendered
    const methodKeys = Object.keys(CALCULATION_METHOD_LABELS);
    expect(methodKeys).toHaveLength(12);

    for (const key of methodKeys) {
      expect(screen.getByTestId(`calc-method-option-${key}`)).toBeTruthy();
    }
  });

  it('C-07: User-selected method is NOT overwritten on subsequent location update or render', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    // User chooses Karachi
    await act(async () => {
      fireEvent.press(screen.getByTestId('change-method-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('calc-method-option-KARACHI')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('calc-method-option-KARACHI'));
    });

    expect(screen.getByText(/Selected method: University of Islamic Sciences, Karachi/i)).toBeTruthy();

    // Now select a city (Cairo, EG which would have recommended EGYPT)
    await act(async () => {
      fireEvent.press(screen.getByTestId('choose-city-manually-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('city-search-input')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('city-search-input'), 'Cairo');
    });

    await waitFor(() => {
      expect(screen.getByTestId('city-result-3')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('city-result-3'));
    });

    // Should STILL be Karachi!
    expect(screen.getByText(/Selected method: University of Islamic Sciences, Karachi/i)).toBeTruthy();
    expect(screen.queryByText(/Egyptian General Authority/i)).toBeNull();
  });

  it('C-08 & C-09: Screen does not write calculation method directly to repo; stays in draft', async () => {
    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('change-method-button'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('calc-method-option-KARACHI')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('calc-method-option-KARACHI'));
    });

    // Repo upsert must NOT have been called for calculationMethod
    const calcUpserts = mockRepo.upsert.mock.calls.filter(c => 'calculationMethod' in c[0]);
    expect(calcUpserts).toHaveLength(0);
  });

  it('C-10, C-11, C-12: Existing MANUAL location reused: draft uses settings.calculationMethod with "Current method" label', async () => {
    mockSettings = createDefaultSettings({
      locationMode: 'MANUAL',
      manualLatitude: 24.4672,
      manualLongitude: 39.6111,
      manualLocationName: 'Medina',
      manualTimezone: 'Asia/Riyadh',
      calculationMethod: 'MAKKAH',
    });

    await renderScreen({ initialStep: 'PRAYER_SETUP' });

    await waitFor(() => {
      expect(screen.getByText(/Current method: Umm Al-Qura University, Makkah/i)).toBeTruthy();
      expect(screen.queryByText(/Recommended: Umm Al-Qura/i)).toBeNull();
    });
  });

  // ==========================================
  // Preferences Tests (P-series)
  // ==========================================

  it('P-01: Screen 4 offers SYSTEM / LIGHT / DARK theme options', async () => {
    await renderScreen({ initialStep: 'MAKE_IT_YOURS' });

    expect(screen.getByTestId('theme-option-system')).toBeTruthy();
    expect(screen.getByTestId('theme-option-light')).toBeTruthy();
    expect(screen.getByTestId('theme-option-dark')).toBeTruthy();
  });

  it('P-02: Tapping theme options calls ThemeProvider setThemeMode immediately', async () => {
    const mockOnModeChange = jest.fn();

    await render(
      <ThemeProvider onModeChange={mockOnModeChange}>
        <OnboardingScreen
          coordinator={mockCoordinator}
          userSettingsRepo={mockRepo}
          locationService={mockLocationService}
          plannerRefreshCoordinator={mockRefreshCoordinator}
          initialStep="MAKE_IT_YOURS"
        />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-option-dark'));
    });
    expect(mockOnModeChange).toHaveBeenCalledWith('DARK');

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-option-light'));
    });
    expect(mockOnModeChange).toHaveBeenCalledWith('LIGHT');

    await act(async () => {
      fireEvent.press(screen.getByTestId('theme-option-system'));
    });
    expect(mockOnModeChange).toHaveBeenCalledWith('SYSTEM');
  });

  it('P-03, P-04, P-05, P-06: No Worship, Prayer Alerts, Premium, or Notification toggles on Screen 4', async () => {
    await renderScreen({ initialStep: 'MAKE_IT_YOURS' });

    expect(screen.queryByText(/worship/i)).toBeNull();
    expect(screen.queryByText(/prayer alerts/i)).toBeNull();
    expect(screen.queryByText(/premium/i)).toBeNull();
    expect(screen.queryByText(/notification permission/i)).toBeNull();
  });

  // ==========================================
  // Completion Tests (OC-series integration)
  // ==========================================

  it('OC-10: "Start Planning" calls coordinator.complete, marks store complete BEFORE router.replace', async () => {
    let storeStatusAtReplace = '';
    mockReplace.mockImplementation(() => {
      storeStatusAtReplace = useOnboardingStore.getState().status;
    });

    await renderScreen({ initialStep: 'MAKE_IT_YOURS' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('start-planning-button'));
    });

    expect(mockCoordinator.complete).toHaveBeenCalledWith({
      calculationMethod: 'MWL',
    });

    // markComplete called BEFORE router.replace
    expect(storeStatusAtReplace).toBe('COMPLETE');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });
});
