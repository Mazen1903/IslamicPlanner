import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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

describe('SettingsHubScreen', () => {
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

  const renderScreen = () => {
    return render(
      <ThemeProvider>
        <SettingsHubScreen />
      </ThemeProvider>
    );
  };

  it('renders Settings hub title and all active group sections', async () => {
    await renderScreen();

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByTestId('section-header-prayer')).toBeTruthy();
    expect(screen.getByTestId('section-header-planner')).toBeTruthy();
    expect(screen.getByTestId('section-header-system')).toBeTruthy();
    expect(screen.getByTestId('section-header-about')).toBeTruthy();
  });

  it('renders all active settings rows with accurate summaries', async () => {
    await renderScreen();

    // Prayer Calculation
    expect(screen.getByText('Prayer Calculation')).toBeTruthy();
    expect(screen.getByText('Muslim World League')).toBeTruthy();

    // Prayer Location
    expect(screen.getByText('Prayer Location')).toBeTruthy();
    expect(screen.getByText('Automatic • America/New_York')).toBeTruthy();

    // Planning Day
    expect(screen.getByText('Planning Day')).toBeTruthy();
    expect(screen.getByText('Day starts at Fajr')).toBeTruthy();

    // Hijri Calendar
    expect(screen.getByText('Hijri Calendar')).toBeTruthy();
    expect(screen.getByText('Hijri adjustment: 0 days')).toBeTruthy();

    // Appearance
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();

    // Notifications
    expect(screen.getByText('Notifications')).toBeTruthy();

    // Journal Privacy
    expect(screen.getByText('Journal Privacy')).toBeTruthy();

    // About & Help
    expect(screen.getByText('About & Help')).toBeTruthy();
  });

  it('navigates to sub-screens when rows are pressed', async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId('settings-row-prayer-calculation'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/prayer-calculation');

    fireEvent.press(screen.getByTestId('settings-row-prayer-location'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/prayer-location');

    fireEvent.press(screen.getByTestId('settings-row-planning-day'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/planning-day');

    fireEvent.press(screen.getByTestId('settings-row-hijri-calendar'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/hijri-calendar');

    fireEvent.press(screen.getByTestId('settings-row-appearance'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/appearance');

    fireEvent.press(screen.getByTestId('settings-row-notifications'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/notifications');

    fireEvent.press(screen.getByTestId('settings-row-journal-privacy'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/journal-privacy');

    fireEvent.press(screen.getByTestId('settings-row-about'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/about');
  });

  it('INVARIANT: does NOT render Worship Suggestions row', async () => {
    await renderScreen();

    expect(screen.queryByText(/Worship Suggestions/i)).toBeNull();
    expect(screen.queryByTestId('settings-row-worship')).toBeNull();
  });

  it('INVARIANT: does NOT render Account / Cloud Sync row', async () => {
    await renderScreen();

    expect(screen.queryByText(/Account & Sync/i)).toBeNull();
    expect(screen.queryByText(/Cloud Sync/i)).toBeNull();
    expect(screen.queryByTestId('settings-row-account')).toBeNull();
  });

  it('INVARIANT: does NOT render Premium purchase row', async () => {
    await renderScreen();

    expect(screen.queryByText(/Upgrade to Premium/i)).toBeNull();
    expect(screen.queryByText(/Purchase Premium/i)).toBeNull();
    expect(screen.queryByTestId('settings-row-premium')).toBeNull();
  });
});
