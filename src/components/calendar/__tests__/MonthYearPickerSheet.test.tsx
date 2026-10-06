import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { MonthYearPickerSheet } from '../MonthYearPickerSheet';

describe('MonthYearPickerSheet', () => {
  const defaultProps = {
    visible: true,
    currentYear: 2026,
    currentMonth: 9, // September
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible with year and months', async () => {
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <MonthYearPickerSheet {...defaultProps} />
      </ThemeProvider>
    );

    expect(getByTestId('month-year-picker-sheet')).toBeTruthy();
    expect(getByTestId('picker-current-year')).toHaveTextContent('2026');
    expect(getByText('Select Month & Year')).toBeTruthy();

    // Verify some month labels
    expect(getByText('Jan')).toBeTruthy();
    expect(getByText('Sep')).toBeTruthy();
    expect(getByText('Dec')).toBeTruthy();
  });

  it('does not render when visible is false', async () => {
    const { queryByTestId } = await render(
      <ThemeProvider>
        <MonthYearPickerSheet {...defaultProps} visible={false} />
      </ThemeProvider>
    );

    expect(queryByTestId('month-year-picker-sheet')).toBeNull();
  });

  it('navigates years using stepper buttons', async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <MonthYearPickerSheet {...defaultProps} />
      </ThemeProvider>
    );

    expect(getByTestId('picker-current-year')).toHaveTextContent('2026');

    await fireEvent.press(getByTestId('picker-next-year'));
    expect(getByTestId('picker-current-year')).toHaveTextContent('2027');

    await fireEvent.press(getByTestId('picker-prev-year'));
    await fireEvent.press(getByTestId('picker-prev-year'));
    expect(getByTestId('picker-current-year')).toHaveTextContent('2025');
  });

  it('calls onSelect with selected year and month, and calls onClose', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <MonthYearPickerSheet
          {...defaultProps}
          onSelect={onSelect}
          onClose={onClose}
        />
      </ThemeProvider>
    );

    // Step to 2028
    await fireEvent.press(getByTestId('picker-next-year'));
    await fireEvent.press(getByTestId('picker-next-year'));
    expect(getByTestId('picker-current-year')).toHaveTextContent('2028');

    // Select March (month 3)
    await fireEvent.press(getByTestId('picker-month-3'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2028, 3);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <MonthYearPickerSheet {...defaultProps} onClose={onClose} />
      </ThemeProvider>
    );

    await fireEvent.press(getByTestId('month-year-picker-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is pressed', async () => {
    const onClose = jest.fn();

    const { getByTestId } = await render(
      <ThemeProvider>
        <MonthYearPickerSheet {...defaultProps} onClose={onClose} />
      </ThemeProvider>
    );

    await fireEvent.press(getByTestId('month-year-picker-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
