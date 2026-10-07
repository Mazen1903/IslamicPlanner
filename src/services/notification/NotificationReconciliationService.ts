import { Platform } from 'react-native';
import type { TaskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import type { TaskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskOccurrenceRepository as defaultOccRepo } from '@/data/repositories/TaskOccurrenceRepository';
import { taskDefinitionRepository as defaultDefRepo } from '@/data/repositories/TaskDefinitionRepository';
import type { TaskDefinition } from '@/domain/task/types';
import {
  MAX_SCHEDULED_TASK_REMINDERS,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_DEFAULT_SLOT,
  NOTIFICATION_PAYLOAD_VERSION,
  type DesiredNotification,
  type NotificationReconcileResult,
} from '@/domain/notification/types';
import {
  buildNotificationId,
  isAppOwnedNotificationId,
} from '@/domain/notification/notificationIdentity';
import {
  deriveNotificationTriggers,
  deriveDesiredNotifications,
} from '@/domain/notification/notificationTrigger';
import { isNotificationEquivalent } from '@/domain/notification/notificationEquality';
import { adjustTriggerForQuietHours } from '@/domain/notification/quietHours';
import type { NotificationSchedulerAdapterAPI } from './NotificationSchedulerAdapter';
import { notificationSchedulerAdapter as defaultAdapter } from './NotificationSchedulerAdapter';
import type { NotificationChannelManagerAPI } from './NotificationChannelManager';
import { notificationChannelManager as defaultChannelManager } from './NotificationChannelManager';
import {
  type PrayerAlertSchedulerAPI,
  prayerAlertScheduler as defaultPrayerScheduler,
  isPrayerAlertNotificationId,
} from './PrayerAlertScheduler';

import type { UserSettingsRepository } from '@/data/repositories/UserSettingsRepository';
import { userSettingsRepository as defaultSettingsRepo } from '@/data/repositories/UserSettingsRepository';

export interface Clock {
  nowMs(): number;
}

export function isManagedNotificationId(id: string): boolean {
  return (
    isAppOwnedNotificationId(id) ||
    isPrayerAlertNotificationId(id) ||
    (typeof id === 'string' && id.startsWith('journal-reminder:'))
  );
}

export class NotificationReconciliationService {
  private drainPromise: Promise<NotificationReconcileResult> | null = null;
  private rerunRequested = false;

  constructor(
    private readonly occRepo: TaskOccurrenceRepository = defaultOccRepo,
    private readonly defRepo: TaskDefinitionRepository = defaultDefRepo,
    private readonly adapter: NotificationSchedulerAdapterAPI = defaultAdapter,
    private readonly channelManager: NotificationChannelManagerAPI = defaultChannelManager,
    private readonly clock: Clock = { nowMs: () => Date.now() },
    private readonly settingsRepo: UserSettingsRepository = defaultSettingsRepo,
    private readonly prayerScheduler: PrayerAlertSchedulerAPI = defaultPrayerScheduler
  ) {}

  /**
   * Requests a full reconciliation pass.
   * Concurrency invariant: Uses a shared drain loop.
   * If a pass is already running, coalesces subsequent requests into exactly one follow-up rerun.
   * All awaiting callers resolve only when the final pass completes.
   * Resilient: drainPromise is cleaned up in finally block even on fatal error.
   */
  reconcile(): Promise<NotificationReconcileResult> {
    this.rerunRequested = true;

    if (!this.drainPromise) {
      this.drainPromise = this.drain();
    }

    return this.drainPromise;
  }

  /**
   * Targeted cancellation of an occurrence reminder upon task completion.
   * Cancels all scheduled notifications matching occurrenceId in data or identifier.
   * Best-effort and idempotent. Never throws or fails callers.
   */
  async cancelOccurrenceReminder(occurrenceId: string): Promise<void> {
    const slots = [NOTIFICATION_DEFAULT_SLOT, 'r0', 'r1', 'r2', 'snooze'];
    for (const slot of slots) {
      try {
        const id = buildNotificationId(occurrenceId, slot);
        await this.adapter.cancelScheduledNotification(id);
      } catch {
        // Best-effort; next reconcile will sweep if any residual exists
      }
    }

    try {
      const scheduled = await this.adapter.getAllScheduledNotifications();
      for (const item of scheduled) {
        if (item.data?.occurrenceId === occurrenceId || item.identifier.includes(occurrenceId)) {
          if (!slots.some(slot => buildNotificationId(occurrenceId, slot) === item.identifier)) {
            await this.adapter.cancelScheduledNotification(item.identifier);
          }
        }
      }
    } catch {
      // Best-effort
    }
  }

  private async drain(): Promise<NotificationReconcileResult> {
    let lastResult: NotificationReconcileResult = {
      scheduled: [],
      cancelled: [],
      unchanged: [],
      skippedPast: [],
      skippedCapacity: [],
      failed: [],
    };

    try {
      while (this.rerunRequested) {
        this.rerunRequested = false;
        lastResult = await this.executeReconcile(this.clock.nowMs());
      }
      return lastResult;
    } finally {
      this.drainPromise = null;
    }
  }

  private async executeReconcile(nowMs: number): Promise<NotificationReconcileResult> {
    const result: NotificationReconcileResult = {
      scheduled: [],
      cancelled: [],
      unchanged: [],
      skippedPast: [],
      skippedCapacity: [],
      failed: [],
    };

    // 1. Inspect OS permission without prompting
    const permission = await this.adapter.getPermissionStatus();
    if (!permission.canSchedule) {
      // Best-effort cleanup of any existing app-owned notifications
      try {
        const scheduledList = await this.adapter.getAllScheduledNotifications();
        const appOwned = scheduledList.filter(s => isManagedNotificationId(s.identifier));
        for (const notif of appOwned) {
          try {
            await this.adapter.cancelScheduledNotification(notif.identifier);
            result.cancelled.push(notif.identifier);
          } catch (err) {
            result.failed.push({ identifier: notif.identifier, action: 'CANCEL', error: err });
          }
        }
      } catch {
        // Recoverable
      }
      return result;
    }

    // 1b. Load user settings
    let taskRemindersEnabled = true;
    let prayerAlertsEnabled = true;
    let journalReminderEnabled = false;
    let journalReminderTime = '21:30';
    let quietHoursEnabled = false;
    let quietHoursStart = '22:00';
    let quietHoursEnd = '06:00';
    let taskVibrationEnabled = true;
    let prayerVibrationEnabled = true;

    try {
      const settings = await this.settingsRepo.get();
      if (settings) {
        if (settings.taskRemindersEnabled !== undefined) taskRemindersEnabled = settings.taskRemindersEnabled;
        if (settings.prayerAlertsEnabled !== undefined) prayerAlertsEnabled = settings.prayerAlertsEnabled;
        if (settings.journalReminderEnabled !== undefined) journalReminderEnabled = settings.journalReminderEnabled;
        if (settings.journalReminderTime) journalReminderTime = settings.journalReminderTime;
        if (settings.quietHoursEnabled !== undefined) quietHoursEnabled = settings.quietHoursEnabled;
        if (settings.quietHoursStart) quietHoursStart = settings.quietHoursStart;
        if (settings.quietHoursEnd) quietHoursEnd = settings.quietHoursEnd;
        if (settings.taskVibrationEnabled !== undefined) taskVibrationEnabled = settings.taskVibrationEnabled;
        if (settings.prayerVibrationEnabled !== undefined) prayerVibrationEnabled = settings.prayerVibrationEnabled;
      }
    } catch {
      // Recoverable — proceed with defaults
    }

    // 2. Ensure Android channels lazily
    await this.channelManager.ensureChannel();

    // 3. Collect Prayer Alerts if enabled
    let prayerDesiredList: DesiredNotification[] = [];
    if (prayerAlertsEnabled && this.prayerScheduler?.getDesiredPrayerAlerts) {
      try {
        prayerDesiredList = await this.prayerScheduler.getDesiredPrayerAlerts(nowMs, prayerVibrationEnabled);
      } catch (err) {
        console.warn('[NotificationReconciliationService] Failed to derive prayer alerts:', err);
      }
    }

    // 4. Collect Task Reminders if enabled
    const taskDesiredList: DesiredNotification[] = [];

    if (taskRemindersEnabled) {
      // Query all materialized PENDING occurrences
      let pendingOccurrences: any[] = [];
      try {
        pendingOccurrences = await this.occRepo.findAllMaterializedPending();
      } catch (err) {
        result.failed.push({ identifier: '*', action: 'SCHEDULE', error: err });
        return result;
      }

      if (pendingOccurrences.length > 0) {
        // Batch load referenced TaskDefinitions
        const uniqueDefIds = Array.from(new Set(pendingOccurrences.map(o => o.taskDefinitionId)));
        const defMap = new Map<string, TaskDefinition>();
        await Promise.all(
          uniqueDefIds.map(async id => {
            const def = await this.defRepo.findById(id);
            if (def) {
              defMap.set(id, def);
            }
          })
        );

        for (const occ of pendingOccurrences) {
          const def = defMap.get(occ.taskDefinitionId);
          if (!def) continue;

          // Legacy ANYTIME_TODAY without timeOfDay is skipped
          if (def.scheduleType === 'ANYTIME_TODAY' && (!def.reminderRule || !def.reminderRule.timeOfDay)) {
            continue;
          }

          if (!def.reminderRule) continue;

          const channelId = this.channelManager?.getTaskChannelId
            ? this.channelManager.getTaskChannelId(def.priority, taskVibrationEnabled)
            : NOTIFICATION_CHANNEL_ID;
          const notifications = deriveDesiredNotifications(occ, def, nowMs, channelId);

          if (notifications.length === 0) {
            // Check if triggers were in the past
            const rawTriggers = deriveNotificationTriggers(occ, def, 0); // unfiltered by nowMs
            if (rawTriggers.length > 0) {
              const allPast = rawTriggers.every(t => t.triggerAtMs <= nowMs);
              if (allPast) {
                result.skippedPast.push(buildNotificationId(occ.id));
              }
            }
            continue;
          }

          for (const notif of notifications) {
            // Apply Quiet Hours deferral (Important priority tasks are exempt)
            if (quietHoursEnabled && def.priority !== 'IMPORTANT') {
              const adjusted = adjustTriggerForQuietHours(
                notif.triggerAtMs,
                occ.timezone,
                quietHoursStart,
                quietHoursEnd
              );
              if (adjusted > nowMs) {
                notif.triggerAtMs = adjusted;
                notif.data.triggerAtMs = adjusted;
              }
            }
            taskDesiredList.push(notif);
          }
        }
      }
    }

    // 5. Sort task reminders by triggerAtMs ascending and apply capacity limit
    taskDesiredList.sort((a, b) => a.triggerAtMs - b.triggerAtMs);

    const cappedTaskDesired = taskDesiredList.slice(0, MAX_SCHEDULED_TASK_REMINDERS);
    for (const overflow of taskDesiredList.slice(MAX_SCHEDULED_TASK_REMINDERS)) {
      result.skippedCapacity.push(overflow.identifier);
    }

    // 6. Combine all desired notifications (Prayer alerts + Task reminders)
    const combinedDesired: DesiredNotification[] = [...prayerDesiredList, ...cappedTaskDesired];
    const desiredMap = new Map(combinedDesired.map(d => [d.identifier, d]));

    // 7. Fetch current OS scheduled requests
    let scheduledList;
    try {
      scheduledList = await this.adapter.getAllScheduledNotifications();
    } catch (err) {
      result.failed.push({ identifier: '*', action: 'SCHEDULE', error: err });
      return result;
    }

    // 9. Filter app-owned / managed notifications
    const managedList = scheduledList.filter(s => isManagedNotificationId(s.identifier));
    const currentMap = new Map(managedList.map(s => [s.identifier, s]));

    // 10. Handle Journal Reminder (daily repeating)
    if (journalReminderEnabled) {
      try {
        await this.adapter.scheduleDailyNotification(
          'journal-reminder:daily',
          'Daily Reflection',
          'Take a moment for your evening reflection & journal entry.',
          journalReminderTime,
          this.channelManager.getJournalChannelId()
        );
      } catch (err) {
        console.warn('[NotificationReconciliationService] Failed to schedule journal reminder:', err);
      }
    } else if (currentMap.has('journal-reminder:daily')) {
      // Cancel journal reminder if disabled and currently scheduled
      try {
        await this.adapter.cancelScheduledNotification('journal-reminder:daily');
        result.cancelled.push('journal-reminder:daily');
      } catch (err) {
        result.failed.push({ identifier: 'journal-reminder:daily', action: 'CANCEL', error: err });
      }
    }

    // 11. Diff desired vs current
    for (const desired of combinedDesired) {
      const current = currentMap.get(desired.identifier);
      if (current) {
        const isEquivalent = isNotificationEquivalent(desired, current, {
          isAndroid: Platform.OS === 'android',
        });

        if (isEquivalent) {
          result.unchanged.push(desired.identifier);
        } else {
          // Changed representation / stale metadata: Cancel old first, then schedule replacement
          let cancelOk = false;
          try {
            await this.adapter.cancelScheduledNotification(desired.identifier);
            cancelOk = true;
          } catch (err) {
            result.failed.push({ identifier: desired.identifier, action: 'CANCEL', error: err });
          }

          if (cancelOk) {
            try {
              await this.adapter.scheduleNotification(desired);
              result.scheduled.push(desired.identifier);
            } catch (err) {
              result.failed.push({ identifier: desired.identifier, action: 'SCHEDULE', error: err });
            }
          }
        }
      } else {
        // Missing desired -> schedule
        try {
          await this.adapter.scheduleNotification(desired);
          result.scheduled.push(desired.identifier);
        } catch (err) {
          result.failed.push({ identifier: desired.identifier, action: 'SCHEDULE', error: err });
        }
      }
    }

    // 11. Stale current requests (exist in OS, but not in desired)
    for (const current of managedList) {
      // Invariant: SNOOZE notifications are active until fired/completed; DO NOT cancel during reconcile!
      if (current.identifier.includes(':snooze')) {
        continue;
      }
      // Daily journal reminder is managed independently
      if (current.identifier === 'journal-reminder:daily') {
        continue;
      }

      if (!desiredMap.has(current.identifier)) {
        try {
          await this.adapter.cancelScheduledNotification(current.identifier);
          result.cancelled.push(current.identifier);
        } catch (err) {
          result.failed.push({ identifier: current.identifier, action: 'CANCEL', error: err });
        }
      }
    }

    return result;
  }
}

export const notificationReconciliationService = new NotificationReconciliationService();
