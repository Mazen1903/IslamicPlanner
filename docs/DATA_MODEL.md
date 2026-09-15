# Data Model

**Status:** Source of truth for database schema and domain types  
**Updated:** 2026-09-14 (Rev 3 — architecture revision 3)  
**Implements:** MASTER_PRODUCT_SPEC §40, §42, §43, §58  
**ORM:** Drizzle ORM + expo-sqlite

---

## 1. Overview

All data is stored locally in SQLite via `expo-sqlite` with Drizzle ORM providing type-safe schema definitions and queries. The database is **not** application-level encrypted; it relies on OS-level storage protections (iOS Data Protection, Android app sandbox). See TECHNICAL_ARCHITECTURE.md §13 for details.

---

## 2. Schema

### 2.1 task_definitions

Stores the authoritative scheduling recipe. Occurrences are derived from this.

```typescript
export const taskDefinitions = sqliteTable('task_definitions', {
  id:                text('id').primaryKey(),                          // UUID v4
  title:             text('title').notNull(),
  description:       text('description'),
  source:            text('source').notNull().default('USER'),         // 'USER' | 'WORSHIP' | 'ROUTINE'
  worshipItemKey:    text('worship_item_key'),                         // FK to worship catalog key, null for user tasks
  scheduleType:      text('schedule_type').notNull(),                  // 'EXACT_TIME' | 'PRAYER_RELATIVE' | 'PRAYER_WINDOW' | 'ANYTIME_TODAY'
  scheduleData:      text('schedule_data').notNull(),                  // JSON — type-specific payload, NO "type" field
  recurrenceRule:    text('recurrence_rule'),                           // RRULE string for Gregorian recurrence
  hijriRecurrence:   text('hijri_recurrence'),                         // JSON — HijriRecurrenceData
  recurrenceEnd:     text('recurrence_end'),                           // ISO date or null
  // --- Recurring Series Identity ---
  seriesId:          text('series_id').notNull(),                       // UUID — stable logical series identity.
                                                                        //   All versions of the same recurring series share this.
                                                                        //   Non-recurring tasks: seriesId === id.
  seriesVersion:     integer('series_version').notNull().default(1),   // Bumped on "this and future" edits
  effectiveFromDate: text('effective_from_date'),                       // ISO date — first date this version applies (inclusive).
                                                                        //   Original version: creation date. Split version: split date.
  effectiveToDate:   text('effective_to_date'),                         // ISO date or null — last date this version applies (inclusive).
                                                                        //   null = until recurrenceEnd or forever.
                                                                        //   Set when "this and future" splits the series.
  reminderRule:      text('reminder_rule'),                             // JSON — ReminderRule
  priority:          text('priority').notNull().default('NORMAL'),      // 'NORMAL' | 'IMPORTANT'
  estimatedMinutes:  integer('estimated_minutes'),
  notes:             text('notes'),
  tags:              text('tags'),                                      // JSON string[]
  subtasks:          text('subtasks'),                                  // JSON SubtaskData[]
  isActive:          integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt:         text('created_at').notNull(),                      // ISO 8601
  updatedAt:         text('updated_at').notNull(),
}, (table) => ({
  idxSeriesId: index('idx_series_id').on(table.seriesId),
}));
```

### 2.2 task_occurrences

Stores one row per task per date. Derived fields are always recomputed; user-state fields are preserved across rematerialization.

```typescript
export const taskOccurrences = sqliteTable('task_occurrences', {
  id:                      text('id').primaryKey(),                    // UUID v4
  taskDefinitionId:        text('task_definition_id').notNull()
                             .references(() => taskDefinitions.id, { onDelete: 'cascade' }),
  seriesId:                text('series_id').notNull(),                 // Mirrors definition's seriesId for efficient series queries
  localDate:               text('local_date').notNull(),               // 'YYYY-MM-DD'
  planningDayKey:          text('planning_day_key').notNull(),          // 'YYYY-MM-DD'
  timezone:                text('timezone').notNull(),                  // IANA
  // --- Derived fields (overwritten on every rematerialization) ---
  calculatedStartTime:     text('calculated_start_time'),              // ISO 8601 or null
  calculatedPrayerSection: text('calculated_prayer_section'),          // Prayer label or null
  eligiblePrayerSections:  text('eligible_prayer_sections'),           // JSON Prayer[] for window tasks
  wallClockResolution:     text('wall_clock_resolution'),              // 'NORMAL' | 'SPRING_FORWARD_SHIFTED' | 'FALL_BACK_FIRST' | null
  // --- User-state fields (preserved across rematerialization) ---
  status:                  text('status').notNull().default('PENDING'),// 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED'
  completedAt:             text('completed_at'),
  missedAt:                text('missed_at'),
  overrideData:            text('override_data'),                      // JSON — per-occurrence user overrides
}, (table) => ({
  uniqueDefDate: unique().on(table.taskDefinitionId, table.localDate),
  idxPlanningDay: index('idx_planning_day').on(table.planningDayKey),
  idxDate: index('idx_date').on(table.localDate),
}));
```

### 2.3 user_settings

```typescript
export const userSettings = sqliteTable('user_settings', {
  id:                         text('id').primaryKey().default('default'),
  // --- Location ---
  locationMode:               text('location_mode').notNull().default('AUTO'),    // 'AUTO' | 'MANUAL'
  manualLatitude:              real('manual_latitude'),
  manualLongitude:             real('manual_longitude'),
  manualLocationName:          text('manual_location_name'),
  lastKnownTimezone:           text('last_known_timezone'),
  // --- Prayer Calculation ---
  calculationMethod:           text('calculation_method').notNull().default('MWL'),
  asrMethod:                   text('asr_method').notNull().default('SHAFI'),
  highLatitudeRule:             text('high_latitude_rule').notNull().default('AUTO'),
  polarCircleResolution:       text('polar_circle_resolution').notNull().default('AQRAB_YAUM'),
  prayerAdjustments:           text('prayer_adjustments').notNull().default('{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}'),
  // --- Planning Day ---
  planningDayStart:            text('planning_day_start').notNull().default('FAJR'), // 'FAJR' | 'MIDNIGHT' | 'HH:mm'
  // --- Hijri Calendar ---
  hijriBaseMethod:             text('hijri_base_method').notNull().default('UMM_AL_QURA'),
  hijriGlobalAdjustment:       integer('hijri_global_adjustment').notNull().default(0), // -2 to +2
  // --- Worship ---
  worshipSuggestionsEnabled:   integer('worship_suggestions_enabled', { mode: 'boolean' }).notNull().default(true),
  // --- Notifications ---
  prayerAlertsEnabled:         integer('prayer_alerts_enabled', { mode: 'boolean' }).notNull().default(true),
  // --- Appearance ---
  themeMode:                   text('theme_mode').notNull().default('SYSTEM'),    // 'LIGHT' | 'DARK' | 'SYSTEM'
  // --- Premium ---
  isPremium:                   integer('is_premium', { mode: 'boolean' }).notNull().default(false),
  // --- Metadata ---
  onboardingCompleted:         integer('onboarding_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt:                   text('created_at').notNull(),
  updatedAt:                   text('updated_at').notNull(),
});
```

### 2.4 hijri_month_overrides

Per-Hijri-month adjustments for moon-sighting variation. Historical overrides are preserved indefinitely.

```typescript
export const hijriMonthOverrides = sqliteTable('hijri_month_overrides', {
  id:               text('id').primaryKey(),                          // UUID v4
  hijriYear:        integer('hijri_year').notNull(),                  // e.g., 1448
  hijriMonth:       integer('hijri_month').notNull(),                 // 1-12
  adjustmentDays:   integer('adjustment_days').notNull(),             // typically -1, 0, or +1
  createdAt:        text('created_at').notNull(),
  updatedAt:        text('updated_at').notNull(),
}, (table) => ({
  uniqueYearMonth: unique().on(table.hijriYear, table.hijriMonth),
}));
```

**Usage:** The `HijriService` converts a Gregorian date to a base Hijri date (via `hijriBaseMethod`), applies `hijriGlobalAdjustment`, then checks `hijri_month_overrides` for a year+month-specific override. If an override exists, its `adjustmentDays` is applied **instead of** the global adjustment for that specific month.

### 2.5 worship_item_settings

```typescript
export const worshipItemSettings = sqliteTable('worship_item_settings', {
  id:               text('id').primaryKey(),                          // UUID v4
  worshipItemKey:   text('worship_item_key').notNull().unique(),
  isEnabled:        integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt:        text('created_at').notNull(),
  updatedAt:        text('updated_at').notNull(),
});
```

### 2.6 prayer_cache

```typescript
export const prayerCache = sqliteTable('prayer_cache', {
  fingerprint:      text('fingerprint').primaryKey(),                 // deterministic hash of all inputs
  date:             text('date').notNull(),
  resultJson:       text('result_json').notNull(),                    // serialized PrayerTimesResult
  cachedAt:         text('cached_at').notNull(),
});
```

