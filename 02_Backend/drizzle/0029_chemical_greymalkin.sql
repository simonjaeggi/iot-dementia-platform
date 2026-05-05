CREATE TABLE "indoor_location_states" (
	"device_cert_fingerprint_sha256" varchar(64) PRIMARY KEY NOT NULL,
	"current_beacon_mac_identifier" varchar(17),
	"previous_beacon_mac_identifier" varchar(17),
	"beacon_since" timestamp with time zone,
	"previous_observed_at" timestamp with time zone,
	"last_observed_at" timestamp with time zone NOT NULL,
	"last_event_id" integer
);
--> statement-breakpoint
ALTER TABLE "indoor_location_states" ADD CONSTRAINT "indoor_location_states_device_cert_fingerprint_sha256_devices_cert_fingerprint_sha256_fk" FOREIGN KEY ("device_cert_fingerprint_sha256") REFERENCES "public"."devices"("cert_fingerprint_sha256") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indoor_location_states" ADD CONSTRAINT "indoor_location_states_current_beacon_mac_identifier_location_beacons_mac_identifier_fk" FOREIGN KEY ("current_beacon_mac_identifier") REFERENCES "public"."location_beacons"("mac_identifier") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indoor_location_states" ADD CONSTRAINT "indoor_location_states_previous_beacon_mac_identifier_location_beacons_mac_identifier_fk" FOREIGN KEY ("previous_beacon_mac_identifier") REFERENCES "public"."location_beacons"("mac_identifier") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indoor_location_states" ADD CONSTRAINT "indoor_location_states_last_event_id_events_id_fk" FOREIGN KEY ("last_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "indoor_location_states_current_beacon_last_observed_idx" ON "indoor_location_states" USING btree ("current_beacon_mac_identifier","last_observed_at");--> statement-breakpoint
CREATE INDEX "indoor_location_states_last_event_idx" ON "indoor_location_states" USING btree ("last_event_id");