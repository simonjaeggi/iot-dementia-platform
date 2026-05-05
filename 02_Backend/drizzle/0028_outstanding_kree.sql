CREATE TABLE "outdoor_location_states" (
	"device_cert_fingerprint_sha256" varchar(64) PRIMARY KEY NOT NULL,
	"latest_lat" double precision NOT NULL,
	"latest_lng" double precision NOT NULL,
	"latest_altitude_meters" double precision NOT NULL,
	"latest_satellite_count" integer NOT NULL,
	"previous_lat" double precision,
	"previous_lng" double precision,
	"previous_altitude_meters" double precision,
	"previous_satellite_count" integer,
	"previous_observed_at" timestamp with time zone,
	"last_observed_at" timestamp with time zone NOT NULL,
	"last_event_id" integer
);
--> statement-breakpoint
DROP TABLE "refresh_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "outdoor_location_states" ADD CONSTRAINT "outdoor_location_states_device_cert_fingerprint_sha256_devices_cert_fingerprint_sha256_fk" FOREIGN KEY ("device_cert_fingerprint_sha256") REFERENCES "public"."devices"("cert_fingerprint_sha256") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outdoor_location_states" ADD CONSTRAINT "outdoor_location_states_last_event_id_events_id_fk" FOREIGN KEY ("last_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outdoor_location_states_last_observed_at_idx" ON "outdoor_location_states" USING btree ("last_observed_at");--> statement-breakpoint
CREATE INDEX "outdoor_location_states_last_event_idx" ON "outdoor_location_states" USING btree ("last_event_id");