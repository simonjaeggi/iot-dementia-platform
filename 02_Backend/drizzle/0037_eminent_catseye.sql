ALTER TABLE "user_notification_transport" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_notification_transport" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_notification_transport" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_transport" ADD COLUMN "last_error" text;--> statement-breakpoint
CREATE INDEX "user_notification_transport_pending_idx" ON "user_notification_transport" USING btree ("sent_at","failed_at","next_attempt_at");