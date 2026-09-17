ALTER TABLE `user_settings` ADD `last_auto_latitude` real;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `last_auto_longitude` real;--> statement-breakpoint
UPDATE `user_settings`
SET `location_mode` = 'MANUAL'
WHERE `location_mode` = 'AUTO'
  AND `last_auto_latitude` IS NULL
  AND `last_auto_longitude` IS NULL
  AND `manual_latitude` IS NOT NULL
  AND `manual_longitude` IS NOT NULL
  AND `manual_timezone` IS NOT NULL
  AND `manual_timezone` != '';