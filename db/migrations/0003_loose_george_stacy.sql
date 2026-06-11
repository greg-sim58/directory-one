CREATE TABLE "location_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"town_name" text NOT NULL,
	"region" varchar(64),
	"country" varchar(64),
	"city_slug" varchar(64),
	"lat" double precision,
	"lon" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "location_preferences_visitor_idx" ON "location_preferences" USING btree ("visitor_id");