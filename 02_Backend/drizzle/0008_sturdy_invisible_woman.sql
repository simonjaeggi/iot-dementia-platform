CREATE TABLE "devices" (
	"cert_fingerprint_sha256" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone,
	"config" jsonb NOT NULL,
	CONSTRAINT "devices_cert_fingerprint_sha256_unique" UNIQUE("cert_fingerprint_sha256")
);
