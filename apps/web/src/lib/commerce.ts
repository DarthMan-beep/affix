import "server-only";

import { MIN_PAYOUT_CENTS, can, type Actor } from "@affix/auth/permissions";
import {
  affiliate,
  and,
  asc,
  commission,
  db,
  desc,
  eq,
  lte,
  order,
  payout,
  payoutMethod,
  product,
  sql,
  user,
} from "@affix/db";

/*
 * Data functions for orders, commissions and payouts. Same contract as
 * lib/data.ts: take the verified Actor, apply the permission rules, return
 * DTOs. `null` means "not allowed". Bank details are masked before they
 * leave this file, except for the admin who has to pay them out.
 */

/** Approve every pending commission whose refund window has passed. */
export async function settleCommissions() {
  await db
    .update(commission)
    .set({ status: "approved", approvedAt: sql`${commission.availableAt}` })
    .where(and(eq(commission.status, "pending"), lte(commission.availableAt, new Date())));
}

/** "•••• 0000" for an IBAN, "m•••@example.com" for an email. */
export function maskDetails(type: "bank" | "paypal" | "wise", details: string) {
  if (type === "bank") return `•••• ${details.replace(/\s+/g, "").slice(-4)}`;
  const [name, domain] = details.split("@");
  return `${name.slice(0, 1)}•••@${domain ?? ""}`;
}

export const methodLabel = { bank: "Bank transfer", paypal: "PayPal", wise: "Wise" } as const;

/* ------------------------------------------------------------------ vendor */

export async function getOrders(actor: Actor) {
  if (!actor.vendor) return null;
  const orders = await db
    .select({
      id: order.id,
      number: order.number,
      createdAt: order.createdAt,
      productTitle: product.title,
      buyerName: order.buyerName,
      buyerCountry: order.buyerCountry,
      grossCents: order.grossCents,
      vatCents: order.vatCents,
      feeCents: order.feeCents,
      affiliateCents: order.affiliateCents,
      vendorCents: order.vendorCents,
      affiliateHandle: affiliate.handle,
      status: order.status,
    })
    .from(order)
    .innerJoin(product, eq(product.id, order.productId))
    .leftJoin(affiliate, eq(affiliate.id, order.affiliateId))
    .where(eq(order.vendorId, actor.vendor.id))
    .orderBy(desc(order.createdAt))
    .limit(200);

  const sum = (pick: (o: (typeof orders)[number]) => number) => orders.reduce((s, o) => s + pick(o), 0);
  return {
    orders,
    totals: {
      orders: orders.length,
      viaAffiliates: orders.filter((o) => o.affiliateHandle).length,
      grossCents: sum((o) => o.grossCents),
      affiliateCents: sum((o) => o.affiliateCents),
      vendorCents: sum((o) => o.vendorCents),
    },
  };
}

/* --------------------------------------------------------------- affiliate */

export type CommissionState = "pending" | "available" | "in_payout" | "paid" | "rejected" | "reversed";

export async function getEarnings(actor: Actor) {
  if (!actor.affiliate) return null;
  await settleCommissions();

  const rows = await db
    .select({
      id: commission.id,
      createdAt: commission.createdAt,
      availableAt: commission.availableAt,
      amountCents: commission.amountCents,
      status: commission.status,
      orderNumber: order.number,
      grossCents: order.grossCents,
      productTitle: product.title,
      payoutStatus: payout.status,
    })
    .from(commission)
    .innerJoin(order, eq(order.id, commission.orderId))
    .innerJoin(product, eq(product.id, commission.productId))
    .leftJoin(payout, eq(payout.id, commission.payoutId))
    .where(eq(commission.affiliateId, actor.affiliate.id))
    .orderBy(desc(commission.createdAt));

  const commissions = rows.map((r) => {
    const state: CommissionState =
      r.status !== "approved"
        ? r.status
        : r.payoutStatus === "completed"
          ? "paid"
          : r.payoutStatus
            ? "in_payout"
            : "available";
    return { ...r, state };
  });

  const total = (state: CommissionState) =>
    commissions.filter((c) => c.state === state).reduce((s, c) => s + c.amountCents, 0);
  const totals = {
    pendingCents: total("pending"),
    availableCents: total("available"),
    inPayoutCents: total("in_payout"),
    paidCents: total("paid"),
    lifetimeCents: total("pending") + total("available") + total("in_payout") + total("paid"),
    sales: commissions.filter((c) => c.state !== "rejected" && c.state !== "reversed").length,
  };

  return { commissions, totals };
}

export async function getPayouts(actor: Actor) {
  const earnings = await getEarnings(actor);
  if (!earnings || !actor.affiliate) return null;

  const [methods, history] = await Promise.all([
    db
      .select({
        id: payoutMethod.id,
        type: payoutMethod.type,
        holder: payoutMethod.holder,
        details: payoutMethod.details,
        isDefault: payoutMethod.isDefault,
      })
      .from(payoutMethod)
      .where(eq(payoutMethod.affiliateId, actor.affiliate.id))
      .orderBy(desc(payoutMethod.isDefault), asc(payoutMethod.createdAt)),
    db
      .select({
        id: payout.id,
        reference: payout.reference,
        amountCents: payout.amountCents,
        methodType: payout.methodType,
        methodDetails: payout.methodDetails,
        status: payout.status,
        note: payout.note,
        requestedAt: payout.requestedAt,
        completedAt: payout.completedAt,
      })
      .from(payout)
      .where(eq(payout.affiliateId, actor.affiliate.id))
      .orderBy(desc(payout.requestedAt)),
  ]);

  const { availableCents } = earnings.totals;
  return {
    totals: earnings.totals,
    minimumCents: MIN_PAYOUT_CENTS,
    canRequest: can.requestPayout(actor, { availableCents, hasMethod: methods.length > 0 }),
    methods: methods.map((m) => ({ ...m, details: maskDetails(m.type, m.details) })),
    history: history.map((h) => ({ ...h, methodDetails: maskDetails(h.methodType, h.methodDetails) })),
  };
}

/* ------------------------------------------------------------------- admin */

export async function getAdminPayouts(actor: Actor) {
  if (!can.processPayouts(actor)) return null;

  const payouts = await db
    .select({
      id: payout.id,
      reference: payout.reference,
      amountCents: payout.amountCents,
      methodType: payout.methodType,
      methodHolder: payout.methodHolder,
      // Unmasked: the admin needs the destination to make the transfer.
      methodDetails: payout.methodDetails,
      status: payout.status,
      requestedAt: payout.requestedAt,
      sentAt: payout.sentAt,
      completedAt: payout.completedAt,
      affiliateHandle: affiliate.handle,
      affiliateName: user.name,
      affiliateEmail: user.email,
    })
    .from(payout)
    .innerJoin(affiliate, eq(affiliate.id, payout.affiliateId))
    .innerJoin(user, eq(user.id, affiliate.userId))
    .orderBy(desc(payout.requestedAt))
    .limit(200);

  const by = (status: (typeof payouts)[number]["status"]) => payouts.filter((p) => p.status === status);
  const cents = (list: typeof payouts) => list.reduce((s, p) => s + p.amountCents, 0);
  return {
    payouts,
    totals: {
      requested: by("requested").length,
      requestedCents: cents(by("requested")),
      sentCents: cents(by("sent")),
      completedCents: cents(by("completed")),
    },
  };
}

/** How many payout requests are waiting, for the admin navigation badge. */
export async function countRequestedPayouts(actor: Actor) {
  if (!can.processPayouts(actor)) return 0;
  return db.$count(payout, eq(payout.status, "requested"));
}
