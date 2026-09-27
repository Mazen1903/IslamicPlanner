ALTER TABLE `user_settings` ADD `completed_tasks_mode` text DEFAULT 'KEEP' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `overdue_tasks_mode` text DEFAULT 'KEEP' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `prayer_vibration_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `task_reminders_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `task_vibration_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `quiet_hours_enabled` integer DEFAULT false NOT NULL;