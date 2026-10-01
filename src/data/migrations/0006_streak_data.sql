CREATE TABLE IF NOT EXISTS `streak_data` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`streak_enabled` integer DEFAULT false NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_completed_date` text,
	`last_reset_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_streak_data_series_id` ON `streak_data` (`series_id`);
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `flame_engine` text DEFAULT 'svg' NOT NULL;
