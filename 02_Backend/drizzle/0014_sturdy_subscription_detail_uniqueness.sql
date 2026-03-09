DROP INDEX IF EXISTS "user_event_subscriptions_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "user_event_subscriptions_unique" ON "user_event_subscriptions" USING btree ("user_id","event_type","delivery_method","detail_level");
