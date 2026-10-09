import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TimePickerInput } from '../DateTimePickerInput';

async function openPicker(value: string, onChange = jest.fn()) {
  await render(
    <ThemeProvider>
      <TimePickerInput value={value} onChange={onChange} testID="tp" />
    </ThemeProvider>
  );
  await fireEvent.press(screen.getByTestId('tp'));
  return onChange;
}

// Wheel rows are 40px tall (see ITEM_HEIGHT in DateTimePickerInput)
const ROW = 40;
const scrollEnd = (offsetY: number) => ({
  nativeEvent: { contentOffset: { x: 0, y: offsetY } },
});

describe('TimePickerInput wheel columns', () => {
  it('exposes hour, minute and period wheels with 12, 60 and 2 rows', async () => {
    await openPicker('09:00');

    expect(screen.getByTestId('time-hour-list')).toBeTruthy();
    expect(screen.getByTestId('time-minute-list')).toBeTruthy();
    expect(screen.getByTestId('time-ampm-list')).toBeTruthy();
    expect(screen.getByTestId('time-hour-12')).toBeTruthy();
    expect(screen.getByTestId('time-minute-59')).toBeTruthy();
    expect(screen.getByTestId('time-ampm-am')).toBeTruthy();
    expect(screen.queryByTestId('time-hour-13')).toBeNull();
  });

  it('marks the stored value as selected without rounding minutes', async () => {
    await openPicker('09:07');

    expect(screen.getByTestId('time-hour-9').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('time-minute-07').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('time-ampm-am').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('tp-display').props.children).toBe('9:07 AM');
  });

  it('handles the 12 AM / 12 PM boundaries when switching periods', async () => {
    const onChange = await openPicker('00:15');
    expect(screen.getByTestId('tp-display').props.children).toBe('12:15 AM');

    await fireEvent.press(screen.getByTestId('time-ampm-pm'));
    expect(onChange).toHaveBeenLastCalledWith('12:15');
  });

  it('pressing 12 on a PM time keeps it at noon, not midnight', async () => {
    const onChange = await openPicker('15:30');

    await fireEvent.press(screen.getByTestId('time-hour-12'));
    expect(onChange).toHaveBeenLastCalledWith('12:30');
  });

  it('committing a scroll snaps to the nearest row and reports the minute', async () => {
    const onChange = await openPicker('09:00');
    const minuteList = screen.getByTestId('time-minute-list');

    // 30 rows down, with a few px of drift that must snap to row 30
    await fireEvent(minuteList, 'momentumScrollEnd', scrollEnd(ROW * 30 + 6));
    expect(onChange).toHaveBeenLastCalledWith('09:30');
  });

  it('clamps scrolling past either end of the wheel', async () => {
    const onChange = await openPicker('09:30');
    const hourList = screen.getByTestId('time-hour-list');

    await fireEvent(hourList, 'momentumScrollEnd', scrollEnd(ROW * 99));
    expect(onChange).toHaveBeenLastCalledWith('00:30'); // hour 12 AM

    await fireEvent(hourList, 'momentumScrollEnd', scrollEnd(-ROW * 5));
    expect(onChange).toHaveBeenLastCalledWith('01:30'); // hour 1 AM
  });

  it('does not report a change when scrolling settles on the current value', async () => {
    const onChange = await openPicker('09:00');
    const minuteList = screen.getByTestId('time-minute-list');

    await fireEvent(minuteList, 'momentumScrollEnd', scrollEnd(0));
    expect(onChange).not.toHaveBeenCalled();
  });
});
