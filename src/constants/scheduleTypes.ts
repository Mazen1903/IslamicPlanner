export const SCHEDULE_TYPES = [
  'EXACT_TIME',
  'PRAYER_RELATIVE',
  'PRAYER_WINDOW',
  'ANYTIME_TODAY',
] as const;

export type ScheduleType = (typeof SCHEDULE_TYPES)[number];
