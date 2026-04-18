ALTER TABLE `experiments` ADD COLUMN `source_filename` text;
--> statement-breakpoint
ALTER TABLE `experiments` ADD COLUMN `source_hash` text;
--> statement-breakpoint
ALTER TABLE `experiments` ADD COLUMN `source_size` integer;
--> statement-breakpoint
ALTER TABLE `experiments` ADD COLUMN `registered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;
