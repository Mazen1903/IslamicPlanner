import React, { createRef } from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { JournalEditor, type JournalEditorRef } from '../JournalEditor';
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

  it('renders tip when value is empty and opens focus mode on button tap', async () => {
    await render(
      <ThemeProvider>
        <JournalEditor value="" onChangeText={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByText(/Tap Focus Mode for distraction-free writing/i)).toBeTruthy();

    // Click focus mode button
    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-fullscreen-btn'));
    });

    expect(screen.getByTestId('journal-write-modal')).toBeTruthy();
  });

  it('exposes openFocusMode method via ref', async () => {
    const ref = createRef<JournalEditorRef>();
    await render(
      <ThemeProvider>
        <JournalEditor ref={ref} value="Hello world" onChangeText={jest.fn()} />
      </ThemeProvider>
    );

    expect(ref.current).toBeDefined();
    expect(typeof ref.current?.openFocusMode).toBe('function');

    await act(async () => {
      ref.current?.openFocusMode();
    });

    expect(screen.getByTestId('journal-write-modal')).toBeTruthy();
  });
});
