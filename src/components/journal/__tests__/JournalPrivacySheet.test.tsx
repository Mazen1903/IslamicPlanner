import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { JournalPrivacySheet } from '../JournalPrivacySheet';
import { ThemeProvider } from '@/theme';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('JournalPrivacySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal content and toggles lock switch', async () => {
    const onToggleLock = jest.fn();
    const onClose = jest.fn();

    const { unmount } = await render(
      <ThemeProvider>
        <JournalPrivacySheet
          visible={true}
          lockEnabled={false}
          onToggleLock={onToggleLock}
          onClose={onClose}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Journal Privacy')).toBeTruthy();
    expect(screen.getByText('Biometric Lock')).toBeTruthy();

    const toggle = screen.getByTestId('journal-lock-switch');
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });
    expect(onToggleLock).toHaveBeenCalledTimes(1);

    const doneBtn = screen.getByTestId('journal-privacy-done-btn');
    await act(async () => {
      fireEvent.press(doneBtn);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('navigates to settings on advanced privacy settings link click', async () => {
    const onClose = jest.fn();
    const { unmount } = await render(
      <ThemeProvider>
        <JournalPrivacySheet
          visible={true}
          lockEnabled={false}
          onToggleLock={jest.fn()}
          onClose={onClose}
        />
      </ThemeProvider>
    );

    const settingsLink = screen.getByTestId('journal-privacy-more-settings-btn');
    await act(async () => {
      fireEvent.press(settingsLink);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/settings/journal-privacy');
    unmount();
  });

  it('renders error message when lock change fails', async () => {
    const { unmount } = await render(
      <ThemeProvider>
        <JournalPrivacySheet
          visible={true}
          lockEnabled={false}
          onToggleLock={jest.fn()}
          onClose={jest.fn()}
          errorMessage="Strong biometric authentication is required."
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('journal-privacy-error')).toBeTruthy();
    expect(
      screen.getByText('Strong biometric authentication is required.')
    ).toBeTruthy();
    unmount();
  });
});
