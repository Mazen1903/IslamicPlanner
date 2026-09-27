import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { DatePickerInput, TimePickerInput } from '../DateTimePickerInput';

describe('Custom DateTimePickerInput', () => {
  describe('DatePickerInput (Custom Calendar Grid)', () => {
    it('renders trigger button with formatted date', async () => {
      const onChange = jest.fn();
      const { getByTestId, getByText } = await render(
        <ThemeProvider>
          <DatePickerInput value="2026-09-24" onChange={onChange} testID="test-date-picker" />
        </ThemeProvider>
      );

      expect(getByTestId('test-date-picker')).toBeTruthy();
      expect(getByTestId('test-date-picker-display')).toBeTruthy();
      expect(getByText(/Sep 24, 2026/)).toBeTruthy();
    });

    it('opens inline calendar on press and allows month navigation', async () => {
      const onChange = jest.fn();
      const { getByTestId, queryByTestId } = await render(
        <ThemeProvider>
          <DatePickerInput value="2026-09-24" onChange={onChange} testID="test-date-picker" />
        </ThemeProvider>
      );

      expect(queryByTestId('test-date-picker-calendar')).toBeNull();

      // Open calendar
      await fireEvent.press(getByTestId('test-date-picker'));
      expect(getByTestId('test-date-picker-calendar')).toBeTruthy();
      expect(getByTestId('date-picker-month-title')).toHaveTextContent('September 2026');

      // Next month
      await fireEvent.press(getByTestId('date-picker-next-month'));
      expect(getByTestId('date-picker-month-title')).toHaveTextContent('October 2026');

      // Prev month twice -> August 2026
      await fireEvent.press(getByTestId('date-picker-prev-month'));
      await fireEvent.press(getByTestId('date-picker-prev-month'));
      expect(getByTestId('date-picker-month-title')).toHaveTextContent('August 2026');
    });

    it('selects a day and triggers onChange callback with ISO date string', async () => {
      const onChange = jest.fn();
      const { getByTestId } = await render(
        <ThemeProvider>
          <DatePickerInput value="2026-09-24" onChange={onChange} testID="test-date-picker" />
        </ThemeProvider>
      );

      await fireEvent.press(getByTestId('test-date-picker'));

      // Tap on September 15, 2026
      const cell15 = getByTestId('date-cell-2026-09-15');
      expect(cell15).toBeTruthy();
      await fireEvent.press(cell15);

      expect(onChange).toHaveBeenCalledWith('2026-09-15');
    });
  });

  describe('TimePickerInput (Custom Drum-roll Picker)', () => {
    it('renders trigger button with formatted time', async () => {
      const onChange = jest.fn();
      const { getByTestId, getByText } = await render(
        <ThemeProvider>
          <TimePickerInput value="14:30" onChange={onChange} testID="test-time-picker" />
        </ThemeProvider>
      );

      expect(getByTestId('test-time-picker')).toBeTruthy();
      expect(getByTestId('test-time-picker-display')).toBeTruthy();
      expect(getByText('2:30 PM')).toBeTruthy();
    });

    it('opens inline picker and allows selecting hour, minute, and period', async () => {
      const onChange = jest.fn();
      const { getByTestId, queryByTestId } = await render(
        <ThemeProvider>
          <TimePickerInput value="09:00" onChange={onChange} testID="test-time-picker" />
        </ThemeProvider>
      );

      expect(queryByTestId('test-time-picker-picker')).toBeNull();

      // Open picker
      await fireEvent.press(getByTestId('test-time-picker'));
      expect(getByTestId('test-time-picker-picker')).toBeTruthy();

      // Select Hour 11
      await fireEvent.press(getByTestId('time-hour-11'));
      expect(onChange).toHaveBeenCalledWith('11:00');

      // Select Minute 45
      await fireEvent.press(getByTestId('time-minute-45'));
      expect(onChange).toHaveBeenCalledWith('09:45');

      // Select PM
      await fireEvent.press(getByTestId('time-ampm-pm'));
      expect(onChange).toHaveBeenCalledWith('21:00');

      // Done button dismisses
      await fireEvent.press(getByTestId('test-time-picker-done'));
      expect(queryByTestId('test-time-picker-picker')).toBeNull();
    });
  });
});
