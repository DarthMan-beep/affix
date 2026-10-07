"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can } from "@affix/auth/permissions";
import {
  affiliateLink,
  affiliateRate,
  and,
  commission,
  creative,
  db,
  eq,
  inArray,
  order,
  product,
  productApplication,
  sql,
} from "@affix/db";
import { requireActor } from "@/lib/dal";
import { HIGHEST_VAT_BPS, splitCents, type CommissionTerms } from "@/lib/money";
import { creativeSchema, parseEuros, productSchema } from "@/lib/validation";
import { slugify } from "@/lib/workspaces";
import type { FormState } from "@/app/(auth)/actions";

/*
 * Product editor actions. As everywhere: re-verify the session, apply the
 * permission rules, validate the input. The form is never trusted.
 */

const fields = (formData: FormData) =>
  Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<
    string,
    string
  >;

const uuid = z.uuid();

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor("/dashboard/selling");
  const values = fields(formData);

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const v = parsed.data;

  const priceCents = parseEuros(v.price)!;
  const terms: CommissionTerms =
    v.commissionType === "percent"
      ? {
          commissionType: "percent",
          commissionBps: Math.round(Number(v.commissionPercent.replace(",", ".")) * 100),
          commissionFixedCents: 0,
        }
      : { commissionType: "fixed", commissionBps: 0, commissionFixedCents: parseEuros(v.commissionFixed)! };

  // The vendor must still earn something in the country with the highest VAT.
  if (splitCents(priceCents, HIGHEST_VAT_BPS, terms).vendorCents <= 0) {
    return {
      fieldErrors: {
        [v.commissionType === "percent" ? "commissionPercent" : "commissionFixed"]: [
          "This leaves you nothing after VAT and the Affix fee. Lower it or raise the price.",
        ],
      },
      values,
    };
  }

  const data = {
    title: v.title,
    category: v.category,
    description: v.description || null,
    priceCents,
    ...terms,
    cookieDays: v.cookieDays,
    refundDays: v.refundDays,
    approval: v.approval,
    commissionApproval: v.commissionApproval,
    imageUrl: v.image || null,
    status: v.intent === "publish" ? ("published" as const) : ("draft" as const),
  };

  const id = uuid.safeParse(values.id);
  if (id.success) {
    const existing = await db.query.product.findFirst({
      where: eq(product.id, id.data),
      columns: { id: true, slug: true, vendorId: true, status: true },
    });
    if (!existing || !can.manageProduct(actor, existing)) {
      return { error: "You can't edit this product.", values };
    }
    // The slug stays as it is: affiliate links already point at it.
    await db.update(product).set(data).where(eq(product.id, existing.id));
    revalidatePath(`/p/${existing.slug}`);
  } else {
    if (!can.createProduct(actor) || !actor.vendor) {
      return { error: "Open your selling workspace before adding products.", values };
    }
    const base = slugify(v.title);
    let created = false;
    for (let attempt = 0; attempt < 6 && !created; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${Math.random().toString(16).slice(2, 6)}`;
      const rows = await db
        .insert(product)
        .values({ ...data, vendorId: actor.vendor.id, slug })
        .onConflictDoNothing({ target: product.slug })
        .returning({ id: product.id });
      created = rows.length > 0;
    }
    if (!created) return { error: "We couldn't create a link for this title. Try a different title.", values };
  }

  revalidatePath("/dashboard/selling", "layout");
  redirect(`/dashboard/selling/products?saved=${data.status}`);
}

/** Archive a product: it leaves the marketplace and its links stop tracking. */
export async function archiveProduct(rawId: string) {
  const actor = await requireActor("/dashboard/selling");
  const id = uuid.safeParse(rawId);
  if (!id.success) return;
  const existing = await db.query.product.findFirst({
    where: eq(product.id, id.data),
    columns: { id: true, slug: true, vendorId: true, status: true },
  });
  if (!existing || !can.manageProduct(actor, existing)) return;

  await db.update(product).set({ status: "archived" }).where(eq(product.id, existing.id));
  revalidatePath("/dashboard/selling", "layout");
  revalidatePath(`/p/${existing.slug}`);
  redirect("/dashboard/selling/products?saved=archived");
}

/** Approve or reject an affiliate's application to promote one of the vendor's products. */
export async function decideApplication(rawId: string, decision: "approved" | "rejected") {
  const actor = await requireActor("/dashboard/selling/applications");
  const id = uuid.safeParse(rawId);
  if (!id.success) return;

  const [application] = await db
    .select({ id: productApplication.id, vendorId: product.vendorId, status: product.status })
    .from(productApplication)
    .innerJoin(product, eq(product.id, productApplication.productId))
    .where(eq(productApplication.id, id.data))
    .limit(1);
  if (!application || !can.reviewApplication(actor, application)) return;

  // Only a pending application can be decided; a second click changes nothing.
  await db
    .update(productApplication)
    .set({ status: decision, decidedAt: new Date() })
    .where(and(eq(productApplication.id, application.id), eq(productApplication.status, "pending")));
  revalidatePath("/dashboard", "layout");
}

/* -------------------------------------------------------------- commissions */

const COMMISSIONS = "/dashboard/selling/commissions";
export type CommissionDecision = "approve" | "reject" | "hold" | "release";

/**
 * Approve, reject, hold or release commissions: one (pass its id) or every
 * row ticked in the form. Only pending commissions on the actor's own
 * products change; anything else in the selection is skipped.
 */
export async function decideCommissions(decision: CommissionDecision, singleId: string | null, formData: FormData) {
  const actor = await requireActor(COMMISSIONS);
  const tab = String(formData.get("tab") ?? "");
  const back = (outcome: string, n = 0) =>
    redirect(`${COMMISSIONS}?${tab ? `status=${encodeURIComponent(tab)}&` : ""}done=${outcome}&n=${n}`);

  const ids = (singleId ? [singleId] : formData.getAll("ids").map(String))
    .filter((id) => uuid.safeParse(id).success)
    .slice(0, 200);
  if (ids.length === 0) back("none");

  const rows = await db
    .select({ id: commission.id, status: commission.status, vendorId: product.vendorId })
    .from(commission)
    .innerJoin(product, eq(product.id, commission.productId))
    .where(inArray(commission.id, ids));
  const allowed = rows.filter((r) => can.reviewCommission(actor, r)).map((r) => r.id);
  if (allowed.length === 0) back("none");

  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const change =
    decision === "approve"
      ? { status: "approved" as const, approvedAt: new Date(), onHold: false }
      : decision === "reject"
        ? { status: "rejected" as const, note: reason || "Rejected by the vendor.", onHold: false }
        : { onHold: decision === "hold" };

  const changed = await db.transaction(async (tx) => {
    const rows = await tx
      .update(commission)
      .set(change)
      .where(and(inArray(commission.id, allowed), eq(commission.status, "pending")))
      .returning({ id: commission.id, orderId: commission.orderId });
    // A rejected commission is not paid, so its share of the sale goes back to the vendor.
    if (decision === "reject" && rows.length > 0) {
      await tx
        .update(order)
        .set({ vendorCents: sql`${order.vendorCents} + ${order.affiliateCents}`, affiliateCents: 0 })
        .where(inArray(order.id, rows.map((r) => r.orderId)));
    }
    return rows;
  });

  revalidatePath("/dashboard", "layout");
  back(decision, changed.length);
}

/**
 * Refund an order (simulated: no money moves). The sale leaves the totals and
 * the affiliate's commission is reversed. Not possible once that commission
 * is part of a payout.
 */
export async function refundOrder(rawId: string) {
  const ORDERS = "/dashboard/selling/orders";
  const actor = await requireActor(ORDERS);
  const id = uuid.safeParse(rawId);
  if (!id.success) redirect(ORDERS);

  const [found] = await db
    .select({
      id: order.id,
      vendorId: order.vendorId,
      status: order.status,
      commissionId: commission.id,
      commissionPayoutId: commission.payoutId,
    })
    .from(order)
    .leftJoin(commission, eq(commission.orderId, order.id))
    .where(eq(order.id, id.data))
    .limit(1);
  if (!found || !can.refundOrder(actor, { ...found, commissionPaidOut: found.commissionPayoutId !== null })) {
    redirect(`${ORDERS}?refund=blocked`);
  }

  await db.transaction(async (tx) => {
    await tx.update(order).set({ status: "refunded" }).where(and(eq(order.id, found.id), eq(order.status, "paid")));
    if (found.commissionId) {
      await tx
        .update(commission)
        .set({ status: "reversed", note: "The order was refunded.", onHold: false })
        .where(and(eq(commission.id, found.commissionId), inArray(commission.status, ["pending", "approved"])));
    }
  });
  revalidatePath("/dashboard", "layout");
  redirect(`${ORDERS}?refund=done`);
}

/* ------------------------------------------------------------- custom rates */

const AFFILIATES = "/dashboard/selling/affiliates";

/** Give one affiliate their own commission on one product, replacing the standard one. */
export async function setAffiliateRate(rawProductId: string, rawAffiliateId: string, formData: FormData) {
  const actor = await requireActor(AFFILIATES);
  const productId = uuid.safeParse(rawProductId);
  const affiliateId = uuid.safeParse(rawAffiliateId);
  if (!productId.success || !affiliateId.success) redirect(AFFILIATES);

  const target = await db.query.product.findFirst({
    where: eq(product.id, productId.data),
    columns: { id: true, vendorId: true, status: true, priceCents: true },
  });
  // Only for affiliates who already promote this product.
  const promotes = await db.query.affiliateLink.findFirst({
    where: and(eq(affiliateLink.productId, productId.data), eq(affiliateLink.affiliateId, affiliateId.data)),
    columns: { id: true },
  });
  if (!target || !promotes || !can.manageProduct(actor, target)) redirect(AFFILIATES);

  const type = formData.get("type") === "fixed" ? "fixed" : "percent";
  const raw = String(formData.get("value") ?? "").trim();
  const percent = Number(raw.replace(",", "."));
  const fixedCents = parseEuros(raw);
  const terms: CommissionTerms | null =
    type === "percent"
      ? raw !== "" && Number.isFinite(percent) && percent >= 0 && percent <= 90
        ? { commissionType: "percent", commissionBps: Math.round(percent * 100), commissionFixedCents: 0 }
        : null
      : fixedCents !== null
        ? { commissionType: "fixed", commissionBps: 0, commissionFixedCents: fixedCents }
        : null;
  // Same guard as the product editor: the vendor must still earn something.
  if (!terms || splitCents(target.priceCents, HIGHEST_VAT_BPS, terms).vendorCents <= 0) {
    redirect(`${AFFILIATES}?rate=invalid`);
  }

  await db
    .insert(affiliateRate)
    .values({ productId: target.id, affiliateId: affiliateId.data, ...terms })
    .onConflictDoUpdate({ target: [affiliateRate.productId, affiliateRate.affiliateId], set: terms });
  revalidatePath("/dashboard", "layout");
  redirect(`${AFFILIATES}?rate=saved`);
}

/** Back to the product's standard commission for this affiliate. */
export async function clearAffiliateRate(rawProductId: string, rawAffiliateId: string) {
  const actor = await requireActor(AFFILIATES);
  const productId = uuid.safeParse(rawProductId);
  const affiliateId = uuid.safeParse(rawAffiliateId);
  if (!productId.success || !affiliateId.success) redirect(AFFILIATES);

  const target = await db.query.product.findFirst({
    where: eq(product.id, productId.data),
    columns: { id: true, vendorId: true, status: true },
  });
  if (!target || !can.manageProduct(actor, target)) redirect(AFFILIATES);

  await db
    .delete(affiliateRate)
    .where(and(eq(affiliateRate.productId, target.id), eq(affiliateRate.affiliateId, affiliateId.data)));
  revalidatePath("/dashboard", "layout");
  redirect(`${AFFILIATES}?rate=removed`);
}

/* ---------------------------------------------------------------- creatives */

const CREATIVES = "/dashboard/selling/creatives";

export async function createCreative(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor(CREATIVES);
  // A select left on its placeholder sends nothing at all; treat that as empty.
  const values = { size: "", image: "", headline: "", body: "", ...fields(formData) };

  const parsed = creativeSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const v = parsed.data;

  const target = await db.query.product.findFirst({
    where: eq(product.id, v.productId),
    columns: { id: true, vendorId: true, status: true, imageUrl: true },
  });
  if (!target || !can.manageProduct(actor, target)) {
    return { fieldErrors: { productId: ["Choose one of your products."] }, values };
  }
  if ((await db.$count(creative, eq(creative.productId, target.id))) >= 20) {
    return { error: "A product can have up to 20 creatives. Delete one first.", values };
  }

  await db.insert(creative).values(
    v.kind === "banner"
      ? {
          productId: target.id,
          kind: "banner",
          title: v.title,
          size: v.size,
          imageUrl: v.image || target.imageUrl,
          headline: v.headline || null,
        }
      : { productId: target.id, kind: "text", title: v.title, body: v.body },
  );
  revalidatePath("/dashboard", "layout");
  redirect(`${CREATIVES}?creative=created`);
}

export async function deleteCreative(rawId: string) {
  const actor = await requireActor(CREATIVES);
  const id = uuid.safeParse(rawId);
  if (!id.success) redirect(CREATIVES);

  const [found] = await db
    .select({ id: creative.id, vendorId: product.vendorId, status: product.status })
    .from(creative)
    .innerJoin(product, eq(product.id, creative.productId))
    .where(eq(creative.id, id.data))
    .limit(1);
  if (!found || !can.manageProduct(actor, found)) redirect(CREATIVES);

  await db.delete(creative).where(eq(creative.id, found.id));
  revalidatePath("/dashboard", "layout");
  redirect(`${CREATIVES}?creative=deleted`);
}
