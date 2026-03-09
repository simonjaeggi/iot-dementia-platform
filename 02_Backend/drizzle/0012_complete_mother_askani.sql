CREATE TYPE "public"."notification_delivery_method" AS ENUM('email');--> statement-breakpoint
CREATE TYPE "public"."notification_detail_level" AS ENUM('none', 'title', 'full');--> statement-breakpoint
CREATE TABLE "user_event_subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_event_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"event_type" "event_type" NOT NULL,
	"delivery_method" "notification_delivery_method" NOT NULL,
	"detail_level" "notification_detail_level" NOT NULL
);
--> statement-breakpoint
ALTER TABLE IF EXISTS "notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "notifications" CASCADE;--> statement-breakpoint
ALTER TABLE "user_notifications" DROP CONSTRAINT IF EXISTS "user_notifications_notification_id_notifications_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "user_notifications_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "user_notification_readAt";--> statement-breakpoint
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "trigger_event_id" integer;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "user_event_subscription_id" integer;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "title" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD COLUMN IF NOT EXISTS "message" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_event_subscriptions" ADD CONSTRAINT "user_event_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_event_subscriptions_unique" ON "user_event_subscriptions" USING btree ("user_id","event_type","delivery_method");--> statement-breakpoint
CREATE INDEX "user_event_subscriptions_user_event" ON "user_event_subscriptions" USING btree ("user_id","event_type");--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_trigger_event_id_events_id_fk" FOREIGN KEY ("trigger_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_event_subscription_id_user_event_subscriptions_id_fk" FOREIGN KEY ("user_event_subscription_id") REFERENCES "public"."user_event_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_notifications_user_createdat_idx" ON "user_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_notifications_user_readat_idx" ON "user_notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "user_notifications_event_idx" ON "user_notifications" USING btree ("trigger_event_id");--> statement-breakpoint
ALTER TABLE "user_notifications" DROP COLUMN IF EXISTS "notification_id";
