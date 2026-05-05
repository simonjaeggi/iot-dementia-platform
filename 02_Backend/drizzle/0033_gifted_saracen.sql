CREATE TABLE "software_versions" (
	"id" integer PRIMARY KEY NOT NULL,
	"current_version" varchar(255),
	"available_version" varchar(255),
	"update_available" boolean DEFAULT false NOT NULL,
	"last_checked_at" timestamp with time zone NOT NULL
);
