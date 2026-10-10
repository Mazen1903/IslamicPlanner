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
    expect(screen.getByText('4:35 PM')).toBeTruthy();
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

  it('confirms with PLUS_15 (offset 15) when selected', async () => {
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

    const plus15Option = screen.getByTestId('option-plus-15');
    await act(async () => {
      fireEvent.press(plus15Option);
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
        offsetMinutes: 15,
      },
    });
  });

  it('confirms with EXACT_TIME when selected', async () => {
    const onConfirm = jest.fn();

    await render(
      <ThemeProvider>
        <ReschedulePrayerModal
          visible={true}
          task={mockTask}
          targetPrayer="ISHA"
          targetPrayerTime="8:30 PM"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );

    const exactOption = screen.getByTestId('option-exact-time');
    await act(async () => {
      fireEvent.press(exactOption);
    });

    const confirmButton = screen.getByTestId('reschedule-confirm-button');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(onConfirm).toHaveBeenCalledWith({
      scheduleType: 'EXACT_TIME',
      scheduleData: {
        localTime: '20:30',
      },
    });
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

  it('supports BEFORE direction and custom stepper offset', async () => {
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

    // Switch direction to BEFORE
    const beforeBtn = screen.getByTestId('reschedule-direction-before');
    await act(async () => {
      fireEvent.press(beforeBtn);
    });

    // Enter custom offset 25 min
    const customInput = screen.getByTestId('reschedule-custom-offset-input');
    await act(async () => {
      fireEvent.changeText(customInput, '25');
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
        offsetMinutes: 25,
      },
    });
  });

  it('supports ANYTIME_TODAY mode', async () => {
    const onConfirm = jest.fn();

    await render(
      <ThemeProvider>
        <ReschedulePrayerModal
          visible={true}
          task={mockTask}
          targetPrayer="ASR"
          onConfirm={onConfirm}
          onCancel={jest.fn()}
        />
      </ThemeProvider>
    );

    const anytimeChip = screen.getByTestId('option-anytime-today');
    await act(async () => {
      fireEvent.press(anytimeChip);
    });

    const confirmButton = screen.getByTestId('reschedule-confirm-button');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(onConfirm).toHaveBeenCalledWith({
      scheduleType: 'ANYTIME_TODAY',
      scheduleData: {},
    });
  });
});

