"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can } from "@affix/auth/permissions";
import { and, commission, db, eq, inArray, isNull, payout, payoutMethod } from "@affix/db";
import { requireActor } from "@/lib/dal";
import { settleCommissions } from "@/lib/commerce";
import { payoutMethodSchema } from "@/lib/validation";
import type { FormState } from "@/app/(auth)/actions";

/*
 * Payout actions for affiliates. Payouts are simulated: a request is a row an
 * admin later marks as sent. No money moves and no bank is contacted.
 */

const PAGE = "/dashboard/promoting/payouts";
const uuid = z.uuid();

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const reference = () => `PO-${[...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join("")}`;

export async function addPayoutMethod(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor(PAGE);
  // Bank details are never echoed back to the form after an error, only the rest.
  const values = {
    type: String(formData.get("type") ?? ""),
    holder: String(formData.get("holder") ?? ""),
  };
  if (!actor.affiliate) return { error: "Open your promoting workspace first.", values };

  const parsed = payoutMethodSchema.safeParse({ ...values, details: String(formData.get("details") ?? "") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const { type, holder } = parsed.data;
  const details =
    type === "bank" ? parsed.data.details.replace(/\s+/g, "").toUpperCase() : parsed.data.details.toLowerCase();

  const existing = await db.$count(payoutMethod, eq(payoutMethod.affiliateId, actor.affiliate.id));
  if (existing >= 5) return { error: "You can save up to 5 payout methods. Remove one first.", values };

  await db.insert(payoutMethod).values({
    affiliateId: actor.affiliate.id,
    type,
    holder,
    details,
    isDefault: existing === 0,
  });
  revalidatePath(PAGE);
  redirect(`${PAGE}?method=added`);
}

async function ownMethod(rawId: string) {
  const actor = await requireActor(PAGE);
  const id = uuid.safeParse(rawId);
  if (!id.success) return null;
  const method = await db.query.payoutMethod.findFirst({ where: eq(payoutMethod.id, id.data) });
  if (!method || !can.managePayoutMethod(actor, method)) return null;
  return method;
}

export async function makeDefaultMethod(rawId: string) {
  const method = await ownMethod(rawId);
  if (!method) return;
  await db.transaction(async (tx) => {
    await tx.update(payoutMethod).set({ isDefault: false }).where(eq(payoutMethod.affiliateId, method.affiliateId));
    await tx.update(payoutMethod).set({ isDefault: true }).where(eq(payoutMethod.id, method.id));
  });
  revalidatePath(PAGE);
}

export async function removePayoutMethod(rawId: string) {
  const method = await ownMethod(rawId);
  if (!method) return;
  await db.transaction(async (tx) => {
    await tx.delete(payoutMethod).where(eq(payoutMethod.id, method.id));
    if (method.isDefault) {
      // Promote the oldest remaining method, if any.
      const next = await tx.query.payoutMethod.findFirst({
        where: eq(payoutMethod.affiliateId, method.affiliateId),
        orderBy: (m, { asc }) => asc(m.createdAt),
      });
      if (next) await tx.update(payoutMethod).set({ isDefault: true }).where(eq(payoutMethod.id, next.id));
    }
  });
  revalidatePath(PAGE);
}

/** Withdraw the whole available balance to the default payout method. */
export async function requestPayout() {
  const actor = await requireActor(PAGE);
  if (!actor.affiliate) redirect(PAGE);
  const affiliateId = actor.affiliate.id;
  await settleCommissions();

  const outcome = await db.transaction(async (tx) => {
    const method = await tx.query.payoutMethod.findFirst({
      where: eq(payoutMethod.affiliateId, affiliateId),
      orderBy: (m, { desc, asc }) => [desc(m.isDefault), asc(m.createdAt)],
    });
    // Lock the commissions so two requests can't pay out the same ones.
    const available = await tx
      .select({ id: commission.id, amountCents: commission.amountCents })
      .from(commission)
      .where(
        and(
          eq(commission.affiliateId, affiliateId),
          eq(commission.status, "approved"),
          isNull(commission.payoutId),
        ),
      )
      .for("update");
    const availableCents = available.reduce((s, c) => s + c.amountCents, 0);

    if (!method || !can.requestPayout(actor, { availableCents, hasMethod: true })) return "refused" as const;

    const [created] = await tx
      .insert(payout)
      .values({
        reference: reference(),
        affiliateId,
        amountCents: availableCents,
        methodType: method.type,
        methodHolder: method.holder,
        methodDetails: method.details,
      })
      .returning({ id: payout.id });
    await tx
      .update(commission)
      .set({ payoutId: created.id })
      .where(inArray(commission.id, available.map((c) => c.id)));
    return "requested" as const;
  });

  revalidatePath("/dashboard", "layout");
  redirect(`${PAGE}?payout=${outcome}`);
}
