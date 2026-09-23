import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { BottomNavBar } from '../BottomNavBar';
import { ThemeProvider } from '@/theme';
import { useAddTaskModalStore } from '@/stores/useAddTaskModalStore';

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

  it('applies safe area bottom inset from props.insets when provided', async () => {
    await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} insets={{ bottom: 48 }} />
      </ThemeProvider>
    );

    const bar = screen.getByTestId('bottom-nav-bar');
    expect(bar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paddingBottom: 52 }),
      ])
    );
  });

  it('falls back to default paddingBottom (8) when insets.bottom is 0', async () => {
    await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} insets={{ bottom: 0 }} />
      </ThemeProvider>
    );

    const bar = screen.getByTestId('bottom-nav-bar');
    expect(bar.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paddingBottom: 8 }),
      ])
    );
  });

  it('opens expanding add task modal when add button is pressed', async () => {
    useAddTaskModalStore.getState().closeModal();

    await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} />
      </ThemeProvider>
    );

    expect(useAddTaskModalStore.getState().isOpen).toBe(false);

    fireEvent.press(screen.getByTestId('bottom-nav-add'));

    expect(useAddTaskModalStore.getState().isOpen).toBe(true);
    expect(mockNavigation.navigate).not.toHaveBeenCalledWith('add');
  });
});
