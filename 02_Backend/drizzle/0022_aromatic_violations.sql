DROP INDEX "user_event_subscriptions_unique";--> statement-breakpoint
DROP INDEX "user_event_subscriptions_user_event";--> statement-breakpoint
ALTER TABLE "user_event_subscriptions" ADD COLUMN "device_cert_fingerprint_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "user_event_subscriptions" ADD CONSTRAINT "user_event_subscriptions_device_cert_fingerprint_sha256_devices_cert_fingerprint_sha256_fk" FOREIGN KEY ("device_cert_fingerprint_sha256") REFERENCES "public"."devices"("cert_fingerprint_sha256") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_event_subscriptions_unique" ON "user_event_subscriptions" USING btree ("user_id","type","delivery_method","detail_level","device_cert_fingerprint_sha256");--> statement-breakpoint
CREATE INDEX "user_event_subscriptions_user_event" ON "user_event_subscriptions" USING btree ("user_id","type","device_cert_fingerprint_sha256");