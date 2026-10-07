import "server-only";

import { cache } from "react";
import { blocklist, db, eq, platformSetting } from "@affix/db";

/*
 * Platform settings: one row that staff edit under Admin → Settings. Until
 * someone saves it the defaults below apply, which are the values the
 * platform shipped with.
 */

export const DEFAULT_SETTINGS = {
  minPayoutCents: 50_00,
  payoutSchedule: "on_request" as "on_request" | "weekly" | "monthly",
  attribution: "last_click" as "last_click" | "first_click",
  defaultCommissionBps: 3000,
  defaultCookieDays: 30,
  defaultRefundDays: 14,
  // Referral program: 5% on top of an invited affiliate's commissions for 12 months.
  referralBonusBps: 500,
  referralMonths: 12,
};
export type Settings = typeof DEFAULT_SETTINGS;

export const scheduleLabel = {
  on_request: "as they come in",
  weekly: "once a week",
  monthly: "once a month",
} as const;

/** The current settings. Memoised per request. */
export const getSettings = cache(async (): Promise<Settings> => {
  const row = await db.query.platformSetting.findFirst({ where: eq(platformSetting.id, 1) });
  if (!row) return DEFAULT_SETTINGS;
  return {
    minPayoutCents: row.minPayoutCents,
    payoutSchedule: row.payoutSchedule,
    attribution: row.attribution,
    defaultCommissionBps: row.defaultCommissionBps,
    defaultCookieDays: row.defaultCookieDays,
    defaultRefundDays: row.defaultRefundDays,
    referralBonusBps: row.referralBonusBps,
    referralMonths: row.referralMonths,
  };
});

/** Everything on the blocklist of one kind, as a set of values. */
export async function blocked(kind: "ip" | "referrer" | "email_domain") {
  const rows = await db.select({ value: blocklist.value }).from(blocklist).where(eq(blocklist.kind, kind));
  return new Set(rows.map((r) => r.value));
}
