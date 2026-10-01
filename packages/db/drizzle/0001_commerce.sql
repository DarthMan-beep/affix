CREATE TYPE "public"."commission_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."click_device" AS ENUM('desktop', 'mobile', 'tablet', 'bot');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('pending', 'approved', 'rejected', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_method_type" AS ENUM('bank', 'paypal', 'wise');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('requested', 'sent', 'completed', 'rejected');--> statement-breakpoint
CREATE TABLE "click" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"device" "click_device" DEFAULT 'desktop' NOT NULL,
	"browser" text,
	"referrer" text,
	"country" text,
	"sub_id" text,
	"is_unique" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "commission_status" DEFAULT 'pending' NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"payout_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commission_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "commission_amount_positive" CHECK ("commission"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"product_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_country" text NOT NULL,
	"buyer_user_id" text,
	"gross_cents" integer NOT NULL,
	"vat_bps" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"net_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"affiliate_cents" integer DEFAULT 0 NOT NULL,
	"vendor_cents" integer NOT NULL,
	"click_id" uuid,
	"link_id" uuid,
	"affiliate_id" uuid,
	"status" "order_status" DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_number_unique" UNIQUE("number"),
	CONSTRAINT "order_gross_positive" CHECK ("order"."gross_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "payout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"method_type" "payout_method_type" NOT NULL,
	"method_holder" text NOT NULL,
	"method_details" text NOT NULL,
	"status" "payout_status" DEFAULT 'requested' NOT NULL,
	"note" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "payout_reference_unique" UNIQUE("reference"),
	CONSTRAINT "payout_amount_positive" CHECK ("payout"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "payout_method" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"type" "payout_method_type" NOT NULL,
	"holder" text NOT NULL,
	"details" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "commission_type" "commission_type" DEFAULT 'percent' NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "commission_fixed_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "cookie_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "refund_days" integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE "click" ADD CONSTRAINT "click_link_id_affiliate_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click" ADD CONSTRAINT "click_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click" ADD CONSTRAINT "click_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission" ADD CONSTRAINT "commission_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission" ADD CONSTRAINT "commission_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission" ADD CONSTRAINT "commission_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission" ADD CONSTRAINT "commission_payout_id_payout_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payout"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_vendor_id_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_buyer_user_id_user_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_click_id_click_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."click"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_link_id_affiliate_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_link"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_method" ADD CONSTRAINT "payout_method_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "click_link_id_idx" ON "click" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "click_affiliate_id_idx" ON "click" USING btree ("affiliate_id");--> statement-breakpoint
CREATE INDEX "click_visitor_product_idx" ON "click" USING btree ("visitor_id","product_id");--> statement-breakpoint
CREATE INDEX "click_created_at_idx" ON "click" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "commission_affiliate_id_idx" ON "commission" USING btree ("affiliate_id");--> statement-breakpoint
CREATE INDEX "commission_status_idx" ON "commission" USING btree ("status");--> statement-breakpoint
CREATE INDEX "commission_payout_id_idx" ON "commission" USING btree ("payout_id");--> statement-breakpoint
CREATE INDEX "order_vendor_id_idx" ON "order" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "order_product_id_idx" ON "order" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_affiliate_id_idx" ON "order" USING btree ("affiliate_id");--> statement-breakpoint
CREATE INDEX "payout_affiliate_id_idx" ON "payout" USING btree ("affiliate_id");--> statement-breakpoint
CREATE INDEX "payout_status_idx" ON "payout" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payout_method_affiliate_id_idx" ON "payout_method" USING btree ("affiliate_id");--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_commission_fixed_positive" CHECK ("product"."commission_fixed_cents" >= 0);--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_cookie_days_range" CHECK ("product"."cookie_days" between 1 and 90);--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_refund_days_range" CHECK ("product"."refund_days" between 0 and 90);