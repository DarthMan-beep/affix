CREATE TYPE "public"."commission_approval" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."creative_kind" AS ENUM('banner', 'text');--> statement-breakpoint
CREATE TABLE "affiliate_rate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"commission_type" "commission_type" NOT NULL,
	"commission_bps" integer DEFAULT 0 NOT NULL,
	"commission_fixed_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_rate_bps_range" CHECK ("affiliate_rate"."commission_bps" between 0 and 9000),
	CONSTRAINT "affiliate_rate_fixed_positive" CHECK ("affiliate_rate"."commission_fixed_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "creative" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"kind" "creative_kind" NOT NULL,
	"title" text NOT NULL,
	"size" text,
	"image_url" text,
	"headline" text,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "commission_approval" "commission_approval" DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "commission" ADD COLUMN "manual_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "commission" ADD COLUMN "on_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_rate" ADD CONSTRAINT "affiliate_rate_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_rate" ADD CONSTRAINT "affiliate_rate_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative" ADD CONSTRAINT "creative_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_rate_product_affiliate_uq" ON "affiliate_rate" USING btree ("product_id","affiliate_id");--> statement-breakpoint
CREATE INDEX "creative_product_id_idx" ON "creative" USING btree ("product_id");