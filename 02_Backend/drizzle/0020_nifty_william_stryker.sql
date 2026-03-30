CREATE TYPE "public"."subscription_type" AS ENUM('temperature', 'humidity', 'noiseLevel', 'infrastructure', 'updateAvailable', 'systemBoot', 'login', 'register', 'passwordChange', 'roleChange', 'accessCode', 'outdoorGeofenceCrossed', 'infrastructureStatusTooLong');--> statement-breakpoint
CREATE TABLE "infrastructure_states" (
	"device_cert_fingerprint_sha256" varchar(64) PRIMARY KEY NOT NULL,
	"status" varchar(64) NOT NULL,
	"status_since" timestamp with time zone NOT NULL,
	"last_observed_at" timestamp with time zone NOT NULL,
	"next_check_at" timestamp with time zone,
	"last_event_id" integer
);
--> statement-breakpoint
ALTER TABLE "user_event_subscriptions" RENAME COLUMN "event_type" TO "type";--> statement-breakpoint
DROP INDEX "user_event_subscriptions_unique";--> statement-breakpoint
DROP INDEX "user_event_subscriptions_user_event";--> statement-breakpoint
ALTER TABLE "infrastructure_states" ADD CONSTRAINT "infrastructure_states_device_cert_fingerprint_sha256_devices_cert_fingerprint_sha256_fk" FOREIGN KEY ("device_cert_fingerprint_sha256") REFERENCES "public"."devices"("cert_fingerprint_sha256") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infrastructure_states" ADD CONSTRAINT "infrastructure_states_last_event_id_events_id_fk" FOREIGN KEY ("last_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "infrastructure_states_status_nextcheckat_idx" ON "infrastructure_states" USING btree ("status","next_check_at");--> statement-breakpoint
CREATE INDEX "infrastructure_states_last_event_idx" ON "infrastructure_states" USING btree ("last_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_event_subscriptions_unique" ON "user_event_subscriptions" USING btree ("user_id","type","delivery_method","detail_level");--> statement-breakpoint
CREATE INDEX "user_event_subscriptions_user_event" ON "user_event_subscriptions" USING btree ("user_id","type");
