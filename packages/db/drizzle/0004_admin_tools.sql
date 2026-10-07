CREATE TYPE "public"."attribution_model" AS ENUM('last_click', 'first_click');--> statement-breakpoint
CREATE TYPE "public"."block_kind" AS ENUM('ip', 'referrer', 'email_domain');--> statement-breakpoint
CREATE TYPE "public"."payout_schedule" AS ENUM('on_request', 'weekly', 'monthly');--> statement-breakpoint
CREATE TABLE "adjustment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"created_by" text,
	"payout_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adjustment_amount_not_zero" CHECK ("adjustment"."amount_cents" <> 0)
);
--> statement-breakpoint
CREATE TABLE "blocklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "block_kind" NOT NULL,
	"value" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_setting" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"min_payout_cents" integer DEFAULT 5000 NOT NULL,
	"payout_schedule" "payout_schedule" DEFAULT 'on_request' NOT NULL,
	"attribution" "attribution_model" DEFAULT 'last_click' NOT NULL,
	"default_commission_bps" integer DEFAULT 3000 NOT NULL,
	"default_cookie_days" integer DEFAULT 30 NOT NULL,
	"default_refund_days" integer DEFAULT 14 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_setting_single_row" CHECK ("platform_setting"."id" = 1),
	CONSTRAINT "platform_setting_min_payout" CHECK ("platform_setting"."min_payout_cents" between 100 and 1000000),
	CONSTRAINT "platform_setting_commission" CHECK ("platform_setting"."default_commission_bps" between 0 and 9000),
	CONSTRAINT "platform_setting_cookie_days" CHECK ("platform_setting"."default_cookie_days" between 1 and 90),
	CONSTRAINT "platform_setting_refund_days" CHECK ("platform_setting"."default_refund_days" between 0 and 90)
);
--> statement-breakpoint
ALTER TABLE "affiliate" ADD COLUMN "suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate" ADD COLUMN "admin_note" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "self_referral_affiliate_id" uuid;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_payout_id_payout_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payout"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adjustment_affiliate_id_idx" ON "adjustment" USING btree ("affiliate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blocklist_kind_value_uq" ON "blocklist" USING btree ("kind","value");--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_self_referral_affiliate_id_affiliate_id_fk" FOREIGN KEY ("self_referral_affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE set null ON UPDATE no action;