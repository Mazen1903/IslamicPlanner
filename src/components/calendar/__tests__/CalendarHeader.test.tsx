import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CalendarHeader } from '../CalendarHeader';

describe('CalendarHeader (M14)', () => {
  const defaultProps = {
    gregorianTitle: 'September 2026',
    hijriHeaderSpan: "Rabi' al-Awwal – Rabi' al-Thani 1448",
    onPreviousMonth: jest.fn(),
    onNextMonth: jest.fn(),
    onTodayPress: jest.fn(),
  };

  it('renders Gregorian title and Hijri header span correctly', async () => {
    const { getByText, getByRole } = await render(
      <ThemeProvider>
        <CalendarHeader {...defaultProps} />
      </ThemeProvider>
    );

    expect(getByText('September 2026')).toBeTruthy();
    expect(getByText("Rabi' al-Awwal – Rabi' al-Thani 1448")).toBeTruthy();
    expect(getByRole('header')).toBeTruthy();
  });

  it('handles navigation actions: prev, next, and jump to today', async () => {
    const onPreviousMonth = jest.fn();
    const onNextMonth = jest.fn();
    const onTodayPress = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <CalendarHeader
          {...defaultProps}
          onPreviousMonth={onPreviousMonth}
          onNextMonth={onNextMonth}
          onTodayPress={onTodayPress}
        />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('calendar-prev-month-button'));
    expect(onPreviousMonth).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('calendar-next-month-button'));
    expect(onNextMonth).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('calendar-today-button'));
    expect(onTodayPress).toHaveBeenCalledTimes(1);
  });
});
