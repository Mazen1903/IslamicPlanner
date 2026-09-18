import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { JournalHeader } from '../JournalHeader';
import { ThemeProvider } from '@/theme';

describe('JournalHeader', () => {
  const defaultProps = {
    gregorianDisplay: 'Monday, 16 Sep 2026',
    hijriDisplay: '18 Rabi al-Awwal 1448 AH',
    saveState: 'idle' as const,
    onHistoryPress: jest.fn(),
    onPrivacyPress: jest.fn(),
    onReturnToTodayPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and dates correctly', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByText('Journal')).toBeTruthy();
    expect(screen.getByText('Monday, 16 Sep 2026')).toBeTruthy();
    expect(screen.getByText('18 Rabi al-Awwal 1448 AH')).toBeTruthy();
  });

  it('triggers onHistoryPress when history button is tapped', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('journal-history-btn'));
    expect(defaultProps.onHistoryPress).toHaveBeenCalledTimes(1);
  });

  it('triggers onPrivacyPress when privacy button is tapped', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} lockEnabled={true} />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('journal-privacy-btn'));
    expect(defaultProps.onPrivacyPress).toHaveBeenCalledTimes(1);
  });

  it('renders "Back to Today" button in historical mode and fires callback', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} isHistorical={true} />
      </ThemeProvider>
    );

    expect(screen.getByText('Back to Today')).toBeTruthy();
    fireEvent.press(screen.getByTestId('journal-back-to-today'));
    expect(defaultProps.onReturnToTodayPress).toHaveBeenCalledTimes(1);
  });

  it('does not render "Back to Today" in current-day mode', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} isHistorical={false} />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('journal-back-to-today')).toBeNull();
  });
});
