import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '@/theme';
import HijriCalendarScreen from '../hijri-calendar';
import * as userSettingsHook from '@/hooks/useUserSettings';
import * as settingsMutationHook from '@/hooks/useSettingsMutation';
import { hijriMonthOverrideRepository } from '@/data/repositories/HijriMonthOverrideRepository';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('HijriCalendarScreen', () => {
  let mockSetGlobalAdjustment: jest.Mock;
  let mockUpsertOverride: jest.Mock;
  let mockDeleteOverride: jest.Mock;
  let mockReloadSettings: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockSetGlobalAdjustment = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      category: 'HIJRI_RECURRENCE_REFRESH',
      refreshed: true,
    });
    mockUpsertOverride = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      category: 'HIJRI_RECURRENCE_REFRESH',
      refreshed: true,
    });
    mockDeleteOverride = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      category: 'HIJRI_RECURRENCE_REFRESH',
      refreshed: true,
    });
    mockReloadSettings = jest.fn().mockResolvedValue(undefined);

    jest.spyOn(settingsMutationHook, 'useSettingsMutation').mockReturnValue({
      isSaving: false,
      error: null,
      lastResult: null,
      applyTemporalSettings: jest.fn(),
      applyPresentationSettings: jest.fn(),
      setHijriGlobalAdjustment: mockSetGlobalAdjustment,
      upsertHijriMonthOverride: mockUpsertOverride,
      deleteHijriMonthOverride: mockDeleteOverride,
      applySettingsChange: jest.fn(),
    });

    jest.spyOn(hijriMonthOverrideRepository, 'list').mockResolvedValue([]);
  });

  const renderScreen = async (globalAdjustment = 0) => {
    jest.spyOn(userSettingsHook, 'useUserSettings').mockReturnValue({
      settings: {
        id: 'default',
        calculationMethod: 'MWL',
        asrMethod: 'SHAFI',
        highLatitudeRule: 'AUTO',
        polarCircleResolution: 'AQRAB_YAUM',
        prayerAdjustments: '{}',
        planningDayStart: 'FAJR',
        hijriBaseMethod: 'UMM_AL_QURA',
        hijriGlobalAdjustment: globalAdjustment,
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
      reload: mockReloadSettings,
    });

    return render(
      <ThemeProvider>
        <HijriCalendarScreen />
      </ThemeProvider>
    );
  };

  it('renders effective Hijri preview, Umm al-Qura authority, and global adjustment stepper', async () => {
    await renderScreen(0);

    expect(screen.getByTestId('hijri-effective-preview')).toBeTruthy();

    // Authority is Umm al-Qura and read-only
    expect(screen.getByTestId('hijri-base-method-row')).toBeTruthy();
    expect(screen.getByText('Umm al-Qura')).toBeTruthy();

    // Stepper is rendered
    expect(screen.getByTestId('hijri-global-stepper')).toBeTruthy();
  });

  it('adjusting global stepper calls setHijriGlobalAdjustment and reloads', async () => {
    await renderScreen(0);

    const incrementBtn = screen.getByTestId('hijri-global-stepper-increment');
    fireEvent.press(incrementBtn);

    await waitFor(() => {
      expect(mockSetGlobalAdjustment).toHaveBeenCalledWith(1);
    });
    expect(mockReloadSettings).toHaveBeenCalledTimes(1);
  });

  it('renders month overrides and handles adding an override via modal', async () => {
    await renderScreen(0);

    const addBtn = screen.getByTestId('add-override-button');
    fireEvent.press(addBtn);

    await waitFor(() => {
      expect(screen.getByTestId('add-override-modal')).toBeTruthy();
    });

    const saveBtn = screen.getByTestId('modal-save-button');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(mockUpsertOverride).toHaveBeenCalledWith(expect.any(Number), 9, 0);
    });
  });

  it('renders existing overrides and prompts confirmation before delete', async () => {
    jest.spyOn(hijriMonthOverrideRepository, 'list').mockResolvedValue([
      {
        id: 'ov-1',
        hijriYear: 1448,
        hijriMonth: 9,
        adjustmentDays: 1,
        createdAt: '2026-09-18T00:00:00.000Z',
        updatedAt: '2026-09-18T00:00:00.000Z',
      },
    ]);

    await renderScreen(0);

    await waitFor(() => {
      expect(screen.getByTestId('override-item-1448-9')).toBeTruthy();
    });

    const deleteBtn = screen.getByTestId('delete-override-1448-9');
    fireEvent.press(deleteBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove Override',
      expect.stringContaining('Ramadan 1448 AH'),
      expect.any(Array)
    );

    // Execute the destructive button callback from the Alert
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const buttons = alertCalls[alertCalls.length - 1][2];
    const removeBtn = buttons.find((b: any) => b.style === 'destructive');
    expect(removeBtn).toBeDefined();

    await removeBtn.onPress();

    expect(mockDeleteOverride).toHaveBeenCalledWith(1448, 9);
  });
});
