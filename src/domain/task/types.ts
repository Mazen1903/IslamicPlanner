import type { Prayer } from '@/constants/prayers';
import type { ScheduleType } from '@/constants/scheduleTypes';

export type { Prayer } from '@/constants/prayers';
export type { ScheduleType } from '@/constants/scheduleTypes';
export { SCHEDULE_TYPES } from '@/constants/scheduleTypes';

export type RelativeDirection = 'BEFORE' | 'AFTER';

export interface ExactTimeData {
  localTime: string; // "HH:mm" (24-hour clock, 00:00 - 23:59)
}

export interface PrayerRelativeData {
  anchorPrayer: Prayer;
  direction: RelativeDirection;
  offsetMinutes: number; // Non-negative integer
}

export interface PrayerWindowData {
  startPrayer: Prayer;
  endPrayer: Prayer;
}

export type AnytimeTodayData = Record<string, never>;

export type ScheduleDataMap = {
  EXACT_TIME: ExactTimeData;
  PRAYER_RELATIVE: PrayerRelativeData;
  PRAYER_WINDOW: PrayerWindowData;
  ANYTIME_TODAY: AnytimeTodayData;
};

export type ScheduleDataFor<T extends ScheduleType> = ScheduleDataMap[T];

export type ScheduleConfig =
  | { scheduleType: 'EXACT_TIME'; scheduleData: ExactTimeData }
  | { scheduleType: 'PRAYER_RELATIVE'; scheduleData: PrayerRelativeData }
  | { scheduleType: 'PRAYER_WINDOW'; scheduleData: PrayerWindowData }
  | { scheduleType: 'ANYTIME_TODAY'; scheduleData: AnytimeTodayData };

export type TaskSource = 'USER' | 'WORSHIP' | 'ROUTINE';
export type TaskPriority = 'NORMAL' | 'IMPORTANT';
export type OccurrenceStatus = 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
export type WallClockResolutionType = 'NORMAL' | 'SPRING_FORWARD_SHIFTED' | 'FALL_BACK_FIRST';

export interface SubtaskTemplate {
  id: string; // UUID v4
  title: string;
}

export interface OccurrenceSubtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface OccurrenceOverrideData {
  completedSubtaskIds?: string[];
  title?: string;
  notes?: string;
}

export interface HijriRecurrenceData {
  hijriDays: number[] | null;
  hijriMonths: number[] | null;
  description?: string;
}

export interface ReminderRule {
  offsetMinutes?: number;
  channelId?: string;
  [key: string]: unknown;
}

export interface TaskDefinition {
  id: string;
  title: string;
  description: string | null;
  startDate: string; // 'YYYY-MM-DD' — civil schedule / recurrence seed date
  source: TaskSource;
  worshipItemKey: string | null;
  scheduleType: ScheduleType;
  scheduleData: ScheduleDataFor<ScheduleType>;
  recurrenceRule: string | null;
  hijriRecurrence: HijriRecurrenceData | null;
  recurrenceEnd: string | null;
  seriesId: string;
  seriesVersion: number;
  effectiveFromDate: string | null;
  effectiveToDate: string | null;
  reminderRule: ReminderRule | null;
  priority: TaskPriority;
  estimatedMinutes: number | null;
  notes: string | null;
  tags: string[];
  subtasks: SubtaskTemplate[];
  isActive: boolean;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

export interface TaskDefinitionUpdatePatch {
  title?: string;
  description?: string | null;
  startDate?: string;
  source?: TaskSource;
  worshipItemKey?: string | null;
  scheduleType?: ScheduleType;
  scheduleData?: ScheduleDataFor<ScheduleType>;
  recurrenceRule?: string | null;
  hijriRecurrence?: HijriRecurrenceData | null;
  recurrenceEnd?: string | null;
  reminderRule?: ReminderRule | null;
  priority?: TaskPriority;
  estimatedMinutes?: number | null;
  notes?: string | null;
  tags?: string[];
  subtasks?: SubtaskTemplate[];
  isActive?: boolean;
}

export interface TaskOccurrence {
  id: string;
  taskDefinitionId: string;
  seriesId: string;
  localDate: string; // 'YYYY-MM-DD' seed date
  planningDayKey: string; // 'YYYY-MM-DD'
  timezone: string; // IANA
  calculatedStartTime: string | null; // ISO 8601
  calculatedPrayerSection: Prayer | null;
  eligiblePrayerSections: Prayer[] | null;
  wallClockResolution: WallClockResolutionType | null;
  windowStart: string | null; // ISO 8601 UTC (populated only for PRAYER_WINDOW)
  windowEnd: string | null; // ISO 8601 UTC (populated only for PRAYER_WINDOW)
  status: OccurrenceStatus;
  completedAt: string | null; // ISO 8601 UTC
  missedAt: string | null; // ISO 8601 UTC
  overrideData: OccurrenceOverrideData | null;
}

export interface DerivedPlacement {
  calculatedStartTime: string | null;
  calculatedPrayerSection: Prayer | null;
  eligiblePrayerSections: Prayer[] | null;
  wallClockResolution: WallClockResolutionType | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  planningDayKey: string;
  timezone?: string;
}

export interface CreateTaskParams {
  id?: string;
  title: string;
  description?: string | null;
  startDate: string; // 'YYYY-MM-DD'
  source?: TaskSource;
  worshipItemKey?: string | null;
  scheduleType: ScheduleType;
  scheduleData: ScheduleDataFor<ScheduleType>;
  recurrenceRule?: string | null;
  hijriRecurrence?: HijriRecurrenceData | null;
  recurrenceEnd?: string | null;
  seriesId?: string;
  isRecurring?: boolean;
  reminderRule?: ReminderRule | null;
  priority?: TaskPriority;
  estimatedMinutes?: number | null;
  notes?: string | null;
  tags?: string[];
  subtasks?: { id?: string; title: string }[];
  isActive?: boolean;
}

export interface NewTaskOccurrenceInput {
  id?: string;
  taskDefinitionId: string;
  seriesId?: string; // Optional: derived automatically from TaskDefinition
  localDate: string; // 'YYYY-MM-DD' seed date
  planningDayKey: string;
  timezone: string;
  calculatedStartTime?: string | null;
  calculatedPrayerSection?: Prayer | null;
  eligiblePrayerSections?: Prayer[] | null;
  wallClockResolution?: WallClockResolutionType | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  status?: OccurrenceStatus;
  completedAt?: string | null;
  missedAt?: string | null;
  overrideData?: OccurrenceOverrideData | null;
}
