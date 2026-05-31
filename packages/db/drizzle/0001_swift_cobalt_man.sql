CREATE TABLE `dashboards` (
	`dashboard_id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`layout_json` text NOT NULL,
	`widgets_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `connection_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
