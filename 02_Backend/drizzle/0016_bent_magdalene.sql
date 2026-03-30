DO $$
BEGIN
  ALTER TYPE "public"."notification_delivery_method" ADD VALUE 'push';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  BEGIN
    ALTER TABLE "users"
    ADD COLUMN "push_id" text DEFAULT md5(random()::text || clock_timestamp()::text);
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  UPDATE "users"
  SET "push_id" = 'user-' || "id"::text
  WHERE "push_id" IS NULL;

  ALTER TABLE "users"
  ALTER COLUMN "push_id" SET DEFAULT md5(random()::text || clock_timestamp()::text);
END
$$;
