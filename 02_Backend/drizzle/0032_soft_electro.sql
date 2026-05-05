ALTER TABLE "panic_detection_states" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "panic_detection_states" CASCADE;--> statement-breakpoint
CREATE INDEX "events_time_idx" ON "events" USING btree ("time");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "events_type_time_idx" ON "events" USING btree ("type","time");