import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { JournalSaveStatus } from '../JournalSaveStatus';
import { ThemeProvider } from '@/theme';

describe('JournalSaveStatus', () => {
  it('renders nothing when state is idle', async () => {
    await render(
      <ThemeProvider>
        <JournalSaveStatus state="idle" />
      </ThemeProvider>
    );
    expect(screen.queryByTestId('journal-save-status')).toBeNull();
  });

  it('renders nothing when state is dirty', async () => {
    await render(
      <ThemeProvider>
        <JournalSaveStatus state="dirty" />
      </ThemeProvider>
    );
    expect(screen.queryByTestId('journal-save-status')).toBeNull();
  });

  it('renders "Saving…" when state is saving', async () => {
    await render(
      <ThemeProvider>
        <JournalSaveStatus state="saving" />
      </ThemeProvider>
    );
    expect(screen.getByText('Saving…')).toBeTruthy();
    expect(screen.getByTestId('journal-save-status')).toBeTruthy();
  });

  it('renders "Saved" when state is saved', async () => {
    await render(
      <ThemeProvider>
        <JournalSaveStatus state="saved" />
      </ThemeProvider>
    );
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('renders "Not saved yet" when state is error', async () => {
    await render(
      <ThemeProvider>
        <JournalSaveStatus state="error" />
      </ThemeProvider>
    );
    expect(screen.getByText('Not saved yet')).toBeTruthy();
  });
});
