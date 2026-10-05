import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { PromptDeck } from '../PromptDeck';
import { ThemeProvider } from '@/theme';

describe('PromptDeck', () => {
  it('renders prompt text and header', async () => {
    await render(
      <ThemeProvider>
        <PromptDeck dayKey="2026-09-24" onSelectPrompt={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByText('Daily Reflection Prompt')).toBeTruthy();
    expect(screen.getByTestId('prompt-deck-text')).toBeTruthy();
    expect(screen.getByText('Write about this →')).toBeTruthy();
  });

  it('cycles to next prompt on next button press', async () => {
    await render(
      <ThemeProvider>
        <PromptDeck dayKey="2026-09-24" onSelectPrompt={jest.fn()} />
      </ThemeProvider>
    );

    const firstPrompt = screen.getByTestId('prompt-deck-text').props.children;

    await act(async () => {
      fireEvent.press(screen.getByTestId('prompt-deck-next-btn'));
    });

    const secondPrompt = screen.getByTestId('prompt-deck-text').props.children;
    expect(firstPrompt).not.toEqual(secondPrompt);
  });

  it('calls onSelectPrompt with prompt text when use button is tapped', async () => {
    const onSelectPrompt = jest.fn();
    await render(
      <ThemeProvider>
        <PromptDeck dayKey="2026-09-24" onSelectPrompt={onSelectPrompt} />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('prompt-deck-use-btn'));
    });

    expect(onSelectPrompt).toHaveBeenCalledTimes(1);
    expect(typeof onSelectPrompt.mock.calls[0][0]).toBe('string');
  });
});
