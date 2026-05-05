CREATE TABLE "panic_detection_states" (
	"device_cert_fingerprint_sha256" varchar(64) PRIMARY KEY NOT NULL,
	"latest_approx_db" double precision NOT NULL,
	"latest_dbfs" double precision NOT NULL,
	"previous_approx_db" double precision,
	"previous_dbfs" double precision,
	"previous_observed_at" timestamp with time zone,
	"last_observed_at" timestamp with time zone NOT NULL,
	"last_event_id" integer
);
--> statement-breakpoint
ALTER TABLE "panic_detection_states" ADD CONSTRAINT "panic_detection_states_device_cert_fingerprint_sha256_devices_cert_fingerprint_sha256_fk" FOREIGN KEY ("device_cert_fingerprint_sha256") REFERENCES "public"."devices"("cert_fingerprint_sha256") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panic_detection_states" ADD CONSTRAINT "panic_detection_states_last_event_id_events_id_fk" FOREIGN KEY ("last_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "panic_detection_states_latest_approx_db_last_observed_idx" ON "panic_detection_states" USING btree ("latest_approx_db","last_observed_at");--> statement-breakpoint
CREATE INDEX "panic_detection_states_last_event_idx" ON "panic_detection_states" USING btree ("last_event_id");