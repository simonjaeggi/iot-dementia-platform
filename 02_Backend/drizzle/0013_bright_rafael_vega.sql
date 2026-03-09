CREATE TABLE "user_notification_transport" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_notification_transport_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"user_notification_id" integer NOT NULL,
	"user_event_subscription_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_notifications" DROP CONSTRAINT "user_notifications_user_event_subscription_id_user_event_subscriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "user_notification_transport" ADD CONSTRAINT "user_notification_transport_user_notification_id_user_notifications_id_fk" FOREIGN KEY ("user_notification_id") REFERENCES "public"."user_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_transport" ADD CONSTRAINT "user_notification_transport_user_event_subscription_id_user_event_subscriptions_id_fk" FOREIGN KEY ("user_event_subscription_id") REFERENCES "public"."user_event_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_notification_transport_unique" ON "user_notification_transport" USING btree ("user_notification_id","user_event_subscription_id");--> statement-breakpoint
CREATE INDEX "user_notification_transport_notification_idx" ON "user_notification_transport" USING btree ("user_notification_id");--> statement-breakpoint
CREATE INDEX "user_notification_transport_subscription_idx" ON "user_notification_transport" USING btree ("user_event_subscription_id");--> statement-breakpoint
ALTER TABLE "user_notifications" DROP COLUMN "user_event_subscription_id";