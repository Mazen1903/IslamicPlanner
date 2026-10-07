import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { AppBackButton } from '../AppBackButton';

describe('AppBackButton', () => {
  it('renders with accessibility label and fires onPress', async () => {
    const onPress = jest.fn();
    const { getByTestId, getByLabelText } = await render(
      <ThemeProvider>
        <AppBackButton onPress={onPress} label="Return home" testID="custom-back-btn" />
      </ThemeProvider>
    );

    const button = getByTestId('custom-back-btn');
    expect(button).toBeTruthy();
    expect(getByLabelText('Return home')).toBeTruthy();

    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders elevated variant correctly', async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <AppBackButton variant="elevated" testID="elevated-back-btn" />
      </ThemeProvider>
    );

    expect(getByTestId('elevated-back-btn')).toBeTruthy();
  });
});
