import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SubtasksSection } from '../SubtasksSection';
import type { SubtaskDraft } from '@/features/task-form/types';

describe('SubtasksSection', () => {
  const initialSubtasks: SubtaskDraft[] = [
    { id: 'step-1', title: 'Buy groceries', isCompleted: false },
    { id: 'step-2', title: 'Cook dinner', isCompleted: true },
  ];

  it('renders existing steps and adds a new step on submit', async () => {
    const dispatch = jest.fn();
    const { getByTestId, getByText } = await render(
      <ThemeProvider>
        <SubtasksSection subtasks={initialSubtasks} dispatch={dispatch} />
      </ThemeProvider>
    );

    expect(getByText('Steps')).toBeTruthy();
    expect(getByText('2 steps')).toBeTruthy();
    expect(getByText('Buy groceries')).toBeTruthy();
    expect(getByText('Cook dinner')).toBeTruthy();

    // Add step
    const input = getByTestId('new-subtask-input');
    await fireEvent.changeText(input, 'Set the table');
    await fireEvent.press(getByTestId('add-subtask-button'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_SUBTASK',
      payload: { title: 'Set the table' },
    });
  });

  it('toggles and removes subtasks', async () => {
    const dispatch = jest.fn();
    const { getByTestId } = await render(
      <ThemeProvider>
        <SubtasksSection subtasks={initialSubtasks} dispatch={dispatch} />
      </ThemeProvider>
    );

    await fireEvent.press(getByTestId('toggle-subtask-step-1'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_SUBTASK',
      payload: { id: 'step-1' },
    });

    await fireEvent.press(getByTestId('remove-subtask-step-2'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'REMOVE_SUBTASK',
      payload: { id: 'step-2' },
    });
  });
});
