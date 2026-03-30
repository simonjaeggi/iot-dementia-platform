DO $$
BEGIN
  ALTER TABLE "user_notification_transport"
  ADD COLUMN "provider_message_id" text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END
$$;
