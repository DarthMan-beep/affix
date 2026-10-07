import "server-only";

import { can, type Actor } from "@affix/auth/permissions";
import {
  affiliate,
  affiliateLink,
  affiliateRate,
  and,
  commission,
  creative,
  db,
  desc,
  eq,
  inArray,
  isNotNull,
  ne,
  order,
  product,
  productApplication,
  sql,
  user,
} from "@affix/db";
import { settleCommissions } from "@/lib/commerce";
import { sellingNav } from "@/lib/dashboard-nav";
import { addDays, dayKey, daysIn, startOfDay, type DateRange } from "@/lib/range";

/*
 * Data functions for the vendor's side: the sales overview, commission
 * review, affiliates and their custom rates, and creatives. Same contract as
 * lib/data.ts: take the verified Actor, apply the rules, return DTOs.
 * Refunded orders never count towards revenue.
 */

/* --------------------------------------------------------------- navigation */

/** The Selling tabs, with badges for what is waiting on the vendor. */
export async function sellingNavFor(actor: Actor) {
  if (!actor.vendor) return sellingNav;
  const vendorId = actor.vendor.id;
  const [[applications], [commissions]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(productApplication)
      .innerJoin(product, eq(product.id, productApplication.productId))
      .where(and(eq(product.vendorId, vendorId), eq(productApplication.status, "pending"))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(commission)
      .innerJoin(product, eq(product.id, commission.productId))
      .where(
        and(
          eq(product.vendorId, vendorId),
          eq(commission.status, "pending"),
          eq(commission.manualReview, true),
          eq(commission.onHold, false),
        ),
      ),
  ]);
  return sellingNav.map((item) =>
    item.href.endsWith("/applications")
      ? { ...item, count: applications?.n ?? 0 }
      : item.href.endsWith("/commissions")
        ? { ...item, count: commissions?.n ?? 0 }
        : item,
  );
}

/* ----------------------------------------------------------------- overview */

