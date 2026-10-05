import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { JournalHeader } from '../JournalHeader';
import { ThemeProvider } from '@/theme';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('JournalHeader', () => {
  const defaultProps = {
    gregorianDisplay: 'Monday, 16 Sep 2026',
    hijriDisplay: '18 Rabi al-Awwal 1448 AH',
    onHistoryPress: jest.fn(),
    onPrivacyPress: jest.fn(),
    onReturnToTodayPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, greeting, and dates correctly', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByText('Journal')).toBeTruthy();
    expect(screen.getByTestId('journal-greeting-text')).toBeTruthy();
    expect(screen.getByText('Monday, 16 Sep 2026')).toBeTruthy();
    expect(screen.getByText('18 Rabi al-Awwal 1448 AH')).toBeTruthy();
  });

  it('renders streak card when streak is provided in current-day mode and triggers onHistoryPress', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} streak={4} />
      </ThemeProvider>
    );

    const streakBanner = screen.getByTestId('streak-banner');
    expect(streakBanner).toBeTruthy();
    expect(screen.getByText('4 Day Streak')).toBeTruthy();

    fireEvent.press(streakBanner);
    expect(defaultProps.onHistoryPress).toHaveBeenCalledTimes(1);
  });

  it('does not render streak card in historical mode', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} streak={4} isHistorical={true} />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('streak-banner')).toBeNull();
    expect(screen.getByText('Past Reflection 📜')).toBeTruthy();
  });

  it('navigates to settings when settings button is tapped', async () => {
    await render(
      <ThemeProvider>
        <JournalHeader {...defaultProps} />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('journal-settings-btn'));
    expect(mockPush).toHaveBeenCalledWith('/settings/journal-privacy');
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
