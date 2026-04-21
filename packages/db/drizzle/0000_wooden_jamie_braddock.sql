CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_kv` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connection_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`options_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_connected_at` integer,
	`tabs_json` text,
	`active_tab_id` text,
	`last_updated` integer
);
--> statement-breakpoint
CREATE TABLE `saved_queries` (
	`connection_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`connection_id`, `id`),
	FOREIGN KEY (`connection_id`) REFERENCES `connection_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