The `fingerprint` column stores the output of `PrayerEngine.calculationConfigFingerprint()`, which includes: date, latitude (2dp), longitude (2dp), timezone, calculation method, Asr method, high-latitude rule, polar-circle resolution, and all 6 manual adjustment values. Changing any input produces a different fingerprint — stale data is never reused.

### 2.7 notification_schedule

```typescript
export const notificationSchedule = sqliteTable('notification_schedule', {
  id:                  text('id').primaryKey(),
  taskOccurrenceId:    text('task_occurrence_id')
                         .references(() => taskOccurrences.id, { onDelete: 'cascade' }),
  type:                text('type').notNull(),                        // NotificationType
  title:               text('title').notNull(),
  body:                text('body').notNull(),
  scheduledFor:        text('scheduled_for').notNull(),               // ISO 8601
  channelId:           text('channel_id').notNull(),
  platformNotifId:     text('platform_notif_id'),
  status:              text('status').notNull().default('SCHEDULED'), // 'SCHEDULED' | 'FIRED' | 'CANCELLED'
  createdAt:           text('created_at').notNull(),
});
```

---

## 3. Schedule Data Shapes

The `scheduleType` column is the **sole discriminator**. The `scheduleData` JSON stores **only the type-specific payload** — it does NOT contain a redundant `type` field.

### EXACT_TIME
```json
{ "localTime": "18:00" }
```

### PRAYER_RELATIVE
```json
{
  "anchorPrayer": "MAGHRIB",
  "direction": "AFTER",
  "offsetMinutes": 30
}
```

### PRAYER_WINDOW
```json
{
  "startPrayer": "FAJR",
  "endPrayer": "ASR"
}
```

### ANYTIME_TODAY
```json
{}
```

**Canonical rule:** There is exactly one source of truth for the schedule type: the `scheduleType` column. The `scheduleData` JSON never independently stores a type discriminator. Disagreement between these values is structurally impossible because only one value exists.

---

## 4. Hijri Recurrence Data Shape

```json
{
  "hijriDays": [13, 14, 15],
  "hijriMonths": null,
  "description": "White Days"
}
```

Alternative shapes:
```json
{ "hijriDays": [9, 10], "hijriMonths": [1], "description": "Ashura" }
{ "hijriDays": null, "hijriMonths": [9], "description": "Ramadan days" }
{ "hijriDays": [2,3,4,5,6,7], "hijriMonths": [10], "description": "Shawwal 6" }
```

All Hijri recurrence is resolved through the `HijriService`, which applies the effective calendar (base method + global adjustment + per-month overrides).

---

## 4A. Recurring Series Operations

A recurring series is identified by a stable `seriesId` (UUID) shared across all `TaskDefinition` versions in the series. Non-recurring tasks have `seriesId === id`.

### 4A.1 Series Identity Model

```text
┌─────────────────────────────────────────────────────────────┐
│                    Logical Series (seriesId)                  │
│                                                               │
│  ┌──────────────────────────────────┐  ┌────────────────────┐│
│  │ Definition Version 1             │  │ Definition Version 2││
│  │ seriesVersion: 1                 │  │ seriesVersion: 2    ││
│  │ effectiveFromDate: 2026-01-01    │  │ effectiveFromDate:  ││
│  │ effectiveToDate:   2026-06-14    │  │   2026-06-15        ││
│  │ (closed by "this and future")    │  │ effectiveToDate:    ││
│  └──────────────────────────────────┘  │   null              ││
│                                         └────────────────────┘│
│  Both share the same seriesId but have non-overlapping        │
│  effective date ranges.                                       │
└─────────────────────────────────────────────────────────────┘
```

### 4A.2 Series Operations

