CREATE TYPE "public"."application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."product_approval" AS ENUM('open', 'application');--> statement-breakpoint
CREATE TABLE "product_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"message" text,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
DROP INDEX "affiliate_link_affiliate_product_uq";--> statement-breakpoint
ALTER TABLE "affiliate_link" ADD COLUMN "campaign" text;--> statement-breakpoint
ALTER TABLE "affiliate_link" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "affiliate_link" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "affiliate_link" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "affiliate_link" ADD COLUMN "status" "link_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "approval" "product_approval" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_application" ADD CONSTRAINT "product_application_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_application" ADD CONSTRAINT "product_application_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_application_product_affiliate_uq" ON "product_application" USING btree ("product_id","affiliate_id");--> statement-breakpoint
CREATE INDEX "product_application_status_idx" ON "product_application" USING btree ("status");--> statement-breakpoint
CREATE INDEX "affiliate_link_affiliate_product_idx" ON "affiliate_link" USING btree ("affiliate_id","product_id");