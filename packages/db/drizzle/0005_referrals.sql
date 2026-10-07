CREATE TABLE "referral" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invited_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_invited_user_id_unique" UNIQUE("invited_user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_bonus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"commission_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"payout_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_bonus_amount_positive" CHECK ("referral_bonus"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "platform_setting" ADD COLUMN "referral_bonus_bps" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_setting" ADD COLUMN "referral_months" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_inviter_id_affiliate_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral" ADD CONSTRAINT "referral_invited_user_id_user_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_bonus" ADD CONSTRAINT "referral_bonus_referral_id_referral_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referral"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_bonus" ADD CONSTRAINT "referral_bonus_inviter_id_affiliate_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_bonus" ADD CONSTRAINT "referral_bonus_commission_id_commission_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_bonus" ADD CONSTRAINT "referral_bonus_payout_id_payout_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payout"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referral_inviter_id_idx" ON "referral" USING btree ("inviter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_bonus_commission_uq" ON "referral_bonus" USING btree ("commission_id");--> statement-breakpoint
CREATE INDEX "referral_bonus_inviter_id_idx" ON "referral_bonus" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "referral_bonus_payout_id_idx" ON "referral_bonus" USING btree ("payout_id");--> statement-breakpoint
ALTER TABLE "platform_setting" ADD CONSTRAINT "platform_setting_referral_bonus" CHECK ("platform_setting"."referral_bonus_bps" between 0 and 2000);--> statement-breakpoint
ALTER TABLE "platform_setting" ADD CONSTRAINT "platform_setting_referral_months" CHECK ("platform_setting"."referral_months" between 1 and 36);