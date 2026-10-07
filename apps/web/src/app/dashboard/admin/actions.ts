"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can, parseRoles } from "@affix/auth/permissions";
import {
  adjustment,
  affiliate,
  and,
  blocklist,
  commission,
  db,
  eq,
  inArray,
  payout,
  platformSetting,
  referralBonus,
  session,
  user,
} from "@affix/db";
import { requireActor } from "@/lib/dal";
import { parseEuros } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/actions";

/*
 * Actions for platform staff. Every one re-checks that the actor is an admin.
 * Payouts stay simulated: "sent" and "completed" are status changes an admin
 * makes after paying by hand; nothing is transferred here. Each payout update
 * names the status it expects, so a double click can't skip a step.
 */

const PAYOUTS = "/dashboard/admin/payouts";
const AFFILIATES = "/dashboard/admin/affiliates";
const FRAUD = "/dashboard/admin/fraud";
const uuid = z.uuid();

/* ------------------------------------------------------------------ payouts */

async function adminPayoutId(rawId: string) {
  const actor = await requireActor(PAYOUTS);
  if (!can.processPayouts(actor)) return null;
  const id = uuid.safeParse(rawId);
  return id.success ? id.data : null;
}

export async function markPayoutSent(rawId: string) {
  const id = await adminPayoutId(rawId);
  if (!id) return;
  await db
    .update(payout)
    .set({ status: "sent", sentAt: new Date() })
    .where(and(eq(payout.id, id), eq(payout.status, "requested")));
  revalidatePath("/dashboard", "layout");
}

export async function markPayoutCompleted(rawId: string) {
  const id = await adminPayoutId(rawId);
  if (!id) return;
  await db
    .update(payout)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(payout.id, id), eq(payout.status, "sent")));
  revalidatePath("/dashboard", "layout");
}

/** Move every ticked payout one step on: requested → sent, or sent → completed. */
export async function advancePayouts(step: "sent" | "completed", formData: FormData) {
  const actor = await requireActor(PAYOUTS);
  if (!can.processPayouts(actor)) redirect(PAYOUTS);
  const ids = formData
    .getAll("ids")
    .map(String)
    .filter((id) => uuid.safeParse(id).success)
    .slice(0, 200);
  if (ids.length === 0) redirect(`${PAYOUTS}?done=none`);

  const now = new Date();
  const changed = await db
    .update(payout)
    .set(step === "sent" ? { status: "sent", sentAt: now } : { status: "completed", completedAt: now })
    .where(and(inArray(payout.id, ids), eq(payout.status, step === "sent" ? "requested" : "sent")))
    .returning({ id: payout.id });
  revalidatePath("/dashboard", "layout");
  redirect(`${PAYOUTS}?done=${step}&n=${changed.length}`);
}

/** Reject a payout: its commissions and adjustments return to the affiliate's available balance. */
export async function rejectPayout(rawId: string) {
  const id = await adminPayoutId(rawId);
  if (!id) return;
  await db.transaction(async (tx) => {
    const rejected = await tx
      .update(payout)
      .set({ status: "rejected", note: "Rejected by Affix. The amount is back in your balance." })
      .where(and(eq(payout.id, id), inArray(payout.status, ["requested", "sent"])))
      .returning({ id: payout.id });
    if (rejected.length > 0) {
      await tx.update(commission).set({ payoutId: null }).where(eq(commission.payoutId, id));
      await tx.update(adjustment).set({ payoutId: null }).where(eq(adjustment.payoutId, id));
      await tx.update(referralBonus).set({ payoutId: null }).where(eq(referralBonus.payoutId, id));
    }
  });
  revalidatePath("/dashboard", "layout");
}

/* ----------------------------------------------------------------- accounts */

/**
 * Ban or restore an account. A banned user can't sign in, and is signed out
 * everywhere at once. Never the admin's own account or another admin's.
 */
export async function setUserBanned(rawUserId: string, banned: boolean, back: string) {
  const actor = await requireActor("/dashboard/admin/accounts");
  const target = await db.query.user.findFirst({
    where: eq(user.id, rawUserId),
    columns: { id: true, role: true },
  });
  if (!target || !can.banUser(actor, { userId: target.id, roles: parseRoles(target.role) })) return;

  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({ banned, banReason: banned ? "Suspended by Affix staff." : null, banExpires: null })
      .where(eq(user.id, target.id));
    if (banned) await tx.delete(session).where(eq(session.userId, target.id));
  });
  revalidatePath("/dashboard", "layout");
  // Only ever back to an admin page.
  redirect(back.startsWith("/dashboard/admin") ? back : "/dashboard/admin/accounts");
}

/* --------------------------------------------------------------- affiliates */

async function managedAffiliate(rawId: string) {
  const actor = await requireActor(AFFILIATES);
  const id = uuid.safeParse(rawId);
  if (!can.manageAffiliates(actor) || !id.success) return null;
  const found = await db.query.affiliate.findFirst({ where: eq(affiliate.id, id.data), columns: { id: true } });
  return found ? { actor, id: found.id } : null;
}

/** Suspend or reinstate an affiliate: suspended links stop tracking, and payouts are paused. */
export async function setAffiliateSuspended(rawId: string, suspended: boolean) {
  const found = await managedAffiliate(rawId);
  if (!found) return;
  await db.update(affiliate).set({ suspended }).where(eq(affiliate.id, found.id));
  revalidatePath("/dashboard", "layout");
  redirect(`${AFFILIATES}/${found.id}?done=${suspended ? "suspended" : "reinstated"}`);
}

