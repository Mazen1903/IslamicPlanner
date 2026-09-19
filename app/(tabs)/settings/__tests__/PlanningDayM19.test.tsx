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

describe('PlanningDayScreen M19 UI Specifications', () => {
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
  });

  const renderScreen = async ({
    planningDayStart = 'FAJR',
    isPremium = false,
    isLoading = false,
  }: {
    planningDayStart?: string;
    isPremium?: boolean;
    isLoading?: boolean;
  } = {}) => {
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

    jest.spyOn(entitlementHook, 'useEntitlement').mockReturnValue({
      isLoading,
      isPremium,
      tier: isPremium ? 'PREMIUM' : 'FREE',
      hasFeature: (_feature: any) => isPremium,
      error: null,
      reload: jest.fn(),
    });

    return await render(
      <ThemeProvider>
        <PlanningDayScreen />
      </ThemeProvider>
    );
  };

  // UI-01: FREE: FAJR selectable, MIDNIGHT and CUSTOM locked with PremiumBadge
  it('UI-01: FREE user sees all 3 options with FAJR selectable and MIDNIGHT/CUSTOM locked with badges', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'FAJR' });

    expect(screen.getByTestId('planning-day-option-fajr')).toBeTruthy();
    expect(screen.getByTestId('planning-day-option-midnight')).toBeTruthy();
    expect(screen.getByTestId('planning-day-option-custom')).toBeTruthy();

    expect(screen.getByTestId('premium-badge-midnight')).toBeTruthy();
    expect(screen.getByTestId('premium-badge-custom')).toBeTruthy();
  });

  // UI-02 & UI-03: Tapping locked option shows PremiumLockedInfo, does NOT call mutation coordinator
  it('UI-02 & UI-03: FREE user tapping locked MIDNIGHT opens PremiumLockedInfo and performs ZERO mutation calls', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'FAJR' });

    const midnightOption = screen.getByTestId('planning-day-option-midnight');
    fireEvent.press(midnightOption);

    expect(mockSetPlanningDayStart).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Premium Feature')).toBeTruthy();
      expect(screen.getByText('Purchasing will be available in a future update.')).toBeTruthy();
    });
  });

  it('FREE user tapping locked CUSTOM opens PremiumLockedInfo and performs ZERO mutation calls', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'FAJR' });

    const customOption = screen.getByTestId('planning-day-option-custom');
    fireEvent.press(customOption);

    expect(mockSetPlanningDayStart).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Premium Feature')).toBeTruthy();
    });
  });

  // UI-04: PREMIUM + MIDNIGHT calls setPlanningDayStart
  it('UI-04: PREMIUM user tapping MIDNIGHT triggers mutation call to coordinator', async () => {
    await renderScreen({ isPremium: true, planningDayStart: 'FAJR' });

    const midnightOption = screen.getByTestId('planning-day-option-midnight');
    fireEvent.press(midnightOption);

    await waitFor(() => {
      expect(mockSetPlanningDayStart).toHaveBeenCalledWith('MIDNIGHT');
      expect(mockReload).toHaveBeenCalled();
    });
  });

  // UI-05: PREMIUM + CUSTOM shows time picker
  it('UI-05: PREMIUM user with active CUSTOM sees TimePickerInput', async () => {
    await renderScreen({ isPremium: true, planningDayStart: 'CUSTOM:04:00' });

    expect(screen.getByTestId('planning-day-time-picker')).toBeTruthy();
  });

  // UI-07 & UI-08: No checkout UI, no price, no subscription plans
  it('UI-07 & UI-08: verify complete absence of checkout CTA, pricing, or subscription plans', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'FAJR' });

    expect(screen.queryByText(/checkout/i)).toBeNull();
    expect(screen.queryByText(/subscribe/i)).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByText(/month/i)).toBeNull();
    expect(screen.queryByText(/trial/i)).toBeNull();
  });

  // UI-09: No toggle writes isPremium
  it('UI-09: no UI toggle exists to mutate isPremium', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'FAJR' });

    expect(screen.queryByText(/premium on/i)).toBeNull();
    expect(screen.queryByText(/enable premium/i)).toBeNull();
    expect(screen.queryByTestId('premium-toggle')).toBeNull();
  });

  // UI-11: Existing Premium mode shown when FREE (no auto-downgrade)
  it('UI-11: FREE user with stored MIDNIGHT mode displays Midnight as active without auto-downgrading', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'MIDNIGHT' });

    // Midnight is selected
    const midnightOption = screen.getByTestId('planning-day-option-midnight');
    expect(midnightOption.props.accessibilityState.checked).toBe(true);

    // Displays banner acknowledging current mode
    expect(screen.getByTestId('planning-day-current-value')).toBeTruthy();
    expect(screen.getByText('Current active mode: MIDNIGHT')).toBeTruthy();

    // Zero mutation calls occurred on mount
    expect(mockSetPlanningDayStart).not.toHaveBeenCalled();
  });

  it('FREE user with stored CUSTOM mode displays custom time accurately without auto-downgrading', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'CUSTOM:19:30' });

    const customOption = screen.getByTestId('planning-day-option-custom');
    expect(customOption.props.accessibilityState.checked).toBe(true);

    expect(screen.getByTestId('planning-day-current-value')).toBeTruthy();
    expect(screen.getByText('Current active mode: CUSTOM:19:30')).toBeTruthy();
    expect(mockSetPlanningDayStart).not.toHaveBeenCalled();
  });

  // UI-12: FREE user tapping already-active locked Premium mode → ZERO mutation calls (presentation no-op)
  it('UI-12: FREE user tapping already-active stored MIDNIGHT performs ZERO mutation calls (presentation no-op)', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'MIDNIGHT' });

    const midnightOption = screen.getByTestId('planning-day-option-midnight');
    fireEvent.press(midnightOption);

    // Presentation short-circuit: ZERO mutation call, no dialog
    expect(mockSetPlanningDayStart).not.toHaveBeenCalled();
    expect(screen.queryByText('Purchasing will be available in a future update.')).toBeNull();
  });

  it('UI-12b: FREE user tapping already-active stored CUSTOM performs ZERO mutation calls (presentation no-op)', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'CUSTOM:04:00' });

    const customOption = screen.getByTestId('planning-day-option-custom');
    fireEvent.press(customOption);

    // Presentation short-circuit: ZERO mutation call, no dialog
    expect(mockSetPlanningDayStart).not.toHaveBeenCalled();
    expect(screen.queryByText('Purchasing will be available in a future update.')).toBeNull();
  });

  // Switching back to FAJR works regardless of tier
  it('FREE user with stored MIDNIGHT can switch back to FAJR', async () => {
    await renderScreen({ isPremium: false, planningDayStart: 'MIDNIGHT' });

    const fajrOption = screen.getByTestId('planning-day-option-fajr');
    fireEvent.press(fajrOption);

    await waitFor(() => {
      expect(mockSetPlanningDayStart).toHaveBeenCalledWith('FAJR');
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
