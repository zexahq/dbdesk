CREATE TABLE `auth_session_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`user_email` text NOT NULL,
	`user_image` text,
	`session_token` text NOT NULL,
	`session_expires_at` integer NOT NULL,
	`cached_at` integer NOT NULL
);
