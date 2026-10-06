import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { MoodPicker, MOOD_OPTIONS } from '../MoodPicker';
import { ThemeProvider } from '@/theme';

describe('MoodPicker', () => {
  it('renders all 5 mood options with labels and vector badges', async () => {
    await render(
      <ThemeProvider>
        <MoodPicker onSelectMood={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByText('How is your heart today?')).toBeTruthy();
    for (const opt of MOOD_OPTIONS) {
      expect(screen.getByText(opt.label)).toBeTruthy();
      expect(screen.getByTestId(`mood-badge-icon-${opt.key}`)).toBeTruthy();
    }
  });

  it('calls onSelectMood with key when unselected mood is tapped', async () => {
    const onSelectMood = jest.fn();
    await render(
      <ThemeProvider>
        <MoodPicker selectedMood="good" onSelectMood={onSelectMood} />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('mood-option-grateful'));
    expect(onSelectMood).toHaveBeenCalledWith('grateful');
  });

  it('calls onSelectMood with undefined when currently selected mood is tapped (toggles off)', async () => {
    const onSelectMood = jest.fn();
    await render(
      <ThemeProvider>
        <MoodPicker selectedMood="grateful" onSelectMood={onSelectMood} />
      </ThemeProvider>
    );

    fireEvent.press(screen.getByTestId('mood-option-grateful'));
    expect(onSelectMood).toHaveBeenCalledWith(undefined);
  });
});
