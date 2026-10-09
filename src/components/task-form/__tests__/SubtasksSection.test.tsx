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

  it('renders Checklist progress bar and percentage', async () => {
    const dispatch = jest.fn();
    const { getByText } = await render(
      <ThemeProvider>
        <SubtasksSection subtasks={initialSubtasks} dispatch={dispatch} />
      </ThemeProvider>
    );

    expect(getByText('Checklist')).toBeTruthy();
    expect(getByText('1/2 (50%)')).toBeTruthy();
  });

  it('allows inline editing of an item', async () => {
    const dispatch = jest.fn();
    const { getByTestId } = await render(
      <ThemeProvider>
        <SubtasksSection subtasks={initialSubtasks} dispatch={dispatch} />
      </ThemeProvider>
    );

    // Tap edit button on step-1
    await fireEvent.press(getByTestId('edit-subtask-step-1'));
    const input = getByTestId('edit-input-step-1');
    expect(input).toBeTruthy();

    await fireEvent.changeText(input, 'Buy organic groceries');
    await fireEvent.press(getByTestId('save-edit-step-1'));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SUBTASK',
      payload: { id: 'step-1', title: 'Buy organic groceries' },
    });
  });

  it('allows reordering items up and down', async () => {
    const dispatch = jest.fn();
    const { getByTestId } = await render(
      <ThemeProvider>
        <SubtasksSection subtasks={initialSubtasks} dispatch={dispatch} />
      </ThemeProvider>
    );

    // Move step-2 up (index 1 -> index 0)
    await fireEvent.press(getByTestId('move-up-step-2'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'REORDER_SUBTASKS',
      payload: { fromIndex: 1, toIndex: 0 },
    });

    // Move step-1 down (index 0 -> index 1)
    await fireEvent.press(getByTestId('move-down-step-1'));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'REORDER_SUBTASKS',
      payload: { fromIndex: 0, toIndex: 1 },
    });
  });
});