export async function getSellingOverview(actor: Actor, range: DateRange) {
  if (!actor.vendor) return null;

  const orders = await db
    .select({
      createdAt: order.createdAt,
      grossCents: order.grossCents,
      affiliateCents: order.affiliateCents,
      vendorCents: order.vendorCents,
      affiliateHandle: affiliate.handle,
      productTitle: product.title,
    })
    .from(order)
    .innerJoin(product, eq(product.id, order.productId))
    .leftJoin(affiliate, eq(affiliate.id, order.affiliateId))
    .where(and(eq(order.vendorId, actor.vendor.id), eq(order.status, "paid")));

  const today = startOfDay(new Date());
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const keptSince = (start: Date) =>
    orders.filter((o) => o.createdAt >= start).reduce((s, o) => s + o.vendorCents, 0);

  const inRange = orders.filter((o) => o.createdAt >= range.from && o.createdAt <= range.to);
  const sum = (rows: typeof orders, pick: (o: (typeof orders)[number]) => number) =>
    rows.reduce((s, o) => s + pick(o), 0);
  const viaAffiliates = inRange.filter((o) => o.affiliateHandle);
  const direct = inRange.filter((o) => !o.affiliateHandle);

  const days = new Map(daysIn(range).map((d) => [dayKey(d), { date: dayKey(d), revenueCents: 0, sales: 0 }]));
  for (const o of inRange) {
    const day = days.get(dayKey(o.createdAt));
    if (!day) continue;
    day.revenueCents += o.grossCents;
    day.sales += 1;
  }

  const byAffiliate = new Map<string, { handle: string; sales: number; revenueCents: number; commissionCents: number }>();
  for (const o of viaAffiliates) {
    const row = byAffiliate.get(o.affiliateHandle!) ?? { handle: o.affiliateHandle!, sales: 0, revenueCents: 0, commissionCents: 0 };
    row.sales += 1;
    row.revenueCents += o.grossCents;
    row.commissionCents += o.affiliateCents;
    byAffiliate.set(row.handle, row);
  }
  const byProduct = new Map<string, number>();
  for (const o of inRange) byProduct.set(o.productTitle, (byProduct.get(o.productTitle) ?? 0) + o.grossCents);

  return {
    periods: {
      todayCents: keptSince(today),
      weekCents: keptSince(weekStart),
      monthCents: keptSince(monthStart),
      allTimeCents: sum(orders, (o) => o.vendorCents),
    },
    totals: {
      orders: inRange.length,
      revenueCents: sum(inRange, (o) => o.grossCents),
      commissionsCents: sum(inRange, (o) => o.affiliateCents),
      keptCents: sum(inRange, (o) => o.vendorCents),
    },
    series: [...days.values()],
    channels: [
      { label: "Through affiliates", value: sum(viaAffiliates, (o) => o.grossCents), sales: viaAffiliates.length },
      { label: "Direct", value: sum(direct, (o) => o.grossCents), sales: direct.length },
    ],
    topAffiliates: [...byAffiliate.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
    topProducts: [...byProduct.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
  };
}

/* -------------------------------------------------------------- commissions */

export type ReviewState = "review" | "hold" | "waiting" | "approved" | "rejected" | "reversed";

export async function getVendorCommissions(actor: Actor) {
  if (!actor.vendor) return null;
  await settleCommissions();

  const rows = await db
    .select({
      id: commission.id,
      createdAt: commission.createdAt,
      availableAt: commission.availableAt,
      amountCents: commission.amountCents,
      status: commission.status,
      manualReview: commission.manualReview,
      onHold: commission.onHold,
      note: commission.note,
      orderNumber: order.number,
      grossCents: order.grossCents,
      productTitle: product.title,
      vendorId: product.vendorId,
      affiliateHandle: affiliate.handle,
    })
    .from(commission)
    .innerJoin(order, eq(order.id, commission.orderId))
    .innerJoin(product, eq(product.id, commission.productId))
    .innerJoin(affiliate, eq(affiliate.id, commission.affiliateId))
    .where(eq(product.vendorId, actor.vendor.id))
    .orderBy(desc(commission.createdAt))
    .limit(300);

  return rows.map((r) => {
    const state: ReviewState =
      r.status !== "pending" ? r.status : r.onHold ? "hold" : r.manualReview ? "review" : "waiting";
    return { ...r, state, canReview: can.reviewCommission(actor, r) };
  });
}

/* --------------------------------------------------------------- affiliates */

/** Every affiliate promoting one of the vendor's products, with what they brought in. */
export async function getVendorAffiliates(actor: Actor) {
  if (!actor.vendor) return null;
  const vendorId = actor.vendor.id;

  const [links, sales, rates] = await Promise.all([
    db
      .select({
        affiliateId: affiliate.id,
        handle: affiliate.handle,
        name: user.name,
        productId: product.id,
        productTitle: product.title,
        priceCents: product.priceCents,
        commissionType: product.commissionType,
        commissionBps: product.commissionBps,
        commissionFixedCents: product.commissionFixedCents,
        links: sql<number>`count(${affiliateLink.id})::int`,
        clicks: sql<number>`coalesce(sum(${affiliateLink.clicks}), 0)::int`,
      })
      .from(affiliateLink)
      .innerJoin(product, eq(product.id, affiliateLink.productId))
      .innerJoin(affiliate, eq(affiliate.id, affiliateLink.affiliateId))
      .innerJoin(user, eq(user.id, affiliate.userId))
      .where(and(eq(product.vendorId, vendorId), ne(product.status, "archived")))
      .groupBy(affiliate.id, user.name, product.id),
    db
      .select({
        affiliateId: order.affiliateId,
        productId: order.productId,
        sales: sql<number>`count(*)::int`,
        revenueCents: sql<number>`coalesce(sum(${order.grossCents}), 0)::int`,
        commissionCents: sql<number>`coalesce(sum(${order.affiliateCents}), 0)::int`,
      })
      .from(order)
      .where(and(eq(order.vendorId, vendorId), eq(order.status, "paid"), isNotNull(order.affiliateId)))
      .groupBy(order.affiliateId, order.productId),
    db
      .select({
        affiliateId: affiliateRate.affiliateId,
        productId: affiliateRate.productId,
        commissionType: affiliateRate.commissionType,
        commissionBps: affiliateRate.commissionBps,
        commissionFixedCents: affiliateRate.commissionFixedCents,
      })
      .from(affiliateRate)
      .innerJoin(product, eq(product.id, affiliateRate.productId))
      .where(eq(product.vendorId, vendorId)),
  ]);

  const key = (affiliateId: string | null, productId: string) => `${affiliateId}:${productId}`;
  const salesBy = new Map(sales.map((s) => [key(s.affiliateId, s.productId), s]));
  const rateBy = new Map(rates.map((r) => [key(r.affiliateId, r.productId), r]));

  return links
    .map((l) => {
      const s = salesBy.get(key(l.affiliateId, l.productId));
      return {
        ...l,
        sales: s?.sales ?? 0,
        revenueCents: s?.revenueCents ?? 0,
        commissionCents: s?.commissionCents ?? 0,
        standard: {
          commissionType: l.commissionType,
          commissionBps: l.commissionBps,
          commissionFixedCents: l.commissionFixedCents,
        },
        custom: rateBy.get(key(l.affiliateId, l.productId)) ?? null,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents || b.clicks - a.clicks);
}

/* ---------------------------------------------------------------- creatives */

const creativeFields = {
  id: creative.id,
  kind: creative.kind,
  title: creative.title,
  size: creative.size,
  imageUrl: creative.imageUrl,
  headline: creative.headline,
  body: creative.body,
  createdAt: creative.createdAt,
  productId: product.id,
  productTitle: product.title,
};

/** The vendor's creatives, and the products a new one can be made for. */
export async function getVendorCreatives(actor: Actor) {
  if (!actor.vendor) return null;
  const [creatives, products] = await Promise.all([
    db
      .select(creativeFields)
      .from(creative)
      .innerJoin(product, eq(product.id, creative.productId))
      .where(eq(product.vendorId, actor.vendor.id))
      .orderBy(product.title, desc(creative.createdAt)),
    db
      .select({ id: product.id, title: product.title, imageUrl: product.imageUrl })
      .from(product)
      .where(and(eq(product.vendorId, actor.vendor.id), ne(product.status, "archived")))
      .orderBy(product.title),
  ]);
  return { creatives, products };
}

/**
 * Creatives an affiliate can use: those of published products they have a
 * link for. Each comes with the link to put behind it (their main link for
 * that product, or the first campaign link if they deleted the main one).
 */
export async function getAffiliateCreatives(actor: Actor) {
  if (!actor.affiliate) return null;

  const links = await db
    .select({
      productId: affiliateLink.productId,
      code: affiliateLink.code,
      campaign: affiliateLink.campaign,
    })
    .from(affiliateLink)
    .where(and(eq(affiliateLink.affiliateId, actor.affiliate.id), eq(affiliateLink.status, "active")))
    .orderBy(affiliateLink.createdAt);

  const linkBy = new Map<string, string>();
  for (const l of links) {
    if (!linkBy.has(l.productId) || l.campaign === null) linkBy.set(l.productId, l.code);
  }
  if (linkBy.size === 0) return { creatives: [], products: [] };

  const creatives = await db
    .select(creativeFields)
    .from(creative)
    .innerJoin(product, eq(product.id, creative.productId))
    .where(and(inArray(creative.productId, [...linkBy.keys()]), eq(product.status, "published")))
    .orderBy(product.title, desc(creative.createdAt));

  return {
    creatives: creatives.map((c) => ({ ...c, linkCode: linkBy.get(c.productId)! })),
    products: [...new Map(creatives.map((c) => [c.productId, c.productTitle])).entries()].map(([id, title]) => ({
      id,
      title,
    })),
  };
}
