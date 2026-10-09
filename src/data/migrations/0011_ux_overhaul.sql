ALTER TABLE `user_settings` ADD COLUMN `planner_hidden_sections` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `user_settings` ADD COLUMN `app_font_family` text DEFAULT 'comic';--> statement-breakpoint
ALTER TABLE `user_settings` ADD COLUMN `app_text_scale` text DEFAULT 'normal';