/** Put all of an affiliate's pending commissions on hold, so none is approved while staff look into them. */
export async function holdAffiliateCommissions(rawId: string) {
  const found = await managedAffiliate(rawId);
  if (!found) return;
  await db
    .update(commission)
    .set({ onHold: true })
    .where(and(eq(commission.affiliateId, found.id), eq(commission.status, "pending")));
  revalidatePath("/dashboard", "layout");
  redirect(`${AFFILIATES}/${found.id}?done=held`);
}

export async function saveAffiliateNote(rawId: string, formData: FormData) {
  const found = await managedAffiliate(rawId);
  if (!found) return;
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  await db.update(affiliate).set({ adminNote: note || null }).where(eq(affiliate.id, found.id));
  revalidatePath(`${AFFILIATES}/${found.id}`);
  redirect(`${AFFILIATES}/${found.id}?done=note`);
}

/** A bonus (+) or a correction (−) to an affiliate's balance, with the reason they will see. */
export async function addAdjustment(rawId: string, formData: FormData) {
  const found = await managedAffiliate(rawId);
  if (!found) return;

  const direction = formData.get("direction") === "minus" ? -1 : 1;
  const cents = parseEuros(String(formData.get("amount") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (cents === null || cents === 0 || cents > 100_000_00 || reason.length < 3) {
    redirect(`${AFFILIATES}/${found.id}?done=adjustment-invalid`);
  }

  await db.insert(adjustment).values({
    affiliateId: found.id,
    amountCents: direction * cents,
    reason,
    createdBy: found.actor.userId,
  });
  revalidatePath("/dashboard", "layout");
  redirect(`${AFFILIATES}/${found.id}?done=adjusted`);
}

/* ---------------------------------------------------------------- blocklist */

const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** Block a referring site (its visitors aren't tracked) or an email domain (sign-ups are refused). */
export async function addBlock(formData: FormData) {
  const actor = await requireActor(FRAUD);
  if (!can.manageAffiliates(actor)) redirect(FRAUD);

  const kind = formData.get("kind") === "email_domain" ? "email_domain" : "referrer";
  const value = String(formData.get("value") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  if (!HOST.test(value) || value.length > 120) redirect(`${FRAUD}?block=invalid`);

  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  await db.insert(blocklist).values({ kind, value, note: note || null }).onConflictDoNothing();
  revalidatePath(FRAUD);
  redirect(`${FRAUD}?block=added`);
}

/** Block one address (by its hash): clicks from it are no longer tracked. */
export async function blockAddress(ipHash: string) {
  const actor = await requireActor(FRAUD);
  if (!can.manageAffiliates(actor) || !/^[0-9a-z-]{8,64}$/i.test(ipHash)) redirect(FRAUD);
  await db
    .insert(blocklist)
    .values({ kind: "ip", value: ipHash, note: "Blocked from the busiest addresses list." })
    .onConflictDoNothing();
  revalidatePath(FRAUD);
  redirect(`${FRAUD}?block=added`);
}

export async function removeBlock(rawId: string) {
  const actor = await requireActor(FRAUD);
  const id = uuid.safeParse(rawId);
  if (!can.manageAffiliates(actor) || !id.success) redirect(FRAUD);
  await db.delete(blocklist).where(eq(blocklist.id, id.data));
  revalidatePath(FRAUD);
  redirect(`${FRAUD}?block=removed`);
}

/* ----------------------------------------------------------------- settings */

const whole = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, { error: message })
    .transform(Number)
    .refine((n) => n >= min && n <= max, { error: message });

const settingsSchema = z.object({
  minPayout: z
    .string()
    .trim()
    .refine((v) => {
      const cents = parseEuros(v);
      return cents !== null && cents >= 100 && cents <= 10_000_00;
    }, { error: "Enter an amount between €1 and €10,000." }),
  payoutSchedule: z.enum(["on_request", "weekly", "monthly"], { error: "Choose a schedule." }),
  attribution: z.enum(["last_click", "first_click"], { error: "Choose which click earns the sale." }),
  defaultCommission: whole(0, 90, "Enter a percentage from 0 to 90."),
  defaultCookieDays: whole(1, 90, "Choose between 1 and 90 days."),
  defaultRefundDays: whole(0, 90, "Choose between 0 and 90 days."),
  referralBonus: whole(0, 20, "Enter a percentage from 0 to 20."),
  referralMonths: whole(1, 36, "Choose between 1 and 36 months."),
});

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor("/dashboard/admin/settings");
  const values = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  if (!can.changeSettings(actor)) return { error: "Only admins can change the settings.", values };

  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const v = parsed.data;
  const row = {
    minPayoutCents: parseEuros(v.minPayout)!,
    payoutSchedule: v.payoutSchedule,
    attribution: v.attribution,
    defaultCommissionBps: v.defaultCommission * 100,
    defaultCookieDays: v.defaultCookieDays,
    defaultRefundDays: v.defaultRefundDays,
    referralBonusBps: v.referralBonus * 100,
    referralMonths: v.referralMonths,
    updatedAt: new Date(),
  };
  await db
    .insert(platformSetting)
    .values({ id: 1, ...row })
    .onConflictDoUpdate({ target: platformSetting.id, set: row });

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/admin/settings?saved=1");
}
