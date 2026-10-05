import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
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
        { key: 'planner-key', name: 'planner' },
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

  it('NAV-05: 5 navigation positions are in fixed order: planner, calendar, add, journal, settings', async () => {
    await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('bottom-nav-planner')).toBeTruthy();
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

  it('renders sliding pill without border and responds to tab layout', async () => {
    const { rerender } = await render(
      <ThemeProvider>
        <BottomNavBar {...defaultProps} />
      </ThemeProvider>
    );

    // Trigger onLayout on the planner tab and its icon container inside act
    await act(async () => {
      const plannerTab = screen.getByTestId('bottom-nav-planner');
      fireEvent(plannerTab, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 75, height: 48 } },
      });
      const iconContainer = screen.getByTestId('bottom-nav-icon-planner');
      fireEvent(iconContainer, 'layout', {
        nativeEvent: { layout: { x: 13, y: 4, width: 48, height: 32 } },
      });
    });

    const pill = screen.getByTestId('bottom-nav-sliding-pill');
    expect(pill).toBeTruthy();
    expect(pill.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: '#E8F5EE',
      })
    );
    expect(pill.props.style).not.toEqual(
      expect.objectContaining({
        borderWidth: expect.any(Number),
      })
    );

    // Now switch active tab to calendar (index 1) and fire its layout
    await rerender(
      <ThemeProvider>
        <BottomNavBar
          {...defaultProps}
          state={{
            ...defaultProps.state,
            index: 1,
          }}
        />
      </ThemeProvider>
    );

    await act(async () => {
      const calendarTab = screen.getByTestId('bottom-nav-calendar');
      fireEvent(calendarTab, 'layout', {
        nativeEvent: { layout: { x: 75, y: 0, width: 75, height: 48 } },
      });
      const iconContainer = screen.getByTestId('bottom-nav-icon-calendar');
      fireEvent(iconContainer, 'layout', {
        nativeEvent: { layout: { x: 13, y: 4, width: 48, height: 32 } },
      });
    });

    const calendarPill = screen.getByTestId('bottom-nav-sliding-pill');
    expect(calendarPill).toBeTruthy();
  });
});
