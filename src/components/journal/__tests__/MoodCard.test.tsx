import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { MoodCard } from '../MoodCard';
import { ThemeProvider } from '@/theme';

describe('MoodCard', () => {
  it('renders title, all mood options, and fires onSelectMood', async () => {
    const onSelectMood = jest.fn();
    await render(
      <ThemeProvider>
        <MoodCard selectedMood="good" onSelectMood={onSelectMood} />
      </ThemeProvider>
    );

    expect(screen.getByText('How is your heart today?')).toBeTruthy();
    expect(screen.getByTestId('mood-picker')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mood-option-great'));
    expect(onSelectMood).toHaveBeenCalledWith('great');
  });

  it('renders Clear button when mood is selected and clears mood on press', async () => {
    const onSelectMood = jest.fn();
    await render(
      <ThemeProvider>
        <MoodCard selectedMood="grateful" onSelectMood={onSelectMood} />
      </ThemeProvider>
    );

    const clearBtn = screen.getByLabelText('Clear selected mood');
    expect(clearBtn).toBeTruthy();

    fireEvent.press(clearBtn);
    expect(onSelectMood).toHaveBeenCalledWith(undefined);
  });
});
