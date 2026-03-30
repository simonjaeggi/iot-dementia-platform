CREATE TABLE "patients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "patients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"surname" varchar(255) NOT NULL,
	"lastname" varchar(255) NOT NULL,
	"birthday" date NOT NULL
);
