import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Card } from '../Card';

describe('Card Component', () => {
  it('renders children properly', async () => {
    await render(
      <ThemeProvider>
        <Card>
          <Text>Card Content</Text>
        </Card>
      </ThemeProvider>,
    );

    expect(screen.getByText('Card Content')).toBeTruthy();
  });

  it('triggers onPress when pressable', async () => {
    const onPressMock = jest.fn();
    await render(
      <ThemeProvider>
        <Card onPress={onPressMock}>
          <Text>Pressable Card</Text>
        </Card>
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole('button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
