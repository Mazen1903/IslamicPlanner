import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Toggle } from '../Toggle';

describe('Toggle Component', () => {
  it('renders with label and description', async () => {
    await render(
      <ThemeProvider>
        <Toggle
          checked={false}
          onCheckedChange={jest.fn()}
          label="Notifications"
          description="Enable prayer alert sounds"
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('Enable prayer alert sounds')).toBeTruthy();
  });

  it('triggers onCheckedChange on press', async () => {
    const onCheckedChangeMock = jest.fn();
    await render(
      <ThemeProvider>
        <Toggle
          checked={false}
          onCheckedChange={onCheckedChangeMock}
          label="Notifications"
        />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole('switch'));
    expect(onCheckedChangeMock).toHaveBeenCalledWith(true);
  });

  it('does not trigger onCheckedChange when disabled', async () => {
    const onCheckedChangeMock = jest.fn();
    await render(
      <ThemeProvider>
        <Toggle
          checked={false}
          disabled
          onCheckedChange={onCheckedChangeMock}
          label="Disabled Switch"
        />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole('switch'));
    expect(onCheckedChangeMock).not.toHaveBeenCalled();
  });
});
