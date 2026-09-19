import React from 'react';
import { StyleSheet, Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ThemeProvider, lightColors, lightTheme } from '@/theme';
import { Button } from '@/components/common/Button';
import { Toggle } from '@/components/common/Toggle';
import { SettingsToggle } from '@/components/settings/SettingsToggle';
import { SetupRequiredState } from '@/components/today/SetupRequiredState';
import { JournalDeleteDialog } from '@/components/journal/JournalDeleteDialog';
import { PrayerTabBar } from '@/components/prayer/PrayerTabBar';
import HijriCalendarScreen from '../../../app/(tabs)/settings/hijri-calendar';
import SettingsHubScreen from '../../../app/(tabs)/settings/index';
import type { PrayerTabViewModel } from '@/services/types';
import * as userSettingsHook from '@/hooks/useUserSettings';
import * as settingsMutationHook from '@/hooks/useSettingsMutation';
import { hijriMonthOverrideRepository } from '@/data/repositories/HijriMonthOverrideRepository';
import { journalLockPreference } from '@/services/journal/JournalLockPreference';

jest.mock('expo-notifications', () => ({
  addPushTokenListener: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
}));

function getPressableStyle(node: any, pressed: boolean) {
  let fiber = node.unstable_fiber;
  while (fiber && typeof fiber.memoizedProps?.style !== 'function') {
    fiber = fiber.return;
  }
  if (!fiber || typeof fiber.memoizedProps?.style !== 'function') {
    throw new Error('Pressable style function not found in fiber tree');
  }
  return StyleSheet.flatten(fiber.memoizedProps.style({ pressed }));
}

