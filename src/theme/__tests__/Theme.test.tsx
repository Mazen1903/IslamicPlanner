import React from 'react';
import { Text } from 'react-native';
import * as ReactNative from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../useTheme';
import { lightTheme } from '../lightTheme';
import { darkTheme } from '../darkTheme';

function ConsumerComponent() {
  const theme = useTheme();
  return (
    <>
      <Text testID="theme-mode">{theme.themeMode}</Text>
      <Text testID="is-dark">{String(theme.isDark)}</Text>
      <Text testID="primary-color">{theme.colors.primary}</Text>
      <Text testID="bg-color">{theme.colors.background}</Text>
    </>
  );
}

describe('Theme System', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders ThemeProvider without crashing', async () => {
    await render(
      <ThemeProvider>
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode')).toBeTruthy();
  });

  it('resolves LIGHT theme explicitly', async () => {
    await render(
      <ThemeProvider initialMode="LIGHT">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('LIGHT');
    expect(screen.getByTestId('is-dark').props.children).toBe('false');
    expect(screen.getByTestId('primary-color').props.children).toBe(lightTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);
  });

  it('resolves DARK theme explicitly', async () => {
    await render(
      <ThemeProvider initialMode="DARK">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('DARK');
    expect(screen.getByTestId('is-dark').props.children).toBe('true');
    expect(screen.getByTestId('primary-color').props.children).toBe(darkTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
  });

  it('resolves SYSTEM theme as LIGHT when system is light', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');

    await render(
      <ThemeProvider initialMode="SYSTEM">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('SYSTEM');
    expect(screen.getByTestId('is-dark').props.children).toBe('false');
    expect(screen.getByTestId('primary-color').props.children).toBe(lightTheme.colors.primary);
  });

  it('resolves SYSTEM theme as DARK when system is dark', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    await render(
      <ThemeProvider initialMode="SYSTEM">
        <ConsumerComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-mode').props.children).toBe('SYSTEM');
    expect(screen.getByTestId('is-dark').props.children).toBe('true');
    expect(screen.getByTestId('primary-color').props.children).toBe(darkTheme.colors.primary);
    expect(screen.getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
  });

  it('allows dynamic theme switching via setThemeMode', async () => {
    function SwitcherComponent() {
      const theme = useTheme();
      return (
        <>
          <ConsumerComponent />
          <Text testID="switch-to-dark" onPress={() => theme.setThemeMode('DARK')}>
            Switch
          </Text>
        </>
      );
    }

    await render(
      <ThemeProvider initialMode="LIGHT">
        <SwitcherComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('is-dark').props.children).toBe('false');

    await act(async () => {
      screen.getByTestId('switch-to-dark').props.onPress();
    });

    expect(screen.getByTestId('theme-mode').props.children).toBe('DARK');
    expect(screen.getByTestId('is-dark').props.children).toBe('true');
    expect(screen.getByTestId('primary-color').props.children).toBe(darkTheme.colors.primary);
  });
});
