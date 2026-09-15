# Notifications

**Status:** Source of truth for notification architecture  
**Updated:** 2026-09-14 (Rev 2 — architecture review)  
**Implements:** MASTER_PRODUCT_SPEC §29  
**Library:** `expo-notifications`, `expo-task-manager`

---

## 1. Purpose

Notifications support productivity and prayer awareness. The app is NOT primarily an adhan app (§29.1).

---

## 2. Notification Categories

| Category | Channel ID | Description | Default |
|---|---|---|---|
| Prayer Alerts | `prayer_alerts` | "Asr has begun" | Enabled |
| Task Reminders | `task_reminders` | "Soccer begins at 6:00 PM" | Per-task opt-in |
| Prayer-Relative Reminders | `task_reminders` | "Maghrib in 28 minutes — Shower" | Per-task opt-in |
| Worship Suggestions | `worship` | "White Days fasting tomorrow" | Enabled if worship enabled |
| Islamic Events | `islamic_events` | "Ramadan begins tomorrow" | Enabled |
| Daily Summary | `daily_summary` | "You have 5 tasks today" | Optional |

Each category maps to an Android notification channel for user-level control.

---

## 3. Notification Data Model

```typescript
interface ScheduledNotification {
  id: string;                        // UUID
  taskOccurrenceId: string | null;   // FK to task_occurrences, null for prayer alerts
  type: NotificationType;
  title: string;
  body: string;
  scheduledFor: DateTime;            // Absolute time to fire
  channelId: string;                 // Android notification channel
  platformNotifId: string | null;    // OS-assigned ID after scheduling
  status: 'SCHEDULED' | 'FIRED' | 'CANCELLED';
}

type NotificationType =
  | 'PRAYER_ALERT'
  | 'TASK_REMINDER'
  | 'WORSHIP_REMINDER'
  | 'ISLAMIC_EVENT'
  | 'DAILY_SUMMARY';
```

---

## 4. Scheduling Logic

### 4.1 Prayer Alerts

```typescript
function schedulePrayerAlerts(
  prayerTimes: PrayerTimesResult,
  enabled: boolean
): ScheduledNotification[] {
  if (!enabled) return [];
  
  const prayers: Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];
  
  return prayers.map(prayer => ({
    type: 'PRAYER_ALERT',
    title: `${formatPrayerName(prayer)} has begun`,
    body: `${formatTime(prayerTimes[prayer.toLowerCase()])}`,
    scheduledFor: prayerTimes[prayer.toLowerCase()],
    channelId: 'prayer_alerts',
  }));
}
```

### 4.2 Task Reminders

```typescript
function scheduleTaskReminder(
  occurrence: ResolvedOccurrence,
  reminderRule: ReminderRule
): ScheduledNotification | null {
  if (!occurrence.calculatedTime) return null; // Anytime Today — no timed reminder
  
  const reminderTime = occurrence.calculatedTime.minus({ minutes: reminderRule.minutesBefore });
  
  // Don't schedule if reminder time is in the past
  if (reminderTime <= DateTime.now()) return null;
  
  return {
    type: 'TASK_REMINDER',
    title: occurrence.title,
    body: buildReminderBody(occurrence, reminderRule),
    scheduledFor: reminderTime,
    channelId: 'task_reminders',
    taskOccurrenceId: occurrence.occurrenceId,
  };
}

function buildReminderBody(occ: ResolvedOccurrence, rule: ReminderRule): string {
  if (rule.minutesBefore === 0) {
    return `Now — ${formatTime(occ.calculatedTime)}`;
  }
  return `In ${rule.minutesBefore} minutes — ${formatTime(occ.calculatedTime)}`;
}
```

### 4.3 Reminder Presets

```typescript
interface ReminderRule {
  type: 'NONE' | 'AT_TIME' | 'BEFORE';
  minutesBefore: number;   // 0 = at time, 5, 10, 15, 30, custom
}

const REMINDER_PRESETS: { label: string; rule: ReminderRule }[] = [
  { label: 'None',           rule: { type: 'NONE', minutesBefore: 0 } },
  { label: 'At time',        rule: { type: 'AT_TIME', minutesBefore: 0 } },
  { label: '5 min before',   rule: { type: 'BEFORE', minutesBefore: 5 } },
  { label: '10 min before',  rule: { type: 'BEFORE', minutesBefore: 10 } },
  { label: '15 min before',  rule: { type: 'BEFORE', minutesBefore: 15 } },
  { label: '30 min before',  rule: { type: 'BEFORE', minutesBefore: 30 } },
  // Custom handled separately
];
```

---

## 5. Context-Aware Reminders (§29.5)

Potential enhanced notification copy:

```text
"Maghrib in 28 minutes — Soccer begins at 6:00 PM"
"You have 3 tasks before Maghrib"
"Asr has begun — Read Qur'an (Fajr → Asr) ends now"
```

Advanced context-aware reminders are a Premium candidate. For v1, use straightforward copy.

---

## 6. Rescheduling Engine

Notifications must be resilient to changes (§29.6). The `NotificationScheduler` service handles this:

