import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '@/theme';
import PrayerCalculationScreen from '../prayer-calculation';
import * as userSettingsHook from '@/hooks/useUserSettings';
import * as settingsMutationHook from '@/hooks/useSettingsMutation';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('PrayerCalculationScreen', () => {
  let mockApplyTemporalSettings: jest.Mock;
  let mockReload: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockApplyTemporalSettings = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      category: 'TEMPORAL_FULL_REFRESH',
      refreshed: true,
    });

    mockReload = jest.fn().mockResolvedValue(undefined);

    jest.spyOn(settingsMutationHook, 'useSettingsMutation').mockReturnValue({
      isSaving: false,
      error: null,
      lastResult: null,
      applyTemporalSettings: mockApplyTemporalSettings,
      applyPresentationSettings: jest.fn(),
      setHijriGlobalAdjustment: jest.fn(),
      upsertHijriMonthOverride: jest.fn(),
      deleteHijriMonthOverride: jest.fn(),
      applySettingsChange: jest.fn(),
    });

    jest.spyOn(userSettingsHook, 'useUserSettings').mockReturnValue({
      settings: {
        id: 'default',
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
        locationMode: 'AUTO',
        manualLatitude: null,
        manualLongitude: null,
        manualLocationName: null,
        manualTimezone: null,
        lastKnownTimezone: 'America/New_York',
        lastAutoLatitude: 40.7128,
        lastAutoLongitude: -74.006,
        createdAt: '2026-09-18T00:00:00.000Z',
        updatedAt: '2026-09-18T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      reload: mockReload,
    });
  });

  const renderScreen = async () => {
    return render(
      <ThemeProvider>
        <PrayerCalculationScreen />
      </ThemeProvider>
    );
  };

  it('renders all 5 groups and initial loaded method', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('CALCULATION METHOD')).toBeTruthy();
      expect(screen.getByText('ASR JURISPRUDENCE')).toBeTruthy();
      expect(screen.getByText('HIGH LATITUDE RULE')).toBeTruthy();
      expect(screen.getByText('MANUAL PRAYER ADJUSTMENTS (MINUTES)')).toBeTruthy();
    });

    // Preview card is rendered because location coords and timezone are available
    expect(screen.getByTestId('prayer-preview-card')).toBeTruthy();
  });

  it('allows draft selection without immediately calling mutation coordinator', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('calc-method-option-ISNA')).toBeTruthy();
    });

    // Select ISNA
    fireEvent.press(screen.getByTestId('calc-method-option-ISNA'));

    // Invariant: coordinator must NOT have been called yet (Draft pattern)
    expect(mockApplyTemporalSettings).not.toHaveBeenCalled();

    // Button should now show "Apply Changes" and be enabled
    const applyBtn = screen.getByTestId('apply-changes-button');
    expect(applyBtn).toBeTruthy();
  });

  it('steppers adjust per-prayer minutes in draft state', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('stepper-fajr-increment')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('stepper-fajr-increment'));
    expect(await screen.findByText('+1 min')).toBeTruthy();

    expect(mockApplyTemporalSettings).not.toHaveBeenCalled();
  });

  it('tapping Apply Changes persists draft via coordinator and calls reload', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('calc-method-option-MAKKAH')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('calc-method-option-MAKKAH'));

    const applyBtn = await screen.findByText('Apply Changes');
    fireEvent.press(applyBtn);

    await waitFor(() => {
      expect(mockApplyTemporalSettings).toHaveBeenCalledTimes(1);
    });

    const callArg = mockApplyTemporalSettings.mock.calls[0][0];
    expect(callArg.calculationMethod).toBe('MAKKAH');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Prayer Settings Applied',
        expect.any(String),
        expect.any(Array)
      );
    });
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('surfaces recoverable feedback when persistence succeeds but refresh fails', async () => {
    mockApplyTemporalSettings.mockResolvedValue({
      status: 'PERSISTED_REFRESH_FAILED',
      category: 'TEMPORAL_FULL_REFRESH',
      error: 'Refresh timeout',
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('calc-method-option-KARACHI')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('calc-method-option-KARACHI'));
    const applyBtn = await screen.findByText('Apply Changes');
    fireEvent.press(applyBtn);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Settings Saved',
        expect.stringContaining('temporary issue'),
        expect.any(Array)
      );
    });
  });

  it('reveals advanced polar circle settings when toggle is pressed', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('toggle-advanced-polar')).toBeTruthy();
    });

    expect(screen.queryByTestId('polar-resolution-AQRAB_YAUM')).toBeNull();

    fireEvent.press(screen.getByTestId('toggle-advanced-polar'));

    expect(await screen.findByTestId('polar-resolution-AQRAB_YAUM')).toBeTruthy();
    expect(screen.getByTestId('polar-resolution-AQRAB_BALAD')).toBeTruthy();
    expect(screen.getByTestId('polar-resolution-UNRESOLVED')).toBeTruthy();
  });
});
