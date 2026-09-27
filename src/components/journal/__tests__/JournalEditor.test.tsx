import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
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

  it('renders current value and word count', async () => {
    await render(
      <ThemeProvider>
        <JournalEditor value="Saved journal prose for reflection" onChangeText={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByDisplayValue('Saved journal prose for reflection')).toBeTruthy();
    expect(screen.getByTestId('journal-word-count')).toBeTruthy();
    expect(screen.getByText(/5 words/i)).toBeTruthy();
  });

  it('renders MoodPicker when onSelectMood is provided', async () => {
    const onSelectMood = jest.fn();
    await render(
      <ThemeProvider>
        <JournalEditor
          value=""
          onChangeText={jest.fn()}
          selectedMood="good"
          onSelectMood={onSelectMood}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mood-picker')).toBeTruthy();
    fireEvent.press(screen.getByTestId('mood-option-great'));
    expect(onSelectMood).toHaveBeenCalledWith('great');
  });

  it('renders PromptDeck when value is empty and dayKey is provided, and inserts prompt on click', async () => {
    const onChangeText = jest.fn();
    await render(
      <ThemeProvider>
        <JournalEditor
          value=""
          onChangeText={onChangeText}
          dayKey="2026-09-24"
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('prompt-deck')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('prompt-deck-use-btn'));
    });

    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onChangeText.mock.calls[0][0]).toMatch(/^".+"\n\n$/);
  });
});