describe('M21 Component Semantic Token Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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

    jest.spyOn(settingsMutationHook, 'useSettingsMutation').mockReturnValue({
      isSaving: false,
      error: null,
      lastResult: null,
      applyTemporalSettings: jest.fn(),
      applyPresentationSettings: jest.fn(),
      setHijriGlobalAdjustment: jest.fn(),
      upsertHijriMonthOverride: jest.fn(),
      deleteHijriMonthOverride: jest.fn(),
      applySettingsChange: jest.fn(),
    });

    jest.spyOn(hijriMonthOverrideRepository, 'list').mockResolvedValue([]);
    jest.spyOn(journalLockPreference, 'isEnabled').mockResolvedValue(false);
  });

  it('Button: destructive default -> danger, destructive pressed -> dangerPressed', async () => {
    await render(
      <ThemeProvider mode="LIGHT">
        <Button title="Delete" variant="destructive" testID="del-btn" />
      </ThemeProvider>
    );

    const btn = screen.getByTestId('del-btn');
    const defaultStyle = getPressableStyle(btn, false);
    expect(defaultStyle.backgroundColor).toBe(lightColors.danger);

    const pressedStyle = getPressableStyle(btn, true);
    expect(pressedStyle.backgroundColor).toBe(lightColors.dangerPressed);
  });

  it('Toggle: unchecked enabled track -> checkboxUnchecked', async () => {
    await render(
      <ThemeProvider mode="LIGHT">
        <Toggle checked={false} onCheckedChange={() => {}} testID="toggle-elem" />
      </ThemeProvider>
    );

    const toggleSwitch = screen.getByTestId('toggle-elem');
    // React Native Switch translates trackColor.false to tintColor and style.backgroundColor
    expect(toggleSwitch.props.tintColor).toBe(lightColors.checkboxUnchecked);
    const switchStyle = StyleSheet.flatten(toggleSwitch.props.style);
    expect(switchStyle.backgroundColor).toBe(lightColors.checkboxUnchecked);
  });

  it('SettingsToggle: unchecked enabled track -> checkboxUnchecked', async () => {
    await render(
      <ThemeProvider mode="LIGHT">
        <SettingsToggle label="Test Toggle" value={false} onValueChange={() => {}} testID="st-elem" />
      </ThemeProvider>
    );

    const switchElem = screen.getByTestId('st-elem-switch');
    expect(switchElem.props.tintColor).toBe(lightColors.checkboxUnchecked);
  });

  it('SetupRequiredState: error banner -> dangerSurface and text -> danger', async () => {
    await render(
      <ThemeProvider mode="LIGHT">
        <SetupRequiredState onUseCurrentLocation={async () => false} />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('use-current-location-button'));
    });

    await waitFor(() => {
      const banner = screen.getByTestId('setup-error-banner');
      const bannerStyle = StyleSheet.flatten(banner.props.style);
      expect(bannerStyle.backgroundColor).toBe(lightColors.dangerSurface);
      expect(screen.getByText('Location permission was denied. You can set your location manually.')).toBeTruthy();
    });
  });

  it('JournalDeleteDialog: pressed confirm -> dangerPressed', async () => {
    await render(
      <ThemeProvider mode="LIGHT">
        <JournalDeleteDialog visible={true} onConfirm={() => {}} onCancel={() => {}} />
      </ThemeProvider>
    );

    const confirmBtn = screen.getByTestId('journal-delete-confirm-btn');
    const defaultStyle = getPressableStyle(confirmBtn, false);
    expect(defaultStyle.backgroundColor).toBe(lightColors.danger);

    const pressedStyle = getPressableStyle(confirmBtn, true);
    expect(pressedStyle.backgroundColor).toBe(lightColors.dangerPressed);
  });

  it('PrayerTabBar: past interactive prayer name/time -> textTertiary (not textMuted)', async () => {
    const mockTabs: PrayerTabViewModel[] = [
      {
        prayer: 'FAJR',
        name: 'Fajr',
        arabicName: 'الفجر',
        startTime: '05:15',
        startDateTime: '2026-09-19T05:15:00.000Z',
        temporalState: 'PAST',
        scheduledTasks: [],
        missedTasks: [],
        completedTasks: [],
        anytimeTasks: [],
      },
      {
        prayer: 'DHUHR',
        name: 'Dhuhr',
        arabicName: 'الظهر',
        startTime: '12:45',
        startDateTime: '2026-09-19T12:45:00.000Z',
        temporalState: 'CURRENT',
        scheduledTasks: [],
        missedTasks: [],
        completedTasks: [],
        anytimeTasks: [],
      },
    ];

    await render(
      <ThemeProvider mode="LIGHT">
        <PrayerTabBar tabs={mockTabs} selectedPrayer={null} onSelectPrayer={() => {}} />
      </ThemeProvider>
    );

    const fajrName = screen.getByText('Fajr');
    const fajrTime = screen.getByText('05:15');

    const nameStyle = StyleSheet.flatten(fajrName.props.style);
    const timeStyle = StyleSheet.flatten(fajrTime.props.style);

    expect(nameStyle.color).toBe(lightColors.textTertiary);
    expect(nameStyle.color).not.toBe(lightColors.textMuted);

    expect(timeStyle.color).toBe(lightColors.textTertiary);
    expect(timeStyle.color).not.toBe(lightColors.textMuted);
  });

  it('Hijri modal: overlay -> colors.overlay, surface -> colors.surfaceElevated, shadow uses theme semantic shadow', async () => {
    await render(
      <ThemeProvider mode="LIGHT">
        <HijriCalendarScreen />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('add-override-button'));

    await waitFor(() => {
      const modalContent = screen.getByTestId('add-override-modal');
      const contentStyle = StyleSheet.flatten(modalContent.props.style);
      expect(contentStyle.backgroundColor).toBe(lightColors.surfaceElevated);
      expect(contentStyle.shadowColor).toBe(lightColors.shadowElevated);
      expect(contentStyle.elevation).toBe(lightTheme.shadows.elevated.elevation);
      expect(contentStyle.shadowRadius).toBe(lightTheme.shadows.elevated.shadowRadius);
      expect(contentStyle.shadowOffset).toEqual(lightTheme.shadows.elevated.shadowOffset);

      const modalOverlay = modalContent.parent;
      const overlayStyle = StyleSheet.flatten(modalOverlay?.props.style);
      expect(overlayStyle.backgroundColor).toBe(lightColors.overlay);
    });
  });

  it('Settings hub: divider -> colors.divider', async () => {
    const { getByText } = await render(
      <ThemeProvider mode="LIGHT">
        <SettingsHubScreen />
      </ThemeProvider>
    );

    const headerText = getByText('Settings');
    const headerContainer = headerText.parent;
    const headerStyle = StyleSheet.flatten(headerContainer?.props.style);
    expect(headerStyle.borderBottomColor).toBe(lightColors.divider);
  });
});
