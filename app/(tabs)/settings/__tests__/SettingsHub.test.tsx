import React from 'react';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import SettingsHubScreen from '../index';
import * as userSettingsHook from '@/hooks/useUserSettings';
import { journalLockPreference } from '@/services/journal/JournalLockPreference';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    back: jest.fn(),
  })),
}));

describe('SettingsHubScreen (Pastel UI Mockup)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(journalLockPreference, 'isEnabled').mockResolvedValue(false);

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
        completedTasksMode: 'KEEP',
        overdueTasksMode: 'KEEP',
        prayerVibrationEnabled: true,
        taskRemindersEnabled: true,
        taskVibrationEnabled: true,
        quietHoursEnabled: false,
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
        createdAt: '2026-09-18T00:00:00.000Z',
        updatedAt: '2026-09-18T00:00:00.000Z',
      },
      isLoading: false,
      error: null,
      reload: jest.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderScreen = async () => {
    await render(
      <ThemeProvider>
        <SettingsHubScreen />
      </ThemeProvider>
    );
  };

  it('renders Settings hub title, subtitle, and mosque header', async () => {
    await renderScreen();

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Customize your app experience')).toBeTruthy();
    expect(screen.getByTestId('section-header-settings')).toBeTruthy();
  });

  it('renders all 9 pastel option cards from Pastel Islamic Settings mockup', async () => {
    await renderScreen();

    // 1. Prayer & Location
    expect(screen.getByText('Prayer & Location')).toBeTruthy();
    expect(screen.getByTestId('settings-row-prayer-location')).toBeTruthy();

    // 2. Planner
    expect(screen.getByText('Planner')).toBeTruthy();
    expect(screen.getByTestId('settings-row-planning-day')).toBeTruthy();

    // 3. Notifications
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByTestId('settings-row-notifications')).toBeTruthy();

    // 4. Appearance
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByTestId('settings-row-appearance')).toBeTruthy();

    // 5. Calendar
    expect(screen.getByText('Calendar')).toBeTruthy();
    expect(screen.getByTestId('settings-row-hijri-calendar')).toBeTruthy();

    // 6. Worship Suggestions removed
    expect(screen.queryByTestId('settings-row-worship')).toBeNull();

    // 7. Account & Sync
    expect(screen.getByText('Account & Sync')).toBeTruthy();
    expect(screen.getByTestId('settings-row-account')).toBeTruthy();

    // 8. Premium
    expect(screen.getByText('Premium')).toBeTruthy();
    expect(screen.getByTestId('settings-row-premium')).toBeTruthy();

    // 9. About
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByTestId('settings-row-about')).toBeTruthy();
  });

  it('renders Quran inspiration quote card', async () => {
    await renderScreen();

    expect(screen.getByText(/And whoever relies upon Allah/i)).toBeTruthy();
    expect(screen.getByText(/Surah At-Talaq/i)).toBeTruthy();
  });

  it('navigates to prayer-location when pressed', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-row-prayer-location'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/prayer-location');
  });

  it('navigates to planning-day when pressed', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-row-planning-day'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/planning-day');
  });

  it('navigates to notifications when pressed', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-row-notifications'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/notifications');
  });

  it('navigates to appearance when pressed', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('settings-row-appearance'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/appearance');
  });

  it('opens premium modal when Premium card is pressed', async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId('settings-row-premium'));

    expect(await screen.findByText('Islamic Planner Premium')).toBeTruthy();
  });
});

