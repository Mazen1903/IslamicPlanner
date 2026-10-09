import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskList } from '../TaskList';
import { Toast } from '@/components/common/Toast';
import { useToastStore } from '@/stores/useToastStore';
import type { PrayerTabViewModel, TaskCardViewModel } from '@/services/types';

function makeTask(over: Partial<TaskCardViewModel> = {}): TaskCardViewModel {
  return {
    occurrenceId: 'occ-1',
    taskDefinitionId: 'def-1',
    title: 'Pack the bag',
    scheduleType: 'PRAYER_RELATIVE',
    scheduleLabel: 'Dhuhr',
    priority: 'NORMAL',
    status: 'PENDING',
    estimatedMinutes: 10,
    sortInstant: null,
    createdAt: '2026-09-15T08:00:00.000Z',
    completedAt: null,
    missedAt: null,
    dueAt: null,
    expiresAt: null,
    ...over,
  };
}

function makeTab(task: TaskCardViewModel): PrayerTabViewModel {
  return {
    prayer: 'DHUHR',
    name: 'Dhuhr',
    startTime: '1:05 PM',
    startDateTime: '2026-09-15T13:05:00.000Z',
    temporalState: 'CURRENT',
    scheduledTasks: [task],
    missedTasks: [],
    completedTasks: [],
    anytimeTasks: [],
  };
}

async function renderList(task: TaskCardViewModel, onToggleSubtask = jest.fn()) {
  const onCompleteTask = jest.fn();
  const tab = makeTab(task);
  await render(
    <ThemeProvider>
      <TaskList
        tab={tab}
        allTabs={[tab]}
        selectedPrayer="DHUHR"
        currentPrayer="DHUHR"
        nextPrayer="ASR"
        onCompleteTask={onCompleteTask}
        onToggleSubtask={onToggleSubtask}
      />
      <Toast />
    </ThemeProvider>
  );
  return { onCompleteTask, onToggleSubtask };
}

describe('TaskList checklist completion toast', () => {
  beforeEach(() => {
    useToastStore.setState({ currentToast: null });
  });

  afterEach(async () => {
    await act(async () => {
      useToastStore.getState().hideToast();
    });
  });

  it('offers "Mark all" when a task with unfinished checklist items is completed', async () => {
    const task = makeTask({
      subtasks: [
        { id: 's1', title: 'Passport', isCompleted: true },
        { id: 's2', title: 'Charger', isCompleted: false },
        { id: 's3', title: 'Snacks', isCompleted: false },
      ],
    });
    const { onCompleteTask, onToggleSubtask } = await renderList(task);

    await fireEvent.press(screen.getByTestId('checkbox-occ-1'));
    expect(onCompleteTask).toHaveBeenCalledWith('occ-1');
    expect(screen.getByTestId('app-toast-message').props.children).toBe(
      'Mark all checklist items done?'
    );

    await fireEvent.press(screen.getByTestId('app-toast-action-btn'));
    await act(async () => {});

    // Only the unfinished items are toggled, in order
    expect(onToggleSubtask).toHaveBeenCalledTimes(2);
    expect(onToggleSubtask).toHaveBeenNthCalledWith(1, 'occ-1', 's2');
    expect(onToggleSubtask).toHaveBeenNthCalledWith(2, 'occ-1', 's3');
  });

  it('does not show the toast when every checklist item is already done', async () => {
    const task = makeTask({
      subtasks: [{ id: 's1', title: 'Passport', isCompleted: true }],
    });
    const { onCompleteTask } = await renderList(task);

    await fireEvent.press(screen.getByTestId('checkbox-occ-1'));
    expect(onCompleteTask).toHaveBeenCalledWith('occ-1');
    expect(screen.queryByTestId('app-toast')).toBeNull();
  });

  it('does not show the toast for tasks without a checklist', async () => {
    const { onCompleteTask } = await renderList(makeTask());

    await fireEvent.press(screen.getByTestId('checkbox-occ-1'));
    expect(onCompleteTask).toHaveBeenCalledWith('occ-1');
    expect(screen.queryByTestId('app-toast')).toBeNull();
  });
});
