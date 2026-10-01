import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { DuolingoActionButton } from '../DuolingoActionButton';

describe('DuolingoActionButton', () => {
  it('renders correctly with title and icon for danger variant', async () => {
    const onPress = jest.fn();
    const { getByText, getByTestId, getByLabelText } = await render(
      <ThemeProvider>
        <DuolingoActionButton
          title="Delete Task"
          iconName="trash"
          variant="danger"
          onPress={onPress}
          testID="test-delete-btn"
          accessibilityLabel="Delete task now"
        />
      </ThemeProvider>
    );

    expect(getByText('Delete Task')).toBeTruthy();
    expect(getByTestId('test-delete-btn')).toBeTruthy();
    expect(getByLabelText('Delete task now')).toBeTruthy();

    await fireEvent.press(getByTestId('test-delete-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders correctly with title and icon for success variant and handles press', async () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = await render(
      <ThemeProvider>
        <DuolingoActionButton
          title="Edit Full Task"
          iconName="edit"
          variant="success"
          onPress={onPress}
          testID="test-edit-btn"
        />
      </ThemeProvider>
    );

    expect(getByText('Edit Full Task')).toBeTruthy();
    const btn = getByTestId('test-edit-btn');
    await fireEvent.press(btn);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <ThemeProvider>
        <DuolingoActionButton
          title="Disabled Button"
          iconName="trash"
          variant="danger"
          onPress={onPress}
          disabled={true}
          testID="test-disabled-btn"
        />
      </ThemeProvider>
    );

    const btn = getByTestId('test-disabled-btn');
    expect(btn).toBeTruthy();
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });
});
