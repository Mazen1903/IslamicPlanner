import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '@/theme';
import PlanningDayScreen from '../planning-day';
import * as userSettingsHook from '@/hooks/useUserSettings';
import * as entitlementHook from '@/hooks/useEntitlement';
import * as planningDayMutationHook from '@/hooks/usePlanningDayMutation';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('PlanningDayScreen', () => {
  let mockSetPlanningDayStart: jest.Mock;
  let mockReload: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockSetPlanningDayStart = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      refreshed: true,
    });
    mockReload = jest.fn().mockResolvedValue(undefined);

    jest.spyOn(planningDayMutationHook, 'usePlanningDayMutation').mockReturnValue({
      isSaving: false,
      error: null,
      setPlanningDayStart: mockSetPlanningDayStart,
    });

    jest.spyOn(entitlementHook, 'useEntitlement').mockReturnValue({
      isLoading: false,
      isPremium: false,
      tier: 'FREE',
      hasFeature: () => false,
      error: null,
      reload: jest.fn(),
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
        hijriGlobalAdjustment: 0,
        prayerAlertsEnabled: true,
        completedTasksMode: 'KEEP',
        overdueTasksMode: 'KEEP',
        prayerVibrationEnabled: true,
        taskRemindersEnabled: true,
        taskVibrationEnabled: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        defaultReminderMinutes: 10,
        journalReminderEnabled: false,
        journalReminderTime: '21:30',
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
        calendarShowOccasions: true,
        plannerUiState: null,
        reminderDefaults: null,
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

  it('renders FAJR as selected by default, with MIDNIGHT and CUSTOM visible with Premium badges', async () => {
    await renderScreen('FAJR');

    expect(screen.getByTestId('planning-day-option-fajr')).toBeTruthy();
    expect(screen.getByText('Fajr (Default & Recommended)')).toBeTruthy();

    expect(screen.getByTestId('planning-day-option-midnight')).toBeTruthy();
    expect(screen.getByTestId('planning-day-option-custom')).toBeTruthy();
    expect(screen.getByTestId('premium-badge-midnight')).toBeTruthy();
    expect(screen.getByTestId('premium-badge-custom')).toBeTruthy();
  });

  it('accurately displays existing MIDNIGHT setting and allows switching back to FAJR', async () => {
    await renderScreen('MIDNIGHT');

    expect(screen.getByTestId('planning-day-current-value')).toBeTruthy();
    expect(screen.getByText('Current active mode: MIDNIGHT')).toBeTruthy();

    const fajrOption = screen.getByTestId('planning-day-option-fajr');
    expect(fajrOption).toBeTruthy();

    fireEvent.press(fajrOption);

    await waitFor(() => {
      expect(mockSetPlanningDayStart).toHaveBeenCalledWith('FAJR');
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
    expect(screen.getByText('Current active mode: CUSTOM:03:00')).toBeTruthy();

    const fajrOption = screen.getByTestId('planning-day-option-fajr');
    fireEvent.press(fajrOption);

    await waitFor(() => {
      expect(mockSetPlanningDayStart).toHaveBeenCalledWith('FAJR');
    });
  });

  it('surfaces calm recoverable feedback if refresh fails after persisting FAJR', async () => {
    mockSetPlanningDayStart.mockResolvedValue({
      status: 'PERSISTED_REFRESH_FAILED',
      error: 'Refresh timeout',
    });

    await renderScreen('MIDNIGHT');

    fireEvent.press(screen.getByTestId('planning-day-option-fajr'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Planning Day Updated',
        expect.stringContaining('automatically'),
        expect.any(Array)
      );
    });
  });

  it('persists completed tasks mode when a radio option is pressed', async () => {
    const { userSettingsRepository } = require('@/data/repositories/UserSettingsRepository');
    const upsertSpy = jest.spyOn(userSettingsRepository, 'upsert').mockResolvedValue({} as any);
    await renderScreen('FAJR');

    fireEvent.press(screen.getByTestId('completed-tasks-mode-hide'));
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith({ completedTasksMode: 'HIDE' });
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it('persists overdue tasks mode when a radio option is pressed', async () => {
    const { userSettingsRepository } = require('@/data/repositories/UserSettingsRepository');
    const upsertSpy = jest.spyOn(userSettingsRepository, 'upsert').mockResolvedValue({} as any);
    await renderScreen('FAJR');

    fireEvent.press(screen.getByTestId('overdue-tasks-mode-hide'));
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith({ overdueTasksMode: 'HIDE' });
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it('does not render unimplemented MOVE options for completed and overdue tasks', async () => {
    await renderScreen('FAJR');

    expect(screen.queryByTestId('completed-tasks-mode-move')).toBeNull();
    expect(screen.queryByTestId('overdue-tasks-mode-move')).toBeNull();
  });
});
