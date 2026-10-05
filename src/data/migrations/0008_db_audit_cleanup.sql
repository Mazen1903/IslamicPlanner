DROP TABLE `notification_schedule`;--> statement-breakpoint
DROP TABLE `prayer_cache`;--> statement-breakpoint
DROP TABLE `worship_item_settings`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_streak_data` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`streak_enabled` integer DEFAULT false NOT NULL,
	`current_streak` integer DEFAULT 1 NOT NULL,
	`longest_streak` integer DEFAULT 1 NOT NULL,
	`last_completed_date` text,
	`last_reset_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_streak_data`("id", "series_id", "streak_enabled", "current_streak", "longest_streak", "last_completed_date", "last_reset_date", "created_at", "updated_at") SELECT "id", "series_id", "streak_enabled", "current_streak", "longest_streak", "last_completed_date", "last_reset_date", "created_at", "updated_at" FROM `streak_data`;--> statement-breakpoint
DROP TABLE `streak_data`;--> statement-breakpoint
ALTER TABLE `__new_streak_data` RENAME TO `streak_data`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `streak_data_series_id_unique` ON `streak_data` (`series_id`);--> statement-breakpoint
CREATE INDEX `idx_streak_data_series_id` ON `streak_data` (`series_id`);--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `hijri_base_method`;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `worship_suggestions_enabled`;--> statement-breakpoint
ALTER TABLE `user_settings` DROP COLUMN `flame_engine`;