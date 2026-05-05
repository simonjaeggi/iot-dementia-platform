CREATE TABLE "fall_detection_states" (
	"device_cert_fingerprint_sha256" varchar(64) PRIMARY KEY NOT NULL,
	"candidate_started_at" timestamp with time zone,
	"trigger_acceleration_magnitude_g" double precision,
	"trigger_acceleration_event_id" integer,
	"trigger_beacon_mac_identifier" varchar(17),
	"last_observed_beacon_mac_identifier" varchar(17),
	"last_observed_at" timestamp with time zone NOT NULL,
	"last_event_id" integer
);
--> statement-breakpoint
ALTER TABLE "fall_detection_states" ADD CONSTRAINT "fall_detection_states_device_cert_fingerprint_sha256_devices_cert_fingerprint_sha256_fk" FOREIGN KEY ("device_cert_fingerprint_sha256") REFERENCES "public"."devices"("cert_fingerprint_sha256") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fall_detection_states" ADD CONSTRAINT "fall_detection_states_trigger_acceleration_event_id_events_id_fk" FOREIGN KEY ("trigger_acceleration_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fall_detection_states" ADD CONSTRAINT "fall_detection_states_trigger_beacon_mac_identifier_location_beacons_mac_identifier_fk" FOREIGN KEY ("trigger_beacon_mac_identifier") REFERENCES "public"."location_beacons"("mac_identifier") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fall_detection_states" ADD CONSTRAINT "fall_detection_states_last_observed_beacon_mac_identifier_location_beacons_mac_identifier_fk" FOREIGN KEY ("last_observed_beacon_mac_identifier") REFERENCES "public"."location_beacons"("mac_identifier") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fall_detection_states" ADD CONSTRAINT "fall_detection_states_last_event_id_events_id_fk" FOREIGN KEY ("last_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fall_detection_states_candidate_started_at_idx" ON "fall_detection_states" USING btree ("candidate_started_at");--> statement-breakpoint
CREATE INDEX "fall_detection_states_last_event_idx" ON "fall_detection_states" USING btree ("last_event_id");