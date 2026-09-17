import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { ThemeProvider } from '@/theme';
import NotificationSettingsScreen from '../notifications';

describe('NotificationSettingsScreen', () => {
  let mockAdapter: any;
  let mockChannelManager: any;
  let mockReconciliationService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openSettings').mockImplementation(async () => undefined);
    (Platform as any).OS = 'android';

    mockAdapter = {
      getPermissionStatus: jest.fn().mockResolvedValue({
        canSchedule: false,
        canRequest: true,
        status: 'NOT_DETERMINED',
      }),
      requestPermission: jest.fn().mockResolvedValue({
        canSchedule: true,
        status: 'AUTHORIZED',
      }),
    };

    mockChannelManager = {
      ensureChannel: jest.fn().mockResolvedValue(undefined),
    };

    mockReconciliationService = {
      reconcile: jest.fn().mockResolvedValue({
        scheduled: [],
        cancelled: [],
        unchanged: [],
        skippedPast: [],
        skippedCapacity: [],
        failed: [],
      }),
    };
  });

  const renderScreen = async () => {
    return await render(
      <ThemeProvider>
        <NotificationSettingsScreen
          adapter={mockAdapter}
          channelManager={mockChannelManager}
          reconciliationService={mockReconciliationService}
        />
      </ThemeProvider>
    );
  };

  it('inspects permission on mount without requesting permission', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(mockAdapter.getPermissionStatus).toHaveBeenCalledTimes(1);
      expect(mockAdapter.requestPermission).not.toHaveBeenCalled();
    });
  });

  it('renders "Enable Notifications" button when permission is NOT_DETERMINED', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('enable-notifications-btn')).toBeTruthy();
      expect(screen.getByText('Enable Notifications')).toBeTruthy();
    });
  });

  it('requests permission and immediately triggers reconcile on grant (Safeguard 1)', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('enable-notifications-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('enable-notifications-btn'));

    await waitFor(() => {
      expect(mockChannelManager.ensureChannel).toHaveBeenCalledTimes(1);
      expect(mockAdapter.requestPermission).toHaveBeenCalledTimes(1);
      expect(mockReconciliationService.reconcile).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('notifications-enabled-label')).toBeTruthy();
    });
  });

  it('renders "Open Settings" button when permission is DENIED and opens system settings', async () => {
    mockAdapter.getPermissionStatus.mockResolvedValueOnce({
      canSchedule: false,
      canRequest: false,
      status: 'DENIED',
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('open-settings-btn')).toBeTruthy();
      expect(screen.getByText('Open Settings')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('open-settings-btn'));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('renders "Notifications enabled" when permission is already granted', async () => {
    mockAdapter.getPermissionStatus.mockResolvedValueOnce({
      canSchedule: true,
      canRequest: false,
      status: 'AUTHORIZED',
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('notifications-enabled-label')).toBeTruthy();
      expect(screen.getByText('Notifications enabled')).toBeTruthy();
    });
  });

  it('displays the required Android delivery policy notice', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Android may delay reminder delivery according to system battery and alarm policies when exact-alarm capability is unavailable.'
        )
      ).toBeTruthy();
    });
  });
});
