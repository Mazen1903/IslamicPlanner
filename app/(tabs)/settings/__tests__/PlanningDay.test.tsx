import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '@/theme';
import PlanningDayScreen from '../planning-day';
import * as userSettingsHook from '@/hooks/useUserSettings';
import * as settingsMutationHook from '@/hooks/useSettingsMutation';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('PlanningDayScreen', () => {
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
  });

  const renderScreen = async (planningDayStart = 'FAJR') => {
    jest.spyOn(userSettingsHook, 'useUserSettings').mockReturnValue({
      settings: {
        id: 'default',
        calculationMethod: 'MWL',
        asrMethod: 'SHAFI',
        highLatitudeRule: 'AUTO',
        polarCircleResolution: 'AQRAB_YAUM',
        prayerAdjustments: '{}',
        planningDayStart,
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

    return render(
      <ThemeProvider>
        <PlanningDayScreen />
      </ThemeProvider>
    );
  };

  it('renders FAJR as selected by default and does not render MIDNIGHT or CUSTOM as selectable options', async () => {
    await renderScreen('FAJR');

    expect(screen.getByTestId('planning-day-option-fajr')).toBeTruthy();
    expect(screen.getByText('Fajr (Default & Recommended)')).toBeTruthy();

    // Invariant: MIDNIGHT and CUSTOM are not selectable options in M17
    expect(screen.queryByTestId('planning-day-option-midnight')).toBeNull();
    expect(screen.queryByTestId('planning-day-option-custom')).toBeNull();
    expect(screen.queryByTestId('switch-to-fajr-button')).toBeNull();

    // Future modes informational card is rendered
    expect(screen.getByTestId('planning-day-future-modes-card')).toBeTruthy();
  });

  it('accurately displays existing MIDNIGHT setting and allows switching back to FAJR', async () => {
    await renderScreen('MIDNIGHT');

    expect(screen.getByTestId('planning-day-current-value')).toBeTruthy();
    expect(screen.getByText('Current custom mode: MIDNIGHT')).toBeTruthy();

    const switchBtn = screen.getByTestId('switch-to-fajr-button');
    expect(switchBtn).toBeTruthy();

    fireEvent.press(switchBtn);

    await waitFor(() => {
      expect(mockApplyTemporalSettings).toHaveBeenCalledWith({ planningDayStart: 'FAJR' });
    });
    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Planning Day Updated',
      expect.stringContaining('Fajr'),
      expect.any(Array)
    );
  });

  it('accurately displays existing CUSTOM setting and allows switching back to FAJR', async () => {
    await renderScreen('CUSTOM:03:00');

    expect(screen.getByTestId('planning-day-current-value')).toBeTruthy();
    expect(screen.getByText('Current custom mode: CUSTOM:03:00')).toBeTruthy();

    const switchBtn = screen.getByTestId('switch-to-fajr-button');
    fireEvent.press(switchBtn);

    await waitFor(() => {
      expect(mockApplyTemporalSettings).toHaveBeenCalledWith({ planningDayStart: 'FAJR' });
    });
  });

  it('surfaces calm recoverable feedback if refresh fails after persisting FAJR', async () => {
    mockApplyTemporalSettings.mockResolvedValue({
      status: 'PERSISTED_REFRESH_FAILED',
      category: 'TEMPORAL_FULL_REFRESH',
      error: 'Refresh timeout',
    });

    await renderScreen('MIDNIGHT');

    fireEvent.press(screen.getByTestId('switch-to-fajr-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Planning Day Updated',
        expect.stringContaining('automatically'),
        expect.any(Array)
      );
    });
  });
});
