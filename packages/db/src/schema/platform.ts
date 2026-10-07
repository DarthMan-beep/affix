/*
 * Platform-wide configuration, owned by staff.
 *   platform_setting  one row (id = 1) of rules every workspace follows
 *   blocklist         traffic and sign-ups the platform refuses
 */
import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const attributionModel = pgEnum("attribution_model", ["last_click", "first_click"]);
export const payoutSchedule = pgEnum("payout_schedule", ["on_request", "weekly", "monthly"]);

export const platformSetting = pgTable(
  "platform_setting",
  {
    // Always 1: there is exactly one row of settings.
    id: integer("id").primaryKey().default(1),
    minPayoutCents: integer("min_payout_cents").default(5000).notNull(),
    // When staff process payout requests. Shown to affiliates; nothing runs on a timer.
    payoutSchedule: payoutSchedule("payout_schedule").default("on_request").notNull(),
    // Which click earns a sale when a buyer clicked several affiliates' links.
    attribution: attributionModel("attribution").default("last_click").notNull(),
    // What a new product starts with in the product editor.
    defaultCommissionBps: integer("default_commission_bps").default(3000).notNull(),
    defaultCookieDays: integer("default_cookie_days").default(30).notNull(),
    defaultRefundDays: integer("default_refund_days").default(14).notNull(),
    // Referral program: the inviter's bonus on an invited affiliate's commissions
    // (500 = 5%, 0 switches the program off), and for how many months it runs.
    referralBonusBps: integer("referral_bonus_bps").default(500).notNull(),
    referralMonths: integer("referral_months").default(12).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("platform_setting_single_row", sql`${t.id} = 1`),
    check("platform_setting_min_payout", sql`${t.minPayoutCents} between 100 and 1000000`),
    check("platform_setting_commission", sql`${t.defaultCommissionBps} between 0 and 9000`),
    check("platform_setting_cookie_days", sql`${t.defaultCookieDays} between 1 and 90`),
    check("platform_setting_refund_days", sql`${t.defaultRefundDays} between 0 and 90`),
    check("platform_setting_referral_bonus", sql`${t.referralBonusBps} between 0 and 2000`),
    check("platform_setting_referral_months", sql`${t.referralMonths} between 1 and 36`),
  ],
);

// ip: a hashed address (clicks from it aren't tracked). referrer: a site whose
// visitors aren't tracked. email_domain: sign-ups from it are refused.
export const blockKind = pgEnum("block_kind", ["ip", "referrer", "email_domain"]);

export const blocklist = pgTable(
  "blocklist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: blockKind("kind").notNull(),
    value: text("value").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("blocklist_kind_value_uq").on(t.kind, t.value)],
);
