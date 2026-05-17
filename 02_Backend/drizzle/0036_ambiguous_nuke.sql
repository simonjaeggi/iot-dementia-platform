ALTER TYPE "public"."event_type" ADD VALUE 'userDelete' BEFORE 'accessCode';--> statement-breakpoint
CREATE TABLE "notification_markers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_markers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_event_subscription_id" integer NOT NULL,
	"trigger_key" text NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"user_notification_id" integer
);
--> statement-breakpoint
ALTER TABLE "notification_markers" ADD CONSTRAINT "notification_markers_user_event_subscription_id_user_event_subscriptions_id_fk" FOREIGN KEY ("user_event_subscription_id") REFERENCES "public"."user_event_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_markers" ADD CONSTRAINT "notification_markers_user_notification_id_user_notifications_id_fk" FOREIGN KEY ("user_notification_id") REFERENCES "public"."user_notifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_markers_subscription_key_unique" ON "notification_markers" USING btree ("user_event_subscription_id","trigger_key");--> statement-breakpoint
CREATE INDEX "notification_markers_subscription_triggered_idx" ON "notification_markers" USING btree ("user_event_subscription_id","triggered_at");--> statement-breakpoint
CREATE INDEX "notification_markers_expires_idx" ON "notification_markers" USING btree ("expires_at");