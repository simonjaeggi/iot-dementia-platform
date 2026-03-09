CREATE TYPE "public"."event_type" AS ENUM('indoorLocation', 'outdoorLocation', 'temperature', 'noiseLevel', 'humidity', 'infrastructure', 'updateAvailable', 'login', 'logout', 'register', 'passwordChange', 'roleChange', 'accessCode');--> statement-breakpoint
CREATE TABLE "events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" "event_type" NOT NULL,
	"time" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
