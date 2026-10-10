import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ReschedulePrayerModal } from '../ReschedulePrayerModal';
import type { TaskCardViewModel } from '@/services/types';

describe('ReschedulePrayerModal Component', () => {
  const mockTask: TaskCardViewModel = {
    occurrenceId: 'occ-123',
    taskDefinitionId: 'def-123',
    title: 'Recite Surah Al-Kahf',
    scheduleType: 'PRAYER_RELATIVE',
    scheduleLabel: 'Dhuhr (1:05 PM)',
    priority: 'IMPORTANT',
    status: 'PENDING',
    estimatedMinutes: 20,
    sortInstant: '2026-09-19T13:05:00Z',
    createdAt: '2026-09-19T00:00:00Z',
    completedAt: null,
    missedAt: null,
    dueAt: null,
    expiresAt: null,
  };

  it('renders modal with task title, transition card, and options when visible', async () => {
    await render(
      <ThemeProvider>
        <ReschedulePrayerModal
          visible={true}
          task={mockTask}
          targetPrayer="ASR"
          targetPrayerTime="4:35 PM"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('reschedule-prayer-modal')).toBeTruthy();
    expect(screen.getByText('Reschedule Task')).toBeTruthy();
    expect(screen.getByText('Recite Surah Al-Kahf')).toBeTruthy();
    expect(screen.getByText('Dhuhr (1:05 PM)')).toBeTruthy();
    expect(screen.getByText('Asr')).toBeTruthy();
    expect(screen.getAllByText('4:35 PM').length).toBeGreaterThanOrEqual(1);
  });

  it('confirms with AT_PRAYER (offset 0) by default', async () => {
    const onConfirm = jest.fn();

    await render(
      <ThemeProvider>
        <ReschedulePrayerModal
          visible={true}
          task={mockTask}
          targetPrayer="ASR"
          targetPrayerTime="4:35 PM"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );

    const confirmButton = screen.getByTestId('reschedule-confirm-button');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(onConfirm).toHaveBeenCalledWith({
      scheduleType: 'PRAYER_RELATIVE',
      scheduleData: {
        anchorPrayer: 'ASR',
        direction: 'AFTER',
        offsetMinutes: 0,
      },
    });
  });

  it('adjusts time forward by 5 minutes with stepper', async () => {
    const onConfirm = jest.fn();

    await render(
      <ThemeProvider>
        <ReschedulePrayerModal
          visible={true}
          task={mockTask}
          targetPrayer="MAGHRIB"
          targetPrayerTime="7:10 PM"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );

    const plusBtn = screen.getByTestId('reschedule-offset-plus');
    await act(async () => {
      fireEvent.press(plusBtn);
    });

    const confirmButton = screen.getByTestId('reschedule-confirm-button');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(onConfirm).toHaveBeenCalledWith({
      scheduleType: 'PRAYER_RELATIVE',
      scheduleData: {
        anchorPrayer: 'MAGHRIB',
        direction: 'AFTER',
        offsetMinutes: 5,
      },
    });
  });

  it('adjusts time backward by 5 minutes with stepper', async () => {
    const onConfirm = jest.fn();

    await render(
      <ThemeProvider>
        <ReschedulePrayerModal
          visible={true}
          task={mockTask}
          targetPrayer="DHUHR"
          targetPrayerTime="1:15 PM"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );

    const minusBtn = screen.getByTestId('reschedule-offset-minus');
    await act(async () => {
      fireEvent.press(minusBtn);
    });

    const confirmButton = screen.getByTestId('reschedule-confirm-button');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(onConfirm).toHaveBeenCalledWith({
      scheduleType: 'PRAYER_RELATIVE',
      scheduleData: {
        anchorPrayer: 'DHUHR',
        direction: 'BEFORE',
        offsetMinutes: 5,
      },
    });
  });

  it('triggers onEditTask when Edit Full Task button is pressed', async () => {
    const onEditTask = jest.fn();

    await render(
      <ThemeProvider>
        <ReschedulePrayerModal
          visible={true}
          task={mockTask}
          targetPrayer="ISHA"
          targetPrayerTime="8:30 PM"
          onConfirm={jest.fn()}
          onEditTask={onEditTask}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );

    const editButton = screen.getByTestId('reschedule-edit-task-button');
    await act(async () => {
      fireEvent.press(editButton);
    });

    expect(onEditTask).toHaveBeenCalledWith(mockTask, 'ISHA');
  });

  it('invokes onCancel when close button or cancel button is pressed', async () => {
    const onCancel = jest.fn();

    await render(
      <ThemeProvider>
        <ReschedulePrayerModal
          visible={true}
          task={mockTask}
          targetPrayer="ASR"
          targetPrayerTime="4:35 PM"
          onConfirm={jest.fn()}
          onCancel={onCancel}
        />
      </ThemeProvider>
    );

    const cancelButton = screen.getByTestId('reschedule-cancel-button');
    await act(async () => {
      fireEvent.press(cancelButton);
    });
    expect(onCancel).toHaveBeenCalledTimes(1);

    const closeButton = screen.getByTestId('reschedule-modal-close');
    await act(async () => {
      fireEvent.press(closeButton);
    });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  describe('toOpaqueColor utility', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { toOpaqueColor } = require('../ReschedulePrayerModal');

    it('converts rgba with alpha to opaque rgb', () => {
      expect(toOpaqueColor('rgba(30, 36, 75, 0.75)')).toBe('rgb(30, 36, 75)');
      expect(toOpaqueColor('rgba(37, 44, 88, 0.65)')).toBe('rgb(37, 44, 88)');
      expect(toOpaqueColor('rgba(255, 255, 255, 0.88)')).toBe('rgb(255, 255, 255)');
    });

    it('preserves solid hex colors and strips 8-digit hex alpha', () => {
      expect(toOpaqueColor('#1E244B')).toBe('#1E244B');
      expect(toOpaqueColor('#1E244B80')).toBe('#1E244B');
    });

    it('falls back safely if color is falsy', () => {
      expect(toOpaqueColor('', '#FFFFFF')).toBe('#FFFFFF');
    });
  });
});

