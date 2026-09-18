import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { JournalLockedState } from '../JournalLockedState';
import { ThemeProvider } from '@/theme';

describe('JournalLockedState', () => {
  it('BIO-03: renders locked notice and unlock button', async () => {
    const onUnlockPress = jest.fn();
    await render(
      <ThemeProvider>
        <JournalLockedState onUnlockPress={onUnlockPress} />
      </ThemeProvider>
    );

    expect(screen.getByText('Journal Locked')).toBeTruthy();
    expect(screen.getByText('Private reflections are locked on this device.')).toBeTruthy();

    const unlockBtn = screen.getByTestId('journal-unlock-btn');
    fireEvent.press(unlockBtn);
    expect(onUnlockPress).toHaveBeenCalledTimes(1);
  });

  it('renders error message when unlock fails', async () => {
    await render(
      <ThemeProvider>
        <JournalLockedState
          onUnlockPress={jest.fn()}
          errorMessage="Too many failed attempts. Please try again later."
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('journal-lock-error-text')).toBeTruthy();
    expect(
      screen.getByText('Too many failed attempts. Please try again later.')
    ).toBeTruthy();
  });
});
