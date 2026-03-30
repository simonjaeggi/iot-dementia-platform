ALTER TABLE "user_event_subscriptions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."subscription_type";