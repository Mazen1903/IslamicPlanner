import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { ReflectionSection } from '../ReflectionSection';
import { ThemeProvider } from '@/theme';

describe('ReflectionSection', () => {
  const defaultReflections = {
    gratitude: 'Family',
    wentWell: 'Productive work',
    improvement: 'Sleep earlier',
    dua: 'For health and guidance',
  };

  it('is collapsed by default and expands upon header tap', async () => {
    await render(
      <ThemeProvider>
        <ReflectionSection
          reflections={defaultReflections}
          onChangeReflection={jest.fn()}
        />
      </ThemeProvider>
    );

    // Collapsed initially
    expect(screen.queryByTestId('reflection-section-content')).toBeNull();

    // Tap toggle
    await act(async () => {
      fireEvent.press(screen.getByTestId('reflection-section-toggle'));
    });

    // Expanded
    await waitFor(() => {
      expect(screen.getByTestId('reflection-section-content')).toBeTruthy();
    });
    expect(screen.getByTestId('reflection-field-gratitude')).toBeTruthy();
    expect(screen.getByTestId('reflection-field-wentWell')).toBeTruthy();
    expect(screen.getByTestId('reflection-field-improvement')).toBeTruthy();
    expect(screen.getByTestId('reflection-field-dua')).toBeTruthy();
  });

  it('ED-05: updates each reflection field and fires callback with key and value', async () => {
    const onChangeReflection = jest.fn();
    await render(
      <ThemeProvider>
        <ReflectionSection
          reflections={defaultReflections}
          onChangeReflection={onChangeReflection}
          initialExpanded={true}
        />
      </ThemeProvider>
    );

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reflection-field-gratitude'), 'Grateful for today');
    });
    expect(onChangeReflection).toHaveBeenCalledWith('gratitude', 'Grateful for today');

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reflection-field-wentWell'), 'Finished tasks');
    });
    expect(onChangeReflection).toHaveBeenCalledWith('wentWell', 'Finished tasks');

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reflection-field-improvement'), 'Wake up on time');
    });
    expect(onChangeReflection).toHaveBeenCalledWith('improvement', 'Wake up on time');

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reflection-field-dua'), 'May Allah bless us');
    });
    expect(onChangeReflection).toHaveBeenCalledWith('dua', 'May Allah bless us');
  });
});
