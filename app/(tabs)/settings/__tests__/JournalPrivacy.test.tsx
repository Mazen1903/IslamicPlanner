import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '@/theme';
import JournalPrivacyScreen from '../journal-privacy';
import type { JournalLockController } from '@/services/journal/JournalLockController';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

describe('JournalPrivacyScreen', () => {
  let mockController: jest.Mocked<JournalLockController>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockController = {
      isLocked: false,
      initialize: jest.fn().mockResolvedValue(undefined),
      enableLock: jest.fn().mockResolvedValue({ success: true }),
      disableLock: jest.fn().mockResolvedValue({ success: true }),
      unlockWithBiometrics: jest.fn().mockResolvedValue({ success: true }),
      lock: jest.fn(),
    } as unknown as jest.Mocked<JournalLockController>;
    Object.defineProperty(mockController, 'isEnabled', {
      value: false,
      configurable: true,
      writable: true,
    });
  });

  const setControllerEnabled = (val: boolean) => {
    Object.defineProperty(mockController, 'isEnabled', {
      value: val,
      configurable: true,
      writable: true,
    });
  };

  const renderScreen = async (controller = mockController, backupService?: any) => {
    return render(
      <ThemeProvider>
        <JournalPrivacyScreen controller={controller} backupService={backupService} />
      </ThemeProvider>
    );
  };

  it('reads current lock state as OFF and renders info card', async () => {
    setControllerEnabled(false);
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('journal-lock-toggle')).toBeTruthy();
    });

    expect(screen.getByText('UNLOCKED')).toBeTruthy();
    expect(screen.getByTestId('journal-privacy-info-card')).toBeTruthy();
    expect(mockController.initialize).toHaveBeenCalledTimes(1);
  });

  it('reads current lock state as ON and shows enabled badge', async () => {
    setControllerEnabled(true);
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('journal-lock-toggle')).toBeTruthy();
    });

    expect(screen.getByText('PROTECTED (BIOMETRIC)')).toBeTruthy();
  });

  it('toggling ON calls controller.enableLock()', async () => {
    setControllerEnabled(false);
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('journal-lock-toggle-switch')).toBeTruthy();
    });

    const toggleSwitch = screen.getByTestId('journal-lock-toggle-switch');
    fireEvent(toggleSwitch, 'valueChange', true);

    await waitFor(() => {
      expect(mockController.enableLock).toHaveBeenCalledTimes(1);
    });
  });

  it('toggling OFF calls controller.disableLock() with authentication requirement', async () => {
    setControllerEnabled(true);
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('journal-lock-toggle-switch')).toBeTruthy();
    });

    const toggleSwitch = screen.getByTestId('journal-lock-toggle-switch');
    fireEvent(toggleSwitch, 'valueChange', false);

    await waitFor(() => {
      expect(mockController.disableLock).toHaveBeenCalledTimes(1);
    });
  });

  it('surfaces error alert when enableLock fails with reason', async () => {
    setControllerEnabled(false);
    mockController.enableLock.mockResolvedValue({
      success: false,
      error: 'Device has no enrolled biometrics',
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('journal-lock-toggle-switch')).toBeTruthy();
    });

    const toggleSwitch = screen.getByTestId('journal-lock-toggle-switch');
    fireEvent(toggleSwitch, 'valueChange', true);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to Enable Lock',
        'Device has no enrolled biometrics',
        expect.any(Array)
      );
    });
  });

  it('renders Export Backup, Import Backup, and Erase All Data cards', async () => {
    await renderScreen();

    expect(screen.getByTestId('privacy-row-export-backup')).toBeTruthy();
    expect(screen.getByText('Export Backup')).toBeTruthy();

    expect(screen.getByTestId('privacy-row-import-backup')).toBeTruthy();
    expect(screen.getByText('Import Backup')).toBeTruthy();

    expect(screen.getByTestId('privacy-row-erase-all')).toBeTruthy();
    expect(screen.getByText('Erase All Data')).toBeTruthy();
  });

  it('tapping Export Backup calls backupService.exportBackup()', async () => {
    const mockBackupService: any = {
      exportBackup: jest.fn().mockResolvedValue({ success: true, filePath: 'test.json' }),
      importBackupFromFile: jest.fn().mockResolvedValue({ success: true }),
      eraseAllData: jest.fn().mockResolvedValue({ success: true }),
    };

    await renderScreen(mockController, mockBackupService);

    fireEvent.press(screen.getByTestId('privacy-row-export-backup'));

    await waitFor(() => {
      expect(mockBackupService.exportBackup).toHaveBeenCalledTimes(1);
    });
  });

  it('tapping Import Backup prompts alert and triggers import on confirmation', async () => {
    let confirmAction: any;
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons: any) => {
      if (buttons && buttons[1]?.onPress) {
        confirmAction = buttons[1].onPress;
      }
    });

    const mockBackupService: any = {
      exportBackup: jest.fn().mockResolvedValue({ success: true }),
      importBackupFromFile: jest.fn().mockResolvedValue({ success: true, importedAt: new Date().toISOString() }),
      eraseAllData: jest.fn().mockResolvedValue({ success: true }),
    };

    await renderScreen(mockController, mockBackupService);

    fireEvent.press(screen.getByTestId('privacy-row-import-backup'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Restore From Backup',
      expect.any(String),
      expect.any(Array)
    );

    expect(confirmAction).toBeDefined();
    await confirmAction();

    expect(mockBackupService.importBackupFromFile).toHaveBeenCalledTimes(1);
  });

  it('tapping Erase All Data prompts alert and triggers erase on confirmation', async () => {
    let confirmAction: any;
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons: any) => {
      if (buttons && buttons[1]?.onPress) {
        confirmAction = buttons[1].onPress;
      }
    });

    const mockBackupService: any = {
      exportBackup: jest.fn().mockResolvedValue({ success: true }),
      importBackupFromFile: jest.fn().mockResolvedValue({ success: true }),
      eraseAllData: jest.fn().mockResolvedValue({ success: true }),
    };

    await renderScreen(mockController, mockBackupService);

    fireEvent.press(screen.getByTestId('privacy-row-erase-all'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Erase All Data',
      expect.any(String),
      expect.any(Array)
    );

    expect(confirmAction).toBeDefined();
    await confirmAction();

    expect(mockBackupService.eraseAllData).toHaveBeenCalledTimes(1);
  });
});
