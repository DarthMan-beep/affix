"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can } from "@affix/auth/permissions";
import {
  adjustment,
  affiliateLink,
  and,
  commission,
  db,
  eq,
  inArray,
  isNull,
  payout,
  payoutMethod,
  product,
  productApplication,
  referralBonus,
} from "@affix/db";
import { requireActor } from "@/lib/dal";
import { settleCommissions } from "@/lib/commerce";
import { getSettings } from "@/lib/settings";
import { applicationSchema, campaignLinkSchema, payoutMethodSchema } from "@/lib/validation";
import { slugify } from "@/lib/workspaces";
import type { FormState } from "@/app/(auth)/actions";

/*
 * Link, application and payout actions for affiliates. Payouts are simulated: a request is a row an
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
  const { minPayoutCents } = await getSettings();

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
    // Staff adjustments (bonuses, corrections) are paid out with the commissions.
    const adjustments = await tx
      .select({ id: adjustment.id, amountCents: adjustment.amountCents })
      .from(adjustment)
      .where(and(eq(adjustment.affiliateId, affiliateId), isNull(adjustment.payoutId)))
      .for("update");
    // Referral bonuses whose commission has been approved.
    const bonuses = await tx
      .select({ id: referralBonus.id, amountCents: referralBonus.amountCents })
      .from(referralBonus)
      .innerJoin(commission, eq(commission.id, referralBonus.commissionId))
      .where(
        and(
          eq(referralBonus.inviterId, affiliateId),
          isNull(referralBonus.payoutId),
          eq(commission.status, "approved"),
        ),
      )
      .for("update", { of: referralBonus });
    const availableCents = [...available, ...adjustments, ...bonuses].reduce((s, c) => s + c.amountCents, 0);

    if (!method || !can.requestPayout(actor, { availableCents, hasMethod: true, minimumCents: minPayoutCents })) {
      return "refused" as const;
    }

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
    if (available.length > 0) {
      await tx
        .update(commission)
        .set({ payoutId: created.id })
        .where(inArray(commission.id, available.map((c) => c.id)));
    }
    if (adjustments.length > 0) {
      await tx
        .update(adjustment)
        .set({ payoutId: created.id })
        .where(inArray(adjustment.id, adjustments.map((a) => a.id)));
    }
    if (bonuses.length > 0) {
      await tx
        .update(referralBonus)
        .set({ payoutId: created.id })
        .where(inArray(referralBonus.id, bonuses.map((b) => b.id)));
    }
    return "requested" as const;
  });

  revalidatePath("/dashboard", "layout");
  redirect(`${PAGE}?payout=${outcome}`);
}

/* ------------------------------------------------------------------- links */

const LINKS = "/dashboard/promoting/links";
const MAX_LINKS = 50;

/** The product, and this affiliate's application for it (null if none). */
async function productFor(affiliateId: string, productId: string) {
  const target = await db.query.product.findFirst({
    where: eq(product.id, productId),
    columns: { id: true, slug: true, vendorId: true, status: true, approval: true },
  });
  if (!target) return null;
  const application = await db.query.productApplication.findFirst({
    where: and(eq(productApplication.productId, productId), eq(productApplication.affiliateId, affiliateId)),
    columns: { status: true },
  });
  return { target, application: application ?? null };
}

/** A second (third, …) link to a product, named after the campaign it is used in. */
export async function createCampaignLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor(LINKS);
  const values = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  if (!actor.affiliate) return { error: "Open your promoting workspace first.", values };

  const parsed = campaignLinkSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const v = parsed.data;

  const found = await productFor(actor.affiliate.id, v.productId);
  if (!found || !can.createLink(actor, found.target, found.application)) {
    return { fieldErrors: { productId: ["You can't create a link for this product."] }, values };
  }
  if ((await db.$count(affiliateLink, eq(affiliateLink.affiliateId, actor.affiliate.id))) >= MAX_LINKS) {
    return { error: `You can have up to ${MAX_LINKS} links. Delete one you no longer use.`, values };
  }

  const campaign = slugify(v.campaign);
  const created = await db
    .insert(affiliateLink)
    .values({
      affiliateId: actor.affiliate.id,
      productId: found.target.id,
      code: `${actor.affiliate.handle}/${found.target.slug}/${campaign}`,
      campaign,
      utmSource: v.utmSource || null,
      utmMedium: v.utmMedium || null,
      utmCampaign: v.utmCampaign || null,
    })
    .onConflictDoNothing({ target: affiliateLink.code })
    .returning({ id: affiliateLink.id });
  if (created.length === 0) {
    return { fieldErrors: { campaign: ["You already have a link with this campaign name for this product."] }, values };
  }

  revalidatePath("/dashboard/promoting", "layout");
  redirect(`${LINKS}?link=created`);
}

async function ownLink(rawId: string) {
  const actor = await requireActor(LINKS);
  const id = uuid.safeParse(rawId);
  if (!id.success) return null;
  const link = await db.query.affiliateLink.findFirst({ where: eq(affiliateLink.id, id.data) });
  if (!link || !can.manageLink(actor, link)) return null;
  return link;
}

/** Pause or resume a link. A paused link still opens the product page, untracked. */
export async function setLinkStatus(rawId: string, status: "active" | "paused") {
  const link = await ownLink(rawId);
  if (!link) return;
  await db.update(affiliateLink).set({ status }).where(eq(affiliateLink.id, link.id));
  revalidatePath("/dashboard/promoting", "layout");
}

/** Delete a link and its click history. Sales it already earned are kept. */
export async function deleteLink(rawId: string) {
  const link = await ownLink(rawId);
  if (!link) return;
  await db.delete(affiliateLink).where(eq(affiliateLink.id, link.id));
  revalidatePath("/dashboard/promoting", "layout");
  redirect(`${LINKS}?link=deleted`);
}

/* ------------------------------------------------------------ applications */

/** Ask a vendor for permission to promote a product that requires approval. */
export async function applyToProduct(rawProductId: string, formData: FormData) {
  const actor = await requireActor("/dashboard/promoting/marketplace");
  const id = uuid.safeParse(rawProductId);
  const parsed = applicationSchema.safeParse({ message: String(formData.get("message") ?? "") });
  if (!id.success || !parsed.success || !actor.affiliate) return;

  const found = await productFor(actor.affiliate.id, id.data);
  if (!found || !can.applyToProduct(actor, found.target, found.application)) return;

  await db
    .insert(productApplication)
    .values({
      productId: found.target.id,
      affiliateId: actor.affiliate.id,
      message: parsed.data.message || null,
    })
    .onConflictDoNothing();
  revalidatePath("/dashboard", "layout");
}
