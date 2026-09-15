import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders title properly', async () => {
    await render(
      <ThemeProvider>
        <Button title="Save Task" />
      </ThemeProvider>,
    );

    expect(screen.getByText('Save Task')).toBeTruthy();
  });

  it('triggers onPress when clicked', async () => {
    const onPressMock = jest.fn();
    await render(
      <ThemeProvider>
        <Button title="Click Me" onPress={onPressMock} />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole('button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onPress when disabled', async () => {
    const onPressMock = jest.fn();
    await render(
      <ThemeProvider>
        <Button title="Disabled Button" disabled onPress={onPressMock} />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole('button'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders loading state and hides text', async () => {
    const onPressMock = jest.fn();
    await render(
      <ThemeProvider>
        <Button title="Loading Button" loading onPress={onPressMock} />
      </ThemeProvider>,
    );

    expect(screen.queryByText('Loading Button')).toBeNull();
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });
});
