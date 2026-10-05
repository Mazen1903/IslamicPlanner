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

  it('renders Daily Muhasaba title, counter, and toggles section collapse', async () => {
    await render(
      <ThemeProvider>
        <ReflectionSection
          reflections={defaultReflections}
          onChangeReflection={jest.fn()}
          initialExpanded={true}
        />
      </ThemeProvider>
    );

    expect(screen.getByText('Daily Muhasaba')).toBeTruthy();
    expect(screen.getByText('4/4')).toBeTruthy();
    expect(screen.getByTestId('reflection-section-content')).toBeTruthy();

    // Tap collapse toggle
    await act(async () => {
      fireEvent.press(screen.getByTestId('reflection-section-toggle'));
    });

    // Content should now be hidden
    expect(screen.queryByTestId('reflection-section-content')).toBeNull();
  });

  it('ED-05: expands row upon tap, allows typing, and fires callback with key and value', async () => {
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

    // Gratitude input is not visible initially until row is tapped
    expect(screen.queryByTestId('reflection-field-gratitude')).toBeNull();

    // Tap Gratitude row to open it
    await act(async () => {
      fireEvent.press(screen.getByTestId('reflection-row-gratitude'));
    });

    // Gratitude input is now open
    expect(screen.getByTestId('reflection-field-gratitude')).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reflection-field-gratitude'), 'Grateful for today');
    });
    expect(onChangeReflection).toHaveBeenCalledWith('gratitude', 'Grateful for today');

    // Tap What Went Well row - should open it
    await act(async () => {
      fireEvent.press(screen.getByTestId('reflection-row-wentWell'));
    });

    expect(screen.getByTestId('reflection-field-wentWell')).toBeTruthy();
    // Gratitude row closed
    expect(screen.queryByTestId('reflection-field-gratitude')).toBeNull();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('reflection-field-wentWell'), 'Finished tasks');
    });
    expect(onChangeReflection).toHaveBeenCalledWith('wentWell', 'Finished tasks');
  });
});
