export const NOTIFICATION_ID_PREFIX = 'task-reminder:';
export const NOTIFICATION_DEFAULT_SLOT = 'default';
export const NOTIFICATION_PAYLOAD_VERSION = 1;
export const NOTIFICATION_CHANNEL_ID = 'task-reminders';
export const NOTIFICATION_CHANNEL_NAME = 'Task Reminders';
export const MAX_SCHEDULED_TASK_REMINDERS = 48;

export interface NotificationPayloadData {
  kind: 'task-reminder';
  occurrenceId: string;
  taskDefinitionId: string;
  reminderSlot: 'default';
  triggerAtMs: number;
  payloadVersion: 1;
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
