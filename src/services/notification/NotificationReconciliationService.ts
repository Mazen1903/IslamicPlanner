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
import { deriveNotificationTrigger } from '@/domain/notification/notificationTrigger';
import { isNotificationEquivalent } from '@/domain/notification/notificationEquality';
import type { NotificationSchedulerAdapterAPI } from './NotificationSchedulerAdapter';
import { notificationSchedulerAdapter as defaultAdapter } from './NotificationSchedulerAdapter';
import type { NotificationChannelManagerAPI } from './NotificationChannelManager';
import { notificationChannelManager as defaultChannelManager } from './NotificationChannelManager';

export interface Clock {
  nowMs(): number;
}

export class NotificationReconciliationService {
  private drainPromise: Promise<NotificationReconcileResult> | null = null;
  private rerunRequested = false;

  constructor(
    private readonly occRepo: TaskOccurrenceRepository = defaultOccRepo,
    private readonly defRepo: TaskDefinitionRepository = defaultDefRepo,
    private readonly adapter: NotificationSchedulerAdapterAPI = defaultAdapter,
    private readonly channelManager: NotificationChannelManagerAPI = defaultChannelManager,
    private readonly clock: Clock = { nowMs: () => Date.now() }
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
   * Best-effort and idempotent. Never throws or fails callers.
   */
  async cancelOccurrenceReminder(occurrenceId: string): Promise<void> {
    try {
      const id = buildNotificationId(occurrenceId);
      await this.adapter.cancelScheduledNotification(id);
    } catch {
      // Best-effort; next reconcile will sweep if any residual exists
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
        const appOwned = scheduledList.filter(s => isAppOwnedNotificationId(s.identifier));
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

    // 2. Ensure Android channel lazily
    await this.channelManager.ensureChannel();

    // 3. Query all materialized PENDING occurrences
    let pendingOccurrences;
    try {
      pendingOccurrences = await this.occRepo.findAllMaterializedPending();
    } catch (err) {
      result.failed.push({ identifier: '*', action: 'SCHEDULE', error: err });
      return result;
    }

    if (pendingOccurrences.length === 0) {
      // Cancel all existing app-owned notifications since there are no pending tasks
      try {
        const scheduledList = await this.adapter.getAllScheduledNotifications();
        const appOwned = scheduledList.filter(s => isAppOwnedNotificationId(s.identifier));
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

    // 4. Batch load referenced TaskDefinitions
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

    // 5. Derive eligible desired notifications
    const desiredList: DesiredNotification[] = [];

    for (const occ of pendingOccurrences) {
      const def = defMap.get(occ.taskDefinitionId);
      if (!def) {
        continue;
      }

      // Legacy ANYTIME_TODAY tasks with leftover reminderRule are ignored by reconciler
      if (def.scheduleType === 'ANYTIME_TODAY') {
        continue;
      }

      if (!def.reminderRule || typeof def.reminderRule.offsetMinutes !== 'number') {
        continue;
      }

      const triggerAtMs = deriveNotificationTrigger(occ, def, nowMs);
      if (triggerAtMs === null) {
        // Check if anchor existed but trigger was in the past
        let anchorIso: string | null = null;
        if (def.scheduleType === 'EXACT_TIME' || def.scheduleType === 'PRAYER_RELATIVE') {
          anchorIso = occ.calculatedStartTime;
        } else if (def.scheduleType === 'PRAYER_WINDOW') {
          anchorIso = occ.windowStart;
        }

        if (anchorIso) {
          const anchorMs = Date.parse(anchorIso);
          if (!Number.isNaN(anchorMs)) {
            const potentialTrigger = anchorMs + Math.round(def.reminderRule.offsetMinutes * 60_000);
            if (potentialTrigger <= nowMs) {
              result.skippedPast.push(buildNotificationId(occ.id));
            }
          }
        }
        continue;
      }

      const identifier = buildNotificationId(occ.id);
      desiredList.push({
        identifier,
        occurrenceId: occ.id,
        taskDefinitionId: def.id,
        title: def.title,
        triggerAtMs,
        channelId: NOTIFICATION_CHANNEL_ID,
        data: {
          kind: 'task-reminder',
          occurrenceId: occ.id,
          taskDefinitionId: def.id,
          reminderSlot: NOTIFICATION_DEFAULT_SLOT,
          triggerAtMs,
          payloadVersion: NOTIFICATION_PAYLOAD_VERSION,
        },
      });
    }

    // 6. Sort by triggerAtMs ascending
    desiredList.sort((a, b) => a.triggerAtMs - b.triggerAtMs);

    // 7. Cap at MAX_SCHEDULED_TASK_REMINDERS = 48
    const cappedDesired = desiredList.slice(0, MAX_SCHEDULED_TASK_REMINDERS);
    for (const overflow of desiredList.slice(MAX_SCHEDULED_TASK_REMINDERS)) {
      result.skippedCapacity.push(overflow.identifier);
    }

    // 8. Fetch current OS scheduled requests
    let scheduledList;
    try {
      scheduledList = await this.adapter.getAllScheduledNotifications();
    } catch (err) {
      result.failed.push({ identifier: '*', action: 'SCHEDULE', error: err });
      return result;
    }

    // 9. Filter app-owned notifications only
    const appOwned = scheduledList.filter(s => isAppOwnedNotificationId(s.identifier));
    const currentMap = new Map(appOwned.map(s => [s.identifier, s]));
    const desiredMap = new Map(cappedDesired.map(d => [d.identifier, d]));

    // 10. Diff desired vs current
    for (const desired of cappedDesired) {
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
          // If cancellation failed: DO NOT schedule replacement (retry next reconcile)
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
    for (const current of appOwned) {
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