| Operation | Behavior | Data Changes |
|---|---|---|
| **A. Edit this occurrence** | Write override data to `overrideData` JSON on the existing `TaskOccurrence`. Definition unchanged. | `occurrence.overrideData = { ...changes }` |
| **B. Edit this and future** | Close the current definition version at `splitDate - 1`. Create a new definition with the same `seriesId`, incremented `seriesVersion`, `effectiveFromDate = splitDate`, `effectiveToDate = null`. Rematerialize from `splitDate` onward. | `oldDef.effectiveToDate = splitDate - 1`; new `TaskDefinition` with same `seriesId` |
| **C. Edit entire series** | Update the active definition(s) in place. Rematerialize all non-completed, non-cancelled occurrences. Completed/missed occurrences retain their status but may have their derived fields (prayer section, time) updated. | `definition.{field} = newValue`; rematerialize |
| **D. Delete/cancel one occurrence** | Set `occurrence.status = 'CANCELLED'`. Definition unchanged. The cancelled occurrence persists as an exception record. | `occurrence.status = 'CANCELLED'` |
| **E. Delete future occurrences** | Set the active definition's `recurrenceEnd = today` (or `effectiveToDate = today`). Cancel all future materialized occurrences. | `definition.recurrenceEnd = today`; cancel future occurrences |
| **F. Delete entire series** | Deactivate all definitions with matching `seriesId` (`isActive = false`). Historical occurrences (completed/missed) are **retained** for data integrity. Pending/future occurrences are cancelled. | `definition.isActive = false` for all versions; cancel pending occurrences |

### 4A.3 Uniqueness After Split

The composite key `(taskDefinitionId, localDate)` remains unique after a "this and future" split because:
- The split creates a **new** `taskDefinitionId` (UUID)
- The predecessor definition's `effectiveToDate` is set to `splitDate - 1`
- The new definition's `effectiveFromDate` is set to `splitDate`
- `recurrenceEngine.occursOn()` checks `effectiveFromDate`/`effectiveToDate` bounds
- No two definitions with overlapping date ranges can produce occurrences for the same `localDate`

### 4A.4 Cloud Sync Compatibility

The series model is designed for eventual CRDT-friendly sync:
- `seriesId` is globally unique (UUID) — identifies the logical series across devices
- `seriesVersion` is monotonically increasing — enables ordering of concurrent edits
- `effectiveFromDate`/`effectiveToDate` ranges are non-overlapping — enables deterministic merge
- Historical occurrences are never deleted — enables full audit trail
- `isActive` flag enables soft-delete without data loss

---

## 5. Migration Strategy

- Drizzle generates SQL migration files from schema changes
- Migrations stored in `src/data/migrations/`
- `expo-sqlite` executes migrations on app open before any queries
- Schema version tracked automatically by Drizzle
- Backward compatibility: new nullable columns with defaults; never remove columns in a minor version

---

## 6. TypeScript Domain Types

### 6.1 Schedule Data (canonical typed mapping)

```typescript
type ScheduleType = 'EXACT_TIME' | 'PRAYER_RELATIVE' | 'PRAYER_WINDOW' | 'ANYTIME_TODAY';

/** Maps scheduleType column value → scheduleData JSON shape */
type ScheduleDataMap = {
  EXACT_TIME:      ExactTimeData;
  PRAYER_RELATIVE: PrayerRelativeData;
  PRAYER_WINDOW:   PrayerWindowData;
  ANYTIME_TODAY:   Record<string, never>;
};

type ScheduleDataFor<T extends ScheduleType> = ScheduleDataMap[T];

interface ExactTimeData {
  localTime: string;  // "HH:mm"
}

interface PrayerRelativeData {
  anchorPrayer: Prayer;
  direction: RelativeDirection;
  offsetMinutes: number;
}

interface PrayerWindowData {
  startPrayer: Prayer;
  endPrayer: Prayer;
}

type RelativeDirection = 'BEFORE' | 'AFTER';
```

### 6.2 Repository Boundary Validation

When reading from SQLite, the raw JSON must be validated at the repository boundary:

```typescript
function parseScheduleData<T extends ScheduleType>(
  scheduleType: T,
  rawJson: string
): ScheduleDataFor<T> {
  const parsed = JSON.parse(rawJson);
  // Runtime validation based on scheduleType
  switch (scheduleType) {
    case 'EXACT_TIME':
      assertString(parsed.localTime, 'localTime');
      break;
    case 'PRAYER_RELATIVE':
      assertPrayer(parsed.anchorPrayer, 'anchorPrayer');
      assertDirection(parsed.direction, 'direction');
      assertNumber(parsed.offsetMinutes, 'offsetMinutes');
      break;
    case 'PRAYER_WINDOW':
      assertPrayer(parsed.startPrayer, 'startPrayer');
      assertPrayer(parsed.endPrayer, 'endPrayer');
      break;
    case 'ANYTIME_TODAY':
      // No payload to validate
      break;
    default:
      throw new DataIntegrityError(`Unknown schedule type: ${scheduleType}`);
  }
  return parsed as ScheduleDataFor<T>;
}
```

### 6.3 Prayer Types

```typescript
type Prayer = 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA';

const PRAYER_ORDER: Prayer[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];
```

### 6.4 Hijri Calendar Types

```typescript
interface HijriDate {
  year: number;
  month: number;
  day: number;
}

interface HijriCalendarConfig {
  baseMethod: 'UMM_AL_QURA' | 'CALCULATED';
  globalAdjustment: number;  // -2 to +2
}

interface HijriMonthOverride {
  hijriYear: number;
  hijriMonth: number;
  adjustmentDays: number;
}

interface EffectiveHijriDate {
  date: HijriDate;
  adjustmentApplied: number;
  source: 'GLOBAL' | 'MONTH_OVERRIDE';
}
```

### 6.5 WallClockResolution

```typescript
interface WallClockResolution {
  resolvedTime: DateTime;
  resolution: 'NORMAL' | 'SPRING_FORWARD_SHIFTED' | 'FALL_BACK_FIRST';
}
```

### 6.6 Resolved Occurrence (View Model)

```typescript
interface ResolvedOccurrence {
  occurrenceId: string;
  taskDefinitionId: string;
  title: string;
  description: string | null;
  source: 'USER' | 'WORSHIP' | 'ROUTINE';
  scheduleType: ScheduleType;
  parsedScheduleData: ScheduleDataFor<ScheduleType>;
  localDate: string;
  planningDayKey: string;
  timezone: string;
  calculatedTime: DateTime | null;
  prayerSection: Prayer | null;
  eligibleSections: Prayer[];
  wallClockResolution: WallClockResolution | null;
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  completedAt: DateTime | null;
  missedAt: DateTime | null;
  isOverdue: boolean;               // Always derived at render time
  overdueMinutes: number | null;    // Always derived at render time
  priority: 'NORMAL' | 'IMPORTANT';
  estimatedMinutes: number | null;
  reminderRule: ReminderRule | null;
  tags: string[];
  subtasks: SubtaskData[];
  notes: string | null;
}
```

### 6.7 PrayerPeriodInstance and PrayerTimeline

```typescript
interface PrayerPeriodInstance {
  prayer: Prayer;
  start: DateTime;
  end: DateTime;
  fullPeriodStart: DateTime;
  fullPeriodEnd: DateTime;
  sourceDate: string;
}

interface PrayerTimeline {
  periods: PrayerPeriodInstance[];
  findPeriod(time: DateTime): PrayerPeriodInstance;
}
```

### 6.8 PlanningDay

```typescript
interface PlanningDay {
  key: string;               // 'YYYY-MM-DD'
  start: DateTime;
  end: DateTime;
  periods: PrayerPeriodInstance[];  // Clipped to planning day boundary
}
```

---

## 7. Data Invariants

1. Every `TaskDefinition` has exactly one `scheduleType` and a `scheduleData` JSON whose shape conforms to `ScheduleDataMap[scheduleType]`. There is no independent `type` field inside `scheduleData`.
2. Every `TaskOccurrence` references a valid `TaskDefinition`.
3. `(taskDefinitionId, localDate)` is unique — no duplicate occurrences per task per date.
4. `status` transitions: PENDING → COMPLETED, PENDING → MISSED, PENDING → CANCELLED. No reverse transitions.
5. `calculatedStartTime`, `calculatedPrayerSection`, `eligiblePrayerSections`, `wallClockResolution` are always recomputed on rematerialization — they are never authoritative.
6. `status`, `completedAt`, `missedAt`, `overrideData` are user state — they are never overwritten by rematerialization (except PENDING status may become MISSED by the missed-task engine).
7. `prayerCache.fingerprint` is deterministic: same inputs → same fingerprint. Different inputs → different fingerprint. Stale cache entries are never returned.
8. `hijri_month_overrides` are keyed by (hijriYear, hijriMonth). Only one override per year+month. Historical overrides are never auto-deleted.
9. UUIDs v4 used for all `id` columns.
10. `seriesId` is stable across all `TaskDefinition` versions of the same recurring series. Non-recurring tasks have `seriesId === id`.
11. `effectiveFromDate`/`effectiveToDate` ranges are non-overlapping across definitions sharing the same `seriesId`. No two active definitions with the same `seriesId` may produce occurrences for the same `localDate`.
12. `planningDayKey` is derived from the task's resolved temporal placement (see SCHEDULING_ENGINE.md §11.3), never from the recurrence date directly (except for ANYTIME_TODAY where the recurrence date equals the planning day key by definition).
13. Deleting an entire series deactivates definitions (`isActive = false`) and cancels pending occurrences but **never deletes** completed or missed historical occurrences.
