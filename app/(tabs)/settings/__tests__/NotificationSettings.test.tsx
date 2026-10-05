import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { ThemeProvider } from '@/theme';
import NotificationSettingsScreen from '../notifications';


jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

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
      scheduleNotification: jest.fn().mockResolvedValue('test-notification-id'),
    };

    mockChannelManager = {
      ensureChannel: jest.fn().mockResolvedValue(undefined),
      getTaskChannelId: jest.fn().mockReturnValue('task-reminders-v2-vib'),
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

  it('does not render worship suggestions card', async () => {
    await renderScreen();

    expect(screen.queryByTestId('worship-suggestions-section-card')).toBeNull();
    expect(screen.queryByText('Worship Suggestions')).toBeNull();
  });

  it('persists notification toggle changes via userSettingsRepository', async () => {
    const { userSettingsRepository } = require('@/data/repositories/UserSettingsRepository');
    const upsertSpy = jest.spyOn(userSettingsRepository, 'upsert').mockResolvedValue({} as any);

    await renderScreen();

    // Toggle prayer vibration
    fireEvent(screen.getByTestId('prayer-vibration-switch'), 'valueChange', false);
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith({ prayerVibrationEnabled: false });
    });

    // Toggle task reminders
    fireEvent(screen.getByTestId('task-reminders-switch'), 'valueChange', false);
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith({ taskRemindersEnabled: false });
    });

    // Toggle task vibration
    fireEvent(screen.getByTestId('task-vibration-switch'), 'valueChange', false);
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith({ taskVibrationEnabled: false });
    });

    // Toggle quiet hours
    fireEvent(screen.getByTestId('quiet-hours-switch'), 'valueChange', true);
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith({ quietHoursEnabled: true });
    });

    // Toggle journal reminder
    fireEvent(screen.getByTestId('journal-reminder-switch'), 'valueChange', true);
    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith({ journalReminderEnabled: true });
    });
  });

  it('renders daily journal reminder card with reminder time', async () => {
    await renderScreen();

    expect(screen.getByTestId('journal-reminder-section-card')).toBeTruthy();
    expect(screen.getByText('Daily Journal')).toBeTruthy();
    // Default time '21:30' should be formatted as '9:30 PM'
    expect(screen.getByTestId('journal-reminder-time-row-display')).toBeTruthy();
    expect(screen.getByText('9:30 PM')).toBeTruthy();
  });

  it('opens time picker when reminder time row is tapped', async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('journal-reminder-time-row')).toBeTruthy();
    });

    // Picker should not be visible initially
    expect(screen.queryByTestId('journal-reminder-time-row-picker')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-reminder-time-row'));
    });

    // Picker container should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('journal-reminder-time-row-picker')).toBeTruthy();
    });
  });

  it('persists new journal reminder time when picker selection changes', async () => {
    const { userSettingsRepository } = require('@/data/repositories/UserSettingsRepository');
    const upsertSpy = jest.spyOn(userSettingsRepository, 'upsert').mockResolvedValue({} as any);

    await renderScreen();

    // Open picker
    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-reminder-time-row'));
    });

    // Picker should be shown
    await waitFor(() => {
      expect(screen.getByTestId('journal-reminder-time-row-picker')).toBeTruthy();
    });

    // Select Hour 8 (8:30 PM)
    await act(async () => {
      fireEvent.press(screen.getByTestId('time-hour-8'));
    });

    // Select Minute 00 (8:00 PM = 20:00)
    await act(async () => {
      fireEvent.press(screen.getByTestId('time-minute-00'));
    });

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ journalReminderTime: '20:00' }),
      );
    });
  });

  it('renders default reminder presets and persists selection', async () => {
    const { userSettingsRepository } = require('@/data/repositories/UserSettingsRepository');
    const upsertSpy = jest.spyOn(userSettingsRepository, 'upsert').mockResolvedValue({} as any);

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('default-reminder-chip-none')).toBeTruthy();
      expect(screen.getByTestId('default-reminder-chip--10')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('default-reminder-chip--10'));

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith({ defaultReminderMinutes: -10 });
    });
  });

  it('shows quiet hours start and end pickers when quiet hours is on and persists times', async () => {
    const { userSettingsRepository } = require('@/data/repositories/UserSettingsRepository');
    const upsertSpy = jest.spyOn(userSettingsRepository, 'upsert').mockResolvedValue({} as any);

    await renderScreen();

    // Toggle quiet hours switch to ON
    fireEvent(screen.getByTestId('quiet-hours-switch'), 'valueChange', true);

    await waitFor(() => {
      expect(screen.getByTestId('quiet-hours-start-time-row')).toBeTruthy();
      expect(screen.getByTestId('quiet-hours-end-time-row')).toBeTruthy();
    });

    // Open start time picker
    await act(async () => {
      fireEvent.press(screen.getByTestId('quiet-hours-start-time-row'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('quiet-hours-start-time-row-picker')).toBeTruthy();
    });

    // Select Hour 11 (11:00 PM = 23:00)
    await act(async () => {
      fireEvent.press(screen.getByTestId('time-hour-11'));
    });
    // Select Minute 00
    await act(async () => {
      fireEvent.press(screen.getByTestId('time-minute-00'));
    });

    await waitFor(() => {
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ quietHoursStart: '23:00' }),
      );
    });
  });

  it('schedules a test notification 5 seconds out when Send Test button is pressed', async () => {
    mockAdapter.getPermissionStatus.mockResolvedValueOnce({
      canSchedule: true,
      canRequest: false,
      status: 'AUTHORIZED',
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('send-test-notification-btn')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('send-test-notification-btn'));
    });

    await waitFor(() => {
      expect(mockAdapter.scheduleNotification).toHaveBeenCalledTimes(1);
      expect(mockAdapter.scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Reminder',
          data: expect.objectContaining({ kind: 'test-notification', payloadVersion: 2 }),
        })
      );
      expect(screen.getByTestId('test-notification-message')).toBeTruthy();
      expect(screen.getByText('Test notification scheduled! Arriving in 5 seconds.')).toBeTruthy();
    });
  });

  it('hides vibration toggles on iOS', async () => {
    (Platform as any).OS = 'ios';

    await renderScreen();

    await waitFor(() => {
      expect(screen.queryByTestId('prayer-vibration-switch')).toBeNull();
      expect(screen.queryByTestId('task-vibration-switch')).toBeNull();
    });
  });
});
