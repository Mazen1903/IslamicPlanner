import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
  check,
} from 'drizzle-orm/sqlite-core';

// ==========================================
// 2.1 task_definitions
// ==========================================
export const taskDefinitions = sqliteTable(
  'task_definitions',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    startDate: text('start_date').notNull(), // 'YYYY-MM-DD' — civil schedule / recurrence seed date
    source: text('source').notNull().default('USER'),
    worshipItemKey: text('worship_item_key'),
    scheduleType: text('schedule_type').notNull(),
    scheduleData: text('schedule_data').notNull(),
    recurrenceRule: text('recurrence_rule'),
    hijriRecurrence: text('hijri_recurrence'),
    recurrenceEnd: text('recurrence_end'),
    seriesId: text('series_id').notNull(),
    seriesVersion: integer('series_version').notNull().default(1),
    effectiveFromDate: text('effective_from_date'),
    effectiveToDate: text('effective_to_date'),
    reminderRule: text('reminder_rule'),
    priority: text('priority').notNull().default('NORMAL'),
    estimatedMinutes: integer('estimated_minutes'),
    notes: text('notes'),
    tags: text('tags'),
    subtasks: text('subtasks'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => [
    index('idx_task_definitions_series_id').on(table.seriesId),
    unique('unique_series_version').on(table.seriesId, table.seriesVersion),
    check(
      'check_task_definitions_schedule_type',
      sql`schedule_type IN ('EXACT_TIME', 'PRAYER_RELATIVE', 'PRAYER_WINDOW', 'ANYTIME_TODAY')`
    ),
    check(
      'check_task_definitions_source',
      sql`source IN ('USER', 'WORSHIP', 'ROUTINE')`
    ),
    check(
      'check_task_definitions_priority',
      sql`priority IN ('NORMAL', 'IMPORTANT')`
    ),
    check(
      'check_task_definitions_series_version',
      sql`series_version >= 1`
    ),
  ]
);

// ==========================================
// 2.2 task_occurrences
// ==========================================
export const taskOccurrences = sqliteTable(
  'task_occurrences',
  {
    id: text('id').primaryKey(),
    taskDefinitionId: text('task_definition_id')
      .notNull()
      .references(() => taskDefinitions.id, { onDelete: 'cascade' }),
    seriesId: text('series_id').notNull(),
    localDate: text('local_date').notNull(), // 'YYYY-MM-DD' seed date
    planningDayKey: text('planning_day_key').notNull(),
    timezone: text('timezone').notNull(),
    calculatedStartTime: text('calculated_start_time'),
    calculatedPrayerSection: text('calculated_prayer_section'),
    eligiblePrayerSections: text('eligible_prayer_sections'),
    wallClockResolution: text('wall_clock_resolution'),
    windowStart: text('window_start'),
    windowEnd: text('window_end'),
    status: text('status').notNull().default('PENDING'),
    completedAt: text('completed_at'),
    missedAt: text('missed_at'),
    overrideData: text('override_data'),
  },
  table => [
    unique('unique_def_date').on(table.taskDefinitionId, table.localDate),
    unique('unique_series_date').on(table.seriesId, table.localDate),
    index('idx_task_occurrences_planning_day').on(table.planningDayKey),
    index('idx_task_occurrences_date').on(table.localDate),
    index('idx_task_occurrences_series_id').on(table.seriesId),
    check(
      'check_task_occurrences_status',
      sql`status IN ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED')`
    ),
  ]
);

// ==========================================
// 2.3 user_settings
// ==========================================
export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey().default('default'),
  locationMode: text('location_mode').notNull().default('AUTO'),
  manualLatitude: real('manual_latitude'),
  manualLongitude: real('manual_longitude'),
  manualLocationName: text('manual_location_name'),
  manualTimezone: text('manual_timezone'),
  lastKnownTimezone: text('last_known_timezone'),
  lastAutoLatitude: real('last_auto_latitude'),
  lastAutoLongitude: real('last_auto_longitude'),
  calculationMethod: text('calculation_method').notNull().default('MWL'),
  asrMethod: text('asr_method').notNull().default('SHAFI'),
  highLatitudeRule: text('high_latitude_rule').notNull().default('AUTO'),
  polarCircleResolution: text('polar_circle_resolution').notNull().default('AQRAB_YAUM'),
  prayerAdjustments: text('prayer_adjustments')
    .notNull()
    .default('{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}'),
  planningDayStart: text('planning_day_start').notNull().default('FAJR'),
  hijriBaseMethod: text('hijri_base_method').notNull().default('UMM_AL_QURA'),
  hijriGlobalAdjustment: integer('hijri_global_adjustment').notNull().default(0),
  worshipSuggestionsEnabled: integer('worship_suggestions_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  prayerAlertsEnabled: integer('prayer_alerts_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  themeMode: text('theme_mode').notNull().default('SYSTEM'),
  isPremium: integer('is_premium', { mode: 'boolean' }).notNull().default(false),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ==========================================
// 2.4 hijri_month_overrides
// ==========================================
export const hijriMonthOverrides = sqliteTable(
  'hijri_month_overrides',
  {
    id: text('id').primaryKey(),
    hijriYear: integer('hijri_year').notNull(),
    hijriMonth: integer('hijri_month').notNull(),
    adjustmentDays: integer('adjustment_days').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => [
    unique('unique_year_month').on(table.hijriYear, table.hijriMonth),
  ]
);

// ==========================================
// 2.5 worship_item_settings
// ==========================================
export const worshipItemSettings = sqliteTable('worship_item_settings', {
  id: text('id').primaryKey(),
  worshipItemKey: text('worship_item_key').notNull().unique(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ==========================================
// 2.6 prayer_cache
// ==========================================
export const prayerCache = sqliteTable('prayer_cache', {
  fingerprint: text('fingerprint').primaryKey(),
  date: text('date').notNull(),
  resultJson: text('result_json').notNull(),
  cachedAt: text('cached_at').notNull(),
});

// ==========================================
// 2.7 notification_schedule
// ==========================================
export const notificationSchedule = sqliteTable('notification_schedule', {
  id: text('id').primaryKey(),
  taskOccurrenceId: text('task_occurrence_id').references(
    () => taskOccurrences.id,
    { onDelete: 'cascade' }
  ),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  scheduledFor: text('scheduled_for').notNull(),
  channelId: text('channel_id').notNull(),
  platformNotifId: text('platform_notif_id'),
  status: text('status').notNull().default('SCHEDULED'),
  createdAt: text('created_at').notNull(),
});

// ==========================================
// 2.8 journal_entries
// ==========================================
export const journalEntries = sqliteTable(
  'journal_entries',
  {
    id: text('id').primaryKey(),
    planningDayKey: text('planning_day_key').notNull().unique(),
    encryptedPayload: text('encrypted_payload').notNull(),
    encryptionVersion: integer('encryption_version').notNull().default(1),
    revision: integer('revision').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  }
);
