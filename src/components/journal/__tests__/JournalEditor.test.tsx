import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { JournalEditor } from '../JournalEditor';
import { ThemeProvider } from '@/theme';

describe('JournalEditor', () => {
  it('ED-04: renders text input, displays placeholder, and fires onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(
      <ThemeProvider>
        <JournalEditor
          value=""
          onChangeText={onChangeText}
          placeholder="Write your thoughts..."
        />
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText('Write your thoughts...')).toBeTruthy();

    const input = screen.getByTestId('journal-editor-input');
    fireEvent.changeText(input, 'New journal content');

    expect(onChangeText).toHaveBeenCalledWith('New journal content');
  });

  it('renders current value', async () => {
    await render(
      <ThemeProvider>
        <JournalEditor value="Saved journal prose" onChangeText={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByDisplayValue('Saved journal prose')).toBeTruthy();
  });
});
