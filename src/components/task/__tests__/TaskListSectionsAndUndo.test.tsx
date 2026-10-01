import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TaskList } from '../TaskList';
import { TaskCard } from '../TaskCard';
import { TaskEngine } from '@/domain/task/TaskEngine';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { StreakRepository } from '@/data/repositories/StreakRepository';
import { createTestDatabase, cleanupTestDatabase } from '@/data/__tests__/testDbHelper';
import type { PrayerTabViewModel, TaskCardViewModel } from '@/services/types';

describe('TaskList Sections and Undo Functionality', () => {
  describe('Backend / Domain: uncompleteTask & Streak Revert', () => {
    let engine: TaskEngine;
    let streakRepo: StreakRepository;
    const testSeriesId = 'series-undo-test';
    let testDefId = 'def-undo-test';

    beforeEach(async () => {
      createTestDatabase();
      streakRepo = new StreakRepository();
      engine = new TaskEngine(taskDefinitionRepository, taskOccurrenceRepository);

      const def = await taskDefinitionRepository.create({
        id: testDefId,
        title: 'Undo Test Task',
        startDate: '2026-09-15',
        source: 'USER',
        scheduleType: 'PRAYER_RELATIVE',
        scheduleData: {
          anchorPrayer: 'DHUHR',
          direction: 'AFTER',
          offsetMinutes: 15,
        },
        seriesId: testSeriesId,
        seriesVersion: 1,
        priority: 'NORMAL',
        estimatedMinutes: 20,
        notes: null,
        tags: [],
        subtasks: [],
        isActive: true,
      });
      testDefId = def.id;

      // Enable streak for this series
      await streakRepo.enableStreak(testSeriesId);
    });

    afterEach(() => {
      cleanupTestDatabase();
    });

    it('reverts a COMPLETED task back to PENDING and clears completedAt', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-undo-01',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });

      // 1. Complete task
      const completed = await engine.completeTask(occ.id, '2026-09-15T13:00:00.000Z');
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBe('2026-09-15T13:00:00.000Z');

      // Streak should be recorded
      const streakAfterComplete = await streakRepo.findBySeriesId(testSeriesId);
      expect(streakAfterComplete?.lastCompletedDate).toBe('2026-09-15');

      // 2. Undo completion
      const undone = await engine.uncompleteTask(occ.id);
      expect(undone.status).toBe('PENDING');
      expect(undone.completedAt).toBeNull();

      // Streak completion date should be reverted
      const streakAfterUndo = await streakRepo.findBySeriesId(testSeriesId);
      expect(streakAfterUndo?.lastCompletedDate).toBeNull();
    });

    it('uncomplete is idempotent if called on already PENDING task', async () => {
      const occ = await taskOccurrenceRepository.create({
        id: 'occ-undo-02',
        taskDefinitionId: testDefId,
        localDate: '2026-09-15',
        planningDayKey: '2026-09-15',
        timezone: 'America/Chicago',
        status: 'PENDING',
      });

      const res = await taskOccurrenceRepository.uncomplete(occ.id);
      expect(res.status).toBe('PENDING');
    });
  });

  describe('UI: TaskCard Checkbox Undo', () => {
    const completedTask: TaskCardViewModel = {
      occurrenceId: 'occ-completed-card',
      taskDefinitionId: 'def-1',
      title: 'Completed Task',
      scheduleType: 'PRAYER_RELATIVE',
      scheduleLabel: 'Dhuhr +15 min',
      priority: 'NORMAL',
      status: 'COMPLETED',
      estimatedMinutes: 15,
      sortInstant: null,
      createdAt: '2026-09-15T12:00:00.000Z',
      completedAt: '2026-09-15T13:00:00.000Z',
      missedAt: null,
      dueAt: null,
      expiresAt: null,
    };

    it('calls onUndo when tapping the checkbox of a COMPLETED task', async () => {
      const onUndo = jest.fn();
      const onComplete = jest.fn();

      await render(
        <ThemeProvider>
          <TaskCard task={completedTask} onUndo={onUndo} onComplete={onComplete} />
        </ThemeProvider>
      );

      const checkbox = screen.getByTestId('checkbox-occ-completed-card');
      fireEvent.press(checkbox);

      expect(onUndo).toHaveBeenCalledWith('occ-completed-card');
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('UI: TaskList 4 Collapsible Sections', () => {
    const sampleTab: PrayerTabViewModel = {
      prayer: 'DHUHR',
      name: 'Dhuhr',
      arabicName: 'الظهر',
      startTime: '1:05 PM',
      startDateTime: '2026-09-15T13:05:00.000Z',
      temporalState: 'CURRENT',
      scheduledTasks: [
        {
          occurrenceId: 'occ-today-1',
          taskDefinitionId: 'def-1',
          title: 'Active Task Today',
          scheduleType: 'PRAYER_RELATIVE',
          scheduleLabel: 'Dhuhr',
          priority: 'NORMAL',
          status: 'PENDING',
          estimatedMinutes: 10,
          sortInstant: null,
          createdAt: '2026-09-15T13:00:00.000Z',
          completedAt: null,
          missedAt: null,
          dueAt: null,
          expiresAt: null,
        },
      ],
      missedTasks: [
        {
          occurrenceId: 'occ-prev-1',
          taskDefinitionId: 'def-2',
          title: 'Missed Previous Task',
          scheduleType: 'PRAYER_RELATIVE',
          scheduleLabel: 'Fajr',
          priority: 'NORMAL',
          status: 'MISSED',
          estimatedMinutes: 15,
          sortInstant: null,
          createdAt: '2026-09-15T05:00:00.000Z',
          completedAt: null,
          missedAt: '2026-09-15T07:00:00.000Z',
          dueAt: null,
          expiresAt: null,
        },
      ],
      completedTasks: [
        {
          occurrenceId: 'occ-comp-1',
          taskDefinitionId: 'def-3',
          title: 'Completed Task',
          scheduleType: 'PRAYER_RELATIVE',
          scheduleLabel: 'Dhuhr',
          priority: 'NORMAL',
          status: 'COMPLETED',
          estimatedMinutes: 20,
          sortInstant: null,
          createdAt: '2026-09-15T12:00:00.000Z',
          completedAt: '2026-09-15T13:10:00.000Z',
          missedAt: null,
          dueAt: null,
          expiresAt: null,
        },
      ],
      anytimeTasks: [],
    };

    it('renders all 4 section headers with counts and allows expand/shrink', async () => {
      await render(
        <ThemeProvider>
          <TaskList
            tab={sampleTab}
            selectedPrayer="DHUHR"
            currentPrayer="DHUHR"
            nextPrayer="ASR"
            onCompleteTask={jest.fn()}
            onUndoTask={jest.fn()}
          />
        </ThemeProvider>
      );

      // Verify all 4 headers are rendered with counts
      expect(screen.getByText('Previous (1)')).toBeTruthy();
      expect(screen.getByText('Today (1)')).toBeTruthy();
      expect(screen.getByText('Upcoming (0)')).toBeTruthy();
      expect(screen.getByText('Completed Today (1)')).toBeTruthy();

      // Today is expanded by default: Active Task Today is visible
      expect(screen.getByText('Active Task Today')).toBeTruthy();

      // Previous is collapsed by default: Missed Previous Task is not visible
      expect(screen.queryByText('Missed Previous Task')).toBeNull();

      // Tap Previous header to expand it
      const prevHeader = screen.getByTestId('section-header-previous');
      fireEvent.press(prevHeader);

      await screen.findByText('Missed Previous Task');

      // Tap Previous header again to shrink it
      fireEvent.press(prevHeader);
      await waitFor(() => {
        expect(screen.queryByText('Missed Previous Task')).toBeNull();
      });

      // Tap Today header to shrink it
      const todayHeader = screen.getByTestId('section-header-today');
      fireEvent.press(todayHeader);
      await waitFor(() => {
        expect(screen.queryByText('Active Task Today')).toBeNull();
      });
    });

    it('renders the date instead of anytime on the task card for ANYTIME_TODAY tasks', async () => {
      const anytimeTask: TaskCardViewModel = {
        occurrenceId: 'occ-anytime-date-test',
        taskDefinitionId: 'def-anytime-1',
        title: 'Walk 10k Steps',
        scheduleType: 'ANYTIME_TODAY',
        scheduleLabel: 'Anytime Today',
        priority: 'NORMAL',
        status: 'PENDING',
        estimatedMinutes: 30,
        sortInstant: null,
        localDate: '2026-09-15',
        createdAt: '2026-09-15T08:00:00.000Z',
        completedAt: null,
        missedAt: null,
        dueAt: null,
        expiresAt: null,
      };

      await render(
        <ThemeProvider>
          <TaskCard task={anytimeTask} />
        </ThemeProvider>
      );

      // Verify date is displayed
      expect(screen.getByText('Sep 15')).toBeTruthy();
      // Verify "Anytime Today" or "Anytime" is NOT displayed
      expect(screen.queryByText('Anytime Today')).toBeNull();
      expect(screen.queryByText('Anytime')).toBeNull();
    });

    it('deduplicates repetitive tasks in Upcoming and excludes tasks already active in Today', async () => {
      const activeTab: PrayerTabViewModel = {
        prayer: 'DHUHR',
        name: 'Dhuhr',
        arabicName: 'الظهر',
        startTime: '1:05 PM',
        startDateTime: '2026-09-15T13:05:00Z',
        temporalState: 'CURRENT',
        scheduledTasks: [
          {
            occurrenceId: 'occ-active-dhuhr',
            taskDefinitionId: 'def-tasbeeh',
            title: 'Recite Tasbeeh',
            scheduleType: 'PRAYER_RELATIVE',
            scheduleLabel: 'Dhuhr',
            priority: 'NORMAL',
            status: 'PENDING',
            estimatedMinutes: 10,
            sortInstant: '2026-09-15T13:10:00.000Z',
            createdAt: '2026-09-15T08:00:00.000Z',
            completedAt: null,
            missedAt: null,
            dueAt: null,
            expiresAt: null,
          },
        ],
        missedTasks: [],
        completedTasks: [],
        anytimeTasks: [],
      };

      const asrTab: PrayerTabViewModel = {
        prayer: 'ASR',
        name: 'Asr',
        arabicName: 'العصر',
        startTime: '4:35 PM',
        startDateTime: '2026-09-15T16:35:00Z',
        temporalState: 'FUTURE',
        scheduledTasks: [
          {
            occurrenceId: 'occ-tasbeeh-asr',
            taskDefinitionId: 'def-tasbeeh',
            title: 'Recite Tasbeeh',
            scheduleType: 'PRAYER_RELATIVE',
            scheduleLabel: 'Asr',
            priority: 'NORMAL',
            status: 'PENDING',
            estimatedMinutes: 10,
            sortInstant: '2026-09-15T16:40:00.000Z',
            createdAt: '2026-09-15T08:00:00.000Z',
            completedAt: null,
            missedAt: null,
            dueAt: null,
            expiresAt: null,
          },
          {
            occurrenceId: 'occ-quran-asr',
            taskDefinitionId: 'def-quran',
            title: 'Review Quran',
            scheduleType: 'PRAYER_RELATIVE',
            scheduleLabel: 'Asr',
            priority: 'NORMAL',
            status: 'PENDING',
            estimatedMinutes: 20,
            sortInstant: '2026-09-15T16:45:00.000Z',
            createdAt: '2026-09-15T08:00:00.000Z',
            completedAt: null,
            missedAt: null,
            dueAt: null,
            expiresAt: null,
          },
        ],
        missedTasks: [],
        completedTasks: [],
        anytimeTasks: [],
      };

      const maghribTab: PrayerTabViewModel = {
        prayer: 'MAGHRIB',
        name: 'Maghrib',
        arabicName: 'المغرب',
        startTime: '7:15 PM',
        startDateTime: '2026-09-15T19:15:00Z',
        temporalState: 'FUTURE',
        scheduledTasks: [
          {
            occurrenceId: 'occ-quran-maghrib',
            taskDefinitionId: 'def-quran',
            title: 'Review Quran',
            scheduleType: 'PRAYER_RELATIVE',
            scheduleLabel: 'Maghrib',
            priority: 'NORMAL',
            status: 'PENDING',
            estimatedMinutes: 20,
            sortInstant: '2026-09-15T19:20:00.000Z',
            createdAt: '2026-09-15T08:00:00.000Z',
            completedAt: null,
            missedAt: null,
            dueAt: null,
            expiresAt: null,
          },
        ],
        missedTasks: [],
        completedTasks: [],
        anytimeTasks: [],
      };

      await render(
        <ThemeProvider>
          <TaskList
            tab={activeTab}
            allTabs={[activeTab, asrTab, maghribTab]}
            selectedPrayer="DHUHR"
            currentPrayer="DHUHR"
            nextPrayer="ASR"
            onCompleteTask={jest.fn()}
            onUndoTask={jest.fn()}
          />
        </ThemeProvider>
      );

      // Today should have 1 task (Recite Tasbeeh)
      expect(screen.getByText('Today (1)')).toBeTruthy();

      // Upcoming should have only 1 task (Review Quran from Asr), NOT 3 tasks:
      // - "Recite Tasbeeh" is excluded because it's already active in Today
      // - "Review Quran" is deduplicated across Asr & Maghrib to only show the next upcoming one
      expect(screen.getByText('Upcoming (1)')).toBeTruthy();
    });
  });
});

