import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SubtasksSection, computeDropIndex } from '../SubtasksSection';
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

  it('allows inline editing by tapping the item title and ensures pencil/up/down/drag icons are removed', async () => {
    const dispatch = jest.fn();
    const { getByTestId, queryByTestId } = await render(
      <ThemeProvider>
        <SubtasksSection subtasks={initialSubtasks} dispatch={dispatch} />
      </ThemeProvider>
    );

    // Verify removed icons do not exist
    expect(queryByTestId('drag-subtask-step-1')).toBeNull();
    expect(queryByTestId('move-up-step-2')).toBeNull();
    expect(queryByTestId('move-down-step-1')).toBeNull();

    // Tap title (edit-subtask-step-1) to edit
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
});

describe('computeDropIndex', () => {
  it('shifts by the rounded number of rows dragged', () => {
    expect(computeDropIndex(1, 48, 48, 5)).toBe(2);
    expect(computeDropIndex(2, -96, 48, 5)).toBe(0);
    expect(computeDropIndex(1, 20, 48, 5)).toBe(1);
    expect(computeDropIndex(1, 30, 48, 5)).toBe(2);
  });

  it('clamps to the list bounds', () => {
    expect(computeDropIndex(1, 1000, 48, 3)).toBe(2);
    expect(computeDropIndex(1, -1000, 48, 3)).toBe(0);
  });

  it('returns the original index for degenerate inputs', () => {
    expect(computeDropIndex(1, 100, 48, 0)).toBe(1);
    expect(computeDropIndex(1, 100, 0, 5)).toBe(1);
  });
});
