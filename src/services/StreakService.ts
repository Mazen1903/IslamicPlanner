import { StreakRepository } from '@/data/repositories/StreakRepository';
import {
  TaskOccurrenceRepository,
  taskOccurrenceRepository,
} from '@/data/repositories/TaskOccurrenceRepository';
import type { StreakData } from '@/domain/task/types';

export class StreakService {
  constructor(
    private readonly streakRepo: StreakRepository = new StreakRepository(),
    private readonly occRepo: TaskOccurrenceRepository = taskOccurrenceRepository
  ) {}

  /**
   * Called after an occurrence is marked COMPLETED.
   * Increments the streak if enabled for this series.
   */
  async onOccurrenceCompleted(seriesId: string, completedDate: string): Promise<StreakData | null> {
    const streak = await this.streakRepo.findBySeriesId(seriesId);
    if (!streak?.streakEnabled) return null;
    return await this.streakRepo.incrementStreak(seriesId, completedDate);
  }

  /**
   * Called when a COMPLETED occurrence is uncompleted/undone.
   * Reverts the streak completion if enabled for this series.
   */
  async onOccurrenceUncompleted(seriesId: string, completedDate: string): Promise<StreakData | null> {
    const streak = await this.streakRepo.findBySeriesId(seriesId);
    if (!streak?.streakEnabled) return null;
    return await this.streakRepo.revertCompletion(seriesId, completedDate);
  }

  /**
   * Called when OccurrenceLifecycleService transitions an occurrence to MISSED.
   * Resets the streak if enabled for this series.
   */
  async onOccurrenceMissed(seriesId: string, missedDate: string): Promise<StreakData | null> {
    const streak = await this.streakRepo.findBySeriesId(seriesId);
    if (!streak?.streakEnabled) return null;
    return await this.streakRepo.resetStreak(seriesId, missedDate);
  }

  /**
   * Checks if streak is enabled for a series.
   */
  async isStreakEnabled(seriesId: string): Promise<boolean> {
    return await this.streakRepo.isStreakEnabled(seriesId);
  }

  /**
   * Enables streak tracking for a series.
   */
  async enableStreak(seriesId: string): Promise<StreakData> {
    return await this.streakRepo.enableStreak(seriesId);
  }

  /**
   * Disables streak tracking for a series.
   */
  async disableStreak(seriesId: string): Promise<void> {
    await this.streakRepo.disableStreak(seriesId);
  }
}

export const streakService = new StreakService();
