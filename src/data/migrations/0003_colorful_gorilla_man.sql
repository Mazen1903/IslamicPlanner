CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`planning_day_key` text NOT NULL,
	`encrypted_payload` text NOT NULL,
	`encryption_version` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_planning_day_key_unique` ON `journal_entries` (`planning_day_key`);