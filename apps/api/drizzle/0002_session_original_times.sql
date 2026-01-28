-- Add original_start_time and original_end_time columns to track adjustment limits
-- These store the time when start/stop was originally pressed, for validation
ALTER TABLE `sessions` ADD COLUMN `original_start_time` integer;
--> statement-breakpoint
ALTER TABLE `sessions` ADD COLUMN `original_end_time` integer;
--> statement-breakpoint

-- Backfill existing sessions: original times equal current times
UPDATE `sessions` SET `original_start_time` = `start_time`;
--> statement-breakpoint
UPDATE `sessions` SET `original_end_time` = `end_time` WHERE `end_time` IS NOT NULL;
