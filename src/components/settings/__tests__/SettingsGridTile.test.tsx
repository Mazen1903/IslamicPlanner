import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SettingsGridTile } from '../SettingsGridTile';

describe('SettingsGridTile', () => {
  it('renders label and badge properly', async () => {
    const handlePress = jest.fn();

    await render(
      <ThemeProvider>
        <SettingsGridTile
          label="Prayer & Location"
          badge={<View testID="test-badge"><Text>Icon</Text></View>}
          bgColor="#E8F5EE"
          onPress={handlePress}
          testID="grid-tile-prayer"
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Prayer & Location')).toBeTruthy();
    expect(screen.getByTestId('test-badge')).toBeTruthy();
  });

  it('triggers onPress callback when pressed', async () => {
    const handlePress = jest.fn();

    await render(
      <ThemeProvider>
        <SettingsGridTile
          label="Notifications"
          badge={<View />}
          bgColor="#FEE7E7"
          onPress={handlePress}
          testID="grid-tile-notif"
        />
      </ThemeProvider>
    );

    const tile = screen.getByTestId('grid-tile-notif');
    fireEvent.press(tile);

    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('provides accessible role and default label', async () => {
    await render(
      <ThemeProvider>
        <SettingsGridTile
          label="Planner"
          badge={<View />}
          bgColor="#E8F5EE"
          onPress={jest.fn()}
          testID="grid-tile-planner"
        />
      </ThemeProvider>
    );

    const tile = screen.getByTestId('grid-tile-planner');
    expect(tile.props.accessibilityRole).toBe('button');
    expect(tile.props.accessibilityLabel).toBe('Planner');
  });
});
