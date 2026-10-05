ALTER TABLE `user_settings` ADD `quiet_hours_start` text DEFAULT '22:00' NOT NULL;
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `quiet_hours_end` text DEFAULT '06:00' NOT NULL;
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_reminder_minutes` integer;
--> statement-breakpoint
UPDATE `task_definitions`
SET `reminder_rule` = json_set(
  reminder_rule,
  '$.offsetMinutes',
  -json_extract(reminder_rule, '$.offsetMinutes'),
  '$.offsetsMinutes',
  json_array(-json_extract(reminder_rule, '$.offsetMinutes'))
)
WHERE `reminder_rule` IS NOT NULL
  AND json_extract(reminder_rule, '$.offsetMinutes') > 0;
