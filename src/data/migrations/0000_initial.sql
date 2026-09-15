CREATE TABLE `hijri_month_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`hijri_year` integer NOT NULL,
	`hijri_month` integer NOT NULL,
	`adjustment_days` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_year_month` ON `hijri_month_overrides` (`hijri_year`,`hijri_month`);--> statement-breakpoint
CREATE TABLE `notification_schedule` (
	`id` text PRIMARY KEY NOT NULL,
	`task_occurrence_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`scheduled_for` text NOT NULL,
	`channel_id` text NOT NULL,
	`platform_notif_id` text,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`task_occurrence_id`) REFERENCES `task_occurrences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prayer_cache` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`result_json` text NOT NULL,
	`cached_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_date` text NOT NULL,
	`source` text DEFAULT 'USER' NOT NULL,
	`worship_item_key` text,
	`schedule_type` text NOT NULL,
	`schedule_data` text NOT NULL,
	`recurrence_rule` text,
	`hijri_recurrence` text,
	`recurrence_end` text,
	`series_id` text NOT NULL,
	`series_version` integer DEFAULT 1 NOT NULL,
	`effective_from_date` text,
	`effective_to_date` text,
	`reminder_rule` text,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`estimated_minutes` integer,
	`notes` text,
	`tags` text,
	`subtasks` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "check_task_definitions_schedule_type" CHECK(schedule_type IN ('EXACT_TIME', 'PRAYER_RELATIVE', 'PRAYER_WINDOW', 'ANYTIME_TODAY')),
	CONSTRAINT "check_task_definitions_source" CHECK(source IN ('USER', 'WORSHIP', 'ROUTINE')),
	CONSTRAINT "check_task_definitions_priority" CHECK(priority IN ('NORMAL', 'IMPORTANT')),
	CONSTRAINT "check_task_definitions_series_version" CHECK(series_version >= 1)
);
--> statement-breakpoint
CREATE INDEX `idx_task_definitions_series_id` ON `task_definitions` (`series_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_series_version` ON `task_definitions` (`series_id`,`series_version`);--> statement-breakpoint
CREATE TABLE `task_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`task_definition_id` text NOT NULL,
	`series_id` text NOT NULL,
	`local_date` text NOT NULL,
	`planning_day_key` text NOT NULL,
	`timezone` text NOT NULL,
	`calculated_start_time` text,
	`calculated_prayer_section` text,
	`eligible_prayer_sections` text,
	`wall_clock_resolution` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`completed_at` text,
	`missed_at` text,
	`override_data` text,
	FOREIGN KEY (`task_definition_id`) REFERENCES `task_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "check_task_occurrences_status" CHECK(status IN ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED'))
);
--> statement-breakpoint
CREATE INDEX `idx_task_occurrences_planning_day` ON `task_occurrences` (`planning_day_key`);--> statement-breakpoint
CREATE INDEX `idx_task_occurrences_date` ON `task_occurrences` (`local_date`);--> statement-breakpoint
CREATE INDEX `idx_task_occurrences_series_id` ON `task_occurrences` (`series_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_def_date` ON `task_occurrences` (`task_definition_id`,`local_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_series_date` ON `task_occurrences` (`series_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`location_mode` text DEFAULT 'AUTO' NOT NULL,
	`manual_latitude` real,
	`manual_longitude` real,
	`manual_location_name` text,
	`manual_timezone` text,
	`last_known_timezone` text,
	`calculation_method` text DEFAULT 'MWL' NOT NULL,
	`asr_method` text DEFAULT 'SHAFI' NOT NULL,
	`high_latitude_rule` text DEFAULT 'AUTO' NOT NULL,
	`polar_circle_resolution` text DEFAULT 'AQRAB_YAUM' NOT NULL,
	`prayer_adjustments` text DEFAULT '{"fajr":0,"sunrise":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}' NOT NULL,
	`planning_day_start` text DEFAULT 'FAJR' NOT NULL,
	`hijri_base_method` text DEFAULT 'UMM_AL_QURA' NOT NULL,
	`hijri_global_adjustment` integer DEFAULT 0 NOT NULL,
	`worship_suggestions_enabled` integer DEFAULT true NOT NULL,
	`prayer_alerts_enabled` integer DEFAULT true NOT NULL,
	`theme_mode` text DEFAULT 'SYSTEM' NOT NULL,
	`is_premium` integer DEFAULT false NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worship_item_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`worship_item_key` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `worship_item_settings_worship_item_key_unique` ON `worship_item_settings` (`worship_item_key`);