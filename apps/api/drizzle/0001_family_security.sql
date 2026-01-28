-- Add new invite code columns and lockdown flag
ALTER TABLE `families` ADD COLUMN `child_invite_code` text;
--> statement-breakpoint
ALTER TABLE `families` ADD COLUMN `parent_invite_code` text;
--> statement-breakpoint
ALTER TABLE `families` ADD COLUMN `is_locked` integer DEFAULT false NOT NULL;
--> statement-breakpoint

-- Copy existing invite codes to child_invite_code
UPDATE `families` SET `child_invite_code` = `invite_code`;
--> statement-breakpoint

-- Generate parent invite codes for existing families (using 6 random chars from allowed set)
-- SQLite doesn't have great random string generation, so we'll use a combination of hex and substr
UPDATE `families` SET `parent_invite_code` =
  UPPER(SUBSTR(REPLACE(REPLACE(REPLACE(REPLACE(HEX(RANDOMBLOB(3)), '0', 'G'), '1', 'H'), 'O', 'K'), 'I', 'J'), 1, 6));
--> statement-breakpoint

-- Make the new columns NOT NULL after population
-- SQLite doesn't support ALTER COLUMN, so we need to recreate constraints via unique indexes
CREATE UNIQUE INDEX `families_child_invite_code_unique` ON `families` (`child_invite_code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `families_parent_invite_code_unique` ON `families` (`parent_invite_code`);
--> statement-breakpoint

-- Drop old invite_code column and its index
DROP INDEX IF EXISTS `families_invite_code_unique`;
--> statement-breakpoint

-- SQLite doesn't support DROP COLUMN in older versions, but modern SQLite (3.35+) does
-- Cloudflare D1 uses modern SQLite, so this should work
ALTER TABLE `families` DROP COLUMN `invite_code`;
