CREATE TABLE `advice_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `advice_chat_messages_experiment_idx` ON `advice_chat_messages` (`experiment_id`, `created_at`);
