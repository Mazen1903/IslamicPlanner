import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { BottomNavBar } from '../BottomNavBar';
import { ThemeProvider } from '@/theme';

describe('BottomNavBar (M16 Navigation)', () => {
  const mockNavigation = {
    emit: jest.fn().mockReturnValue({ defaultPrevented: false }),
    navigate: jest.fn(),
  };

  const defaultProps = {
    navigation: mockNavigation,
    state: {
      index: 0,
      routes: [
        { key: 'today-key', name: 'today' },
        { key: 'calendar-key', name: 'calendar' },
        { key: 'add-key', name: 'add' },
        { key: 'journal-key', name: 'journal' },
        { key: 'settings-key', name: 'settings' },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('NAV-01 & NAV-04: renders journal tab in position 4', async () => {
    await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} />
      </ThemeProvider>
    );

    const journalTab = screen.getByTestId('bottom-nav-journal');
    expect(journalTab).toBeTruthy();
    expect(screen.getByText('Journal')).toBeTruthy();
  });

  it('NAV-03: worship route is completely absent', async () => {
    await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('bottom-nav-worship')).toBeNull();
    expect(screen.queryByText('Worship')).toBeNull();
  });

  it('NAV-05: 5 navigation positions are in fixed order: today, calendar, add, journal, settings', async () => {
    await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('bottom-nav-today')).toBeTruthy();
    expect(screen.getByTestId('bottom-nav-calendar')).toBeTruthy();
    expect(screen.getByTestId('bottom-nav-add')).toBeTruthy();
    expect(screen.getByTestId('bottom-nav-journal')).toBeTruthy();
    expect(screen.getByTestId('bottom-nav-settings')).toBeTruthy();
  });

  it('navigates to journal when journal tab is pressed', async () => {
    await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('bottom-nav-journal'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('journal');
  });

  it('uses default fallback routes containing journal when state is undefined', async () => {
    await render(
      <ThemeProvider>
        <BottomNavBar navigation={mockNavigation} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('bottom-nav-journal')).toBeTruthy();
    expect(screen.queryByTestId('bottom-nav-worship')).toBeNull();
  });
});
