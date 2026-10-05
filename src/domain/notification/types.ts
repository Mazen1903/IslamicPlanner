export const NOTIFICATION_ID_PREFIX = 'task-reminder:';
export const NOTIFICATION_DEFAULT_SLOT = 'default';
export const NOTIFICATION_PAYLOAD_VERSION = 2;
export const NOTIFICATION_CHANNEL_ID = 'task-reminders-v2-vib';
export const NOTIFICATION_CHANNEL_NAME = 'Task Reminders';
export const MAX_SCHEDULED_TASK_REMINDERS = 48;

export const NOTIFICATION_CATEGORY_TASK = 'task-reminder-actions';
export const NOTIFICATION_ACTION_SNOOZE = 'ACTION_SNOOZE_10';
export const NOTIFICATION_ACTION_DONE = 'ACTION_MARK_DONE';

export interface NotificationPayloadData {
  kind: 'task-reminder' | 'prayer-alert' | 'journal-reminder' | 'test-notification';
  occurrenceId?: string;
  taskDefinitionId?: string;
  reminderSlot?: string;
  prayerName?: string;
  date?: string;
  triggerAtMs: number;
  payloadVersion: number;
  [key: string]: unknown;
}

export interface DesiredNotification {
  identifier: string;
  occurrenceId: string;
  taskDefinitionId: string;
  title: string;
  triggerAtMs: number;
  channelId: string;
  data: NotificationPayloadData;
}

export interface ScheduledNotificationSnapshot {
  identifier: string;
  title: string | null;
  triggerAtMs: number;
  channelId?: string | null;
  data?: Record<string, unknown>;
}

export interface NotificationReconcileResult {
  scheduled: string[];
  cancelled: string[];
  unchanged: string[];
  skippedPast: string[];
  skippedCapacity: string[];
  failed: {
    identifier: string;
    action: 'SCHEDULE' | 'CANCEL';
    error: unknown;
  }[];
}