```typescript
class NotificationScheduler {
  /**
   * Cancel all existing notifications and reschedule based on current state.
   * Called when any relevant input changes.
   */
  async rescheduleAll(context: NotificationContext): Promise<void> {
    // 1. Cancel all currently scheduled notifications
    await this.cancelAll();
    
    // 2. Get prayer times for today and tomorrow
    const todayPrayers = context.prayerTimes;
    const tomorrowPrayers = context.tomorrowPrayerTimes;
    
    // 3. Schedule prayer alerts (today's remaining + tomorrow's)
    if (context.prayerAlertsEnabled) {
      await this.schedulePrayerAlerts(todayPrayers, tomorrowPrayers, context.now);
    }
    
    // 4. Schedule task reminders for today's and tomorrow's occurrences
    for (const occurrence of context.occurrences) {
      if (occurrence.reminderRule && occurrence.status === 'PENDING') {
        await this.scheduleTaskReminder(occurrence);
      }
    }
    
    // 5. Schedule worship reminders
    // 6. Schedule Islamic event notifications
    
    // 7. Record all scheduled notifications in DB for tracking
    await this.recordScheduledNotifications();
  }
  
  /**
   * Incrementally update: only reschedule notifications affected by a specific change.
   */
  async rescheduleForTask(taskOccurrenceId: string): Promise<void> {
    await this.cancelForOccurrence(taskOccurrenceId);
    const occurrence = await this.getOccurrence(taskOccurrenceId);
    if (occurrence.reminderRule && occurrence.status === 'PENDING') {
      await this.scheduleTaskReminder(occurrence);
    }
  }
}
```

### 6.1 Rescheduling Triggers

| Trigger | Action |
|---|---|
| Prayer times change (location/method/adjustment) | Reschedule all prayer alerts + prayer-relative task reminders |
| Location change | Full reschedule (prayer times change) |
| Timezone change | Full reschedule |
| DST transition | Full reschedule |
| Task created | Schedule reminder for new task |
| Task edited (time changed) | Reschedule that task's reminder |
| Task completed/cancelled | Cancel that task's reminder |
| Recurrence edited | Reschedule affected series' reminders |
| Device reboot | OS handles re-registration (Android `RECEIVE_BOOT_COMPLETED`) |
| App opened after being closed | Verify and repair scheduled notifications |

### 6.2 Background Rescheduling

```typescript
// Registered at app top level (outside React tree)
import * as TaskManager from 'expo-task-manager';

TaskManager.defineTask('NOTIFICATION_RESCHEDULE', async () => {
  // This runs when the app receives a background event
  // (e.g., significant location change, midnight transition)
  
  const context = await buildNotificationContext();
  const scheduler = new NotificationScheduler();
  await scheduler.rescheduleAll(context);
  
  return BackgroundFetch.BackgroundFetchResult.NewData;
});
```

---

## 7. Platform-Specific Setup

### 7.1 Android

```json
// app.json
{
  "expo": {
    "android": {
      "permissions": [
        "POST_NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM",
        "RECEIVE_BOOT_COMPLETED"
      ]
    }
  }
}
```

Notification channels created on first launch:

```typescript
async function createNotificationChannels(): Promise<void> {
  await Notifications.setNotificationChannelAsync('prayer_alerts', {
    name: 'Prayer Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'prayer_alert.wav',
    vibrationPattern: [0, 200, 100, 200],
  });
  
  await Notifications.setNotificationChannelAsync('task_reminders', {
    name: 'Task Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  
  await Notifications.setNotificationChannelAsync('worship', {
    name: 'Worship Suggestions',
    importance: Notifications.AndroidImportance.LOW,
  });
  
  await Notifications.setNotificationChannelAsync('islamic_events', {
    name: 'Islamic Events',
    importance: Notifications.AndroidImportance.LOW,
  });
  
  await Notifications.setNotificationChannelAsync('daily_summary', {
    name: 'Daily Summary',
    importance: Notifications.AndroidImportance.LOW,
  });
}
```

### 7.2 iOS

- Uses `UNUserNotificationCenter` via `expo-notifications`
- Categories with actions (e.g., "Mark Complete" from notification)
- Provisional authorization available for quiet notifications

---

## 8. Notification Actions

From notification, user can:
- Tap → opens the app to the relevant task/prayer tab
- "Mark Complete" (action button) → completes the task occurrence
- Dismiss → no action

```typescript
Notifications.setNotificationCategoryAsync('task_reminder', [
  {
    identifier: 'MARK_COMPLETE',
    buttonTitle: 'Done ✓',
    options: { isDestructive: false, isAuthenticationRequired: false },
  },
]);
```

---

## 9. Permission Handling

```typescript
async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') return true;
  
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
```

If permission denied:
- Show informative prompt explaining why notifications are useful
- Do NOT block app functionality
- Offer to re-prompt later
- Link to system settings

---

## 10. Testing

1. Prayer alert scheduled at correct times
2. Task reminder fires at correct offset before task time
3. Rescheduling after location change updates all notifications
4. Rescheduling after task edit updates only affected notification
5. Completing a task cancels its pending reminder
6. Device reboot preserves scheduled notifications (real device test)
7. DST transition reschedules correctly
8. Multiple reminders for same time don't duplicate
9. Notification copy is accurate and non-punitive
10. Android channels created correctly
