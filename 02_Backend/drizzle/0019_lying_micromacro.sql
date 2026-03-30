CREATE TABLE "location_beacons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "location_beacons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"mac_identifier" varchar(17) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "location_beacons_mac_identifier_unique" ON "location_beacons" USING btree ("mac_identifier");