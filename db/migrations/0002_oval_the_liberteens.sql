ALTER TABLE "reviews" DROP CONSTRAINT "reviews_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "author_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "author_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "author_email_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_business_email_idx" ON "reviews" USING btree ("business_id","author_email_hash");--> statement-breakpoint
CREATE INDEX "reviews_email_hash_idx" ON "reviews" USING btree ("author_email_hash");