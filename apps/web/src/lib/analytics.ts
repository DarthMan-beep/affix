import "server-only";

import { can, type Actor } from "@affix/auth/permissions";
import {
  affiliate,
  affiliateLink,
  and,
  click,
  commission,
  db,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  ne,
  order,
  payout,
  product,
  productApplication,
  sql,
  user,
  vendor,
} from "@affix/db";
import { getEarnings } from "@/lib/commerce";
import { splitCents } from "@/lib/money";
import { addDays, dayKey, daysIn, startOfDay, type DateRange } from "@/lib/range";

/*
 * Data functions for the affiliate dashboards: overview, links, marketplace
 * and analytics, plus the vendor's application queue. Same contract as
 * lib/data.ts: take the verified Actor, apply the rules, return DTOs.
 * Crawler clicks are logged but never counted here.
 */

const EARNING = ["pending", "approved"] as const;

/** A readable traffic source: the link's sub-id, else where the visitor came from. */
export function sourceOf(c: { subId: string | null; referrer: string | null }) {
  if (c.subId) return c.subId;
  if (!c.referrer) return "Direct";
  let host: string;
  try {
    host = new URL(c.referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
  const known: [RegExp, string][] = [
    [/instagram\./, "Instagram"],
    [/youtube\.|youtu\.be/, "YouTube"],
    [/tiktok\./, "TikTok"],
    [/^t\.co$|twitter\.|^x\.com$/, "X"],
    [/facebook\.|fb\./, "Facebook"],
    [/google\./, "Google"],
    [/localhost|127\.0\.0\.1/, "Direct"],
  ];
  return known.find(([re]) => re.test(host))?.[1] ?? host;
}

/** Clicks and commissions of one affiliate since `from` (everything the dashboards chart). */
async function loadActivity(affiliateId: string, from: Date) {
  const [clicks, sales] = await Promise.all([
    db
      .select({
        createdAt: click.createdAt,
        linkId: click.linkId,
        productId: click.productId,
        isUnique: click.isUnique,
        device: click.device,
        referrer: click.referrer,
        country: click.country,
        subId: click.subId,
      })
      .from(click)
      .where(and(eq(click.affiliateId, affiliateId), ne(click.device, "bot"), gte(click.createdAt, from))),
    db
      .select({
        id: commission.id,
        createdAt: commission.createdAt,
        amountCents: commission.amountCents,
        status: commission.status,
        productId: commission.productId,
        productTitle: product.title,
        grossCents: order.grossCents,
        linkId: order.linkId,
        orderNumber: order.number,
      })
      .from(commission)
      .innerJoin(order, eq(order.id, commission.orderId))
      .innerJoin(product, eq(product.id, commission.productId))
      .where(
        and(
          eq(commission.affiliateId, affiliateId),
          inArray(commission.status, [...EARNING]),
          gte(commission.createdAt, from),
        ),
      ),
  ]);
  return { clicks, sales };
}

type Activity = Awaited<ReturnType<typeof loadActivity>>;

function dailySeries(range: DateRange, { clicks, sales }: Activity) {
  const days = new Map(
    daysIn(range).map((d) => [
      dayKey(d),
      { date: dayKey(d), clicks: 0, uniqueClicks: 0, sales: 0, earningsCents: 0, revenueCents: 0, pending: 0, approved: 0 },
    ]),
  );
  for (const c of clicks) {
    const day = days.get(dayKey(c.createdAt));
    if (!day) continue;
    day.clicks += 1;
    if (c.isUnique) day.uniqueClicks += 1;
  }
  for (const s of sales) {
    const day = days.get(dayKey(s.createdAt));
    if (!day) continue;
    day.sales += 1;
    day.earningsCents += s.amountCents;
    day.revenueCents += s.grossCents;
    if (s.status === "pending") day.pending += 1;
    else day.approved += 1;
  }
  return [...days.values()];
}

const inRange = (range: DateRange) => (row: { createdAt: Date }) =>
  row.createdAt >= range.from && row.createdAt <= range.to;

const rate = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/* ---------------------------------------------------------------- overview */

export async function getOverview(actor: Actor, range: DateRange) {
  const earnings = await getEarnings(actor);
  if (!earnings || !actor.affiliate) return null;
  const affiliateId = actor.affiliate.id;

  const now = new Date();
  const today = startOfDay(now);
  // Monday of this week, and the first of this month.
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const earned = earnings.commissions.filter((c) => c.state !== "rejected" && c.state !== "reversed");
  const since = (start: Date) => earned.filter((c) => c.createdAt >= start).reduce((s, c) => s + c.amountCents, 0);

  const activity = await loadActivity(affiliateId, range.from < today ? range.from : today);
  const clicks = activity.clicks.filter(inRange(range));
  const sales = activity.sales.filter(inRange(range));

  const [links, recentClicks, recentPayouts] = await Promise.all([
    db
      .select({
        id: affiliateLink.id,
        code: affiliateLink.code,
        campaign: affiliateLink.campaign,
        status: affiliateLink.status,
        productTitle: product.title,
      })
      .from(affiliateLink)
      .innerJoin(product, eq(product.id, affiliateLink.productId))
      .where(eq(affiliateLink.affiliateId, affiliateId)),
    db
      .select({
        createdAt: click.createdAt,
        referrer: click.referrer,
        subId: click.subId,
        productTitle: product.title,
      })
      .from(click)
      .innerJoin(product, eq(product.id, click.productId))
      .where(and(eq(click.affiliateId, affiliateId), ne(click.device, "bot")))
      .orderBy(desc(click.createdAt))
      .limit(10),
    db
      .select({ at: payout.requestedAt, completedAt: payout.completedAt, amountCents: payout.amountCents, status: payout.status })
      .from(payout)
      .where(eq(payout.affiliateId, affiliateId))
      .orderBy(desc(payout.requestedAt))
      .limit(5),
  ]);

  const topLinks = links
    .map((l) => {
      const linkClicks = clicks.filter((c) => c.linkId === l.id).length;
      const linkSales = sales.filter((s) => s.linkId === l.id);
      return {
        ...l,
        clicks: linkClicks,
        sales: linkSales.length,
        earningsCents: linkSales.reduce((s, x) => s + x.amountCents, 0),
        conversion: rate(linkSales.length, linkClicks),
      };
    })
    .filter((l) => l.clicks > 0 || l.sales > 0)
    .sort((a, b) => b.earningsCents - a.earningsCents || b.clicks - a.clicks)
    .slice(0, 5);

  type Event =
    | { kind: "click"; at: Date; source: string; productTitle: string }
    | { kind: "sale"; at: Date; amountCents: number; productTitle: string }
    | { kind: "payout"; at: Date; amountCents: number; status: "requested" | "sent" | "completed" | "rejected" };
  const events: Event[] = [
    ...recentClicks.map((c) => ({ kind: "click" as const, at: c.createdAt, source: sourceOf(c), productTitle: c.productTitle })),
    ...earned
      .slice(0, 10)
      .map((c) => ({ kind: "sale" as const, at: c.createdAt, amountCents: c.amountCents, productTitle: c.productTitle })),
    ...recentPayouts.map((p) => ({
      kind: "payout" as const,
      at: p.completedAt ?? p.at,
      amountCents: p.amountCents,
      status: p.status,
    })),
  ];

  return {
    periods: {
      todayCents: since(today),
      weekCents: since(weekStart),
      monthCents: since(monthStart),
      lifetimeCents: earnings.totals.lifetimeCents,
      pendingCents: earnings.totals.pendingCents,
      availableCents: earnings.totals.availableCents,
    },
    today: {
      clicks: activity.clicks.filter((c) => c.createdAt >= today).length,
      sales: activity.sales.filter((s) => s.createdAt >= today).length,
    },
    totals: {
      clicks: clicks.length,
      sales: sales.length,
      earningsCents: sales.reduce((s, x) => s + x.amountCents, 0),
      conversion: rate(sales.length, clicks.length),
      activeLinks: links.filter((l) => l.status === "active").length,
    },
    series: dailySeries(range, { clicks, sales }),
    topLinks,
    events: events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10),
  };
}

/* ------------------------------------------------------------------- links */

export async function getLinks(actor: Actor) {
  if (!actor.affiliate) return null;
  const affiliateId = actor.affiliate.id;

  const [links, uniques, sales, catalog, applications] = await Promise.all([
    db
      .select({
        id: affiliateLink.id,
        code: affiliateLink.code,
        campaign: affiliateLink.campaign,
        status: affiliateLink.status,
        clicks: affiliateLink.clicks,
        utmSource: affiliateLink.utmSource,
        utmMedium: affiliateLink.utmMedium,
        utmCampaign: affiliateLink.utmCampaign,
        createdAt: affiliateLink.createdAt,
        productId: product.id,
        productTitle: product.title,
        productStatus: product.status,
        imageUrl: product.imageUrl,
      })
      .from(affiliateLink)
      .innerJoin(product, eq(product.id, affiliateLink.productId))
      .where(eq(affiliateLink.affiliateId, affiliateId))
      .orderBy(desc(affiliateLink.clicks)),
    db
      .select({ linkId: click.linkId, unique: sql<number>`count(*)::int` })
      .from(click)
      .where(and(eq(click.affiliateId, affiliateId), ne(click.device, "bot"), eq(click.isUnique, true)))
      .groupBy(click.linkId),
    db
      .select({
        linkId: order.linkId,
        sales: sql<number>`count(*)::int`,
        earnedCents: sql<number>`coalesce(sum(${commission.amountCents}), 0)::int`,
      })
      .from(commission)
      .innerJoin(order, eq(order.id, commission.orderId))
      .where(and(eq(commission.affiliateId, affiliateId), inArray(commission.status, [...EARNING]), isNotNull(order.linkId)))
      .groupBy(order.linkId),
    db
      .select({
        id: product.id,
        title: product.title,
        slug: product.slug,
        status: product.status,
        vendorId: product.vendorId,
        approval: product.approval,
      })
      .from(product)
      .where(eq(product.status, "published"))
      .orderBy(product.title),
    db
      .select({ productId: productApplication.productId, status: productApplication.status })
      .from(productApplication)
      .where(eq(productApplication.affiliateId, affiliateId)),
  ]);

  const uniqueBy = new Map(uniques.map((u) => [u.linkId, u.unique]));
  const salesBy = new Map(sales.map((s) => [s.linkId, s]));
  const applicationBy = new Map(applications.map((a) => [a.productId, a]));

  return {
    links: links.map((l) => {
      const s = salesBy.get(l.id);
      return {
        ...l,
        uniqueClicks: uniqueBy.get(l.id) ?? 0,
        sales: s?.sales ?? 0,
        earnedCents: s?.earnedCents ?? 0,
        conversion: rate(s?.sales ?? 0, l.clicks),
      };
    }),
    // Products this affiliate may create a link for right now.
    linkable: catalog
      .filter((p) => can.createLink(actor, p, applicationBy.get(p.id) ?? null))
      .map((p) => ({ id: p.id, title: p.title })),
  };
}

/* ------------------------------------------------------------- marketplace */

export type MarketplaceFilters = {
  tab: "all" | "mine";
  category: string;
  type: "" | "percent" | "fixed";
  /** Minimum earnings per sale, in cents. */
  minCents: number;
  sort: "commission" | "epc" | "newest";
};

/** VAT used to compare what products pay per sale (20%, the most common rate). */
const REFERENCE_VAT_BPS = 2000;

export async function getMarketplace(actor: Actor, filters: MarketplaceFilters) {
  if (!actor.affiliate) return null;
  const affiliateId = actor.affiliate.id;

  const [catalog, clicksBy, salesBy, myLinks, myApplications] = await Promise.all([
    db
      .select({
        id: product.id,
        slug: product.slug,
        title: product.title,
        category: product.category,
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        commissionType: product.commissionType,
        commissionBps: product.commissionBps,
        commissionFixedCents: product.commissionFixedCents,
        cookieDays: product.cookieDays,
        approval: product.approval,
        status: product.status,
        createdAt: product.createdAt,
        vendorId: product.vendorId,
        vendorName: vendor.displayName,
      })
      .from(product)
      .innerJoin(vendor, eq(vendor.id, product.vendorId))
      .where(eq(product.status, "published")),
    // Marketplace-wide performance of each product, across all affiliates.
    db
      .select({ productId: click.productId, clicks: sql<number>`count(*)::int` })
      .from(click)
      .where(ne(click.device, "bot"))
      .groupBy(click.productId),
    db
      .select({
        productId: commission.productId,
        sales: sql<number>`count(*)::int`,
        paidCents: sql<number>`coalesce(sum(${commission.amountCents}), 0)::int`,
      })
      .from(commission)
      .where(inArray(commission.status, [...EARNING]))
      .groupBy(commission.productId),
    db
      .select({ productId: affiliateLink.productId, links: sql<number>`count(*)::int` })
      .from(affiliateLink)
      .where(eq(affiliateLink.affiliateId, affiliateId))
      .groupBy(affiliateLink.productId),
    db
      .select({ productId: productApplication.productId, status: productApplication.status })
      .from(productApplication)
      .where(eq(productApplication.affiliateId, affiliateId)),
  ]);

  const clicks = new Map(clicksBy.map((c) => [c.productId, c.clicks]));
  const sales = new Map(salesBy.map((s) => [s.productId, s]));
  const links = new Map(myLinks.map((l) => [l.productId, l.links]));
  const applications = new Map(myApplications.map((a) => [a.productId, a]));

  const promotable = catalog.filter((p) => can.promoteProduct(actor, p));
  const products = promotable.map((p) => {
    const application = applications.get(p.id) ?? null;
    const productClicks = clicks.get(p.id) ?? 0;
    const productSales = sales.get(p.id);
    const myLinkCount = links.get(p.id) ?? 0;
    const state =
      myLinkCount > 0
        ? ("promoting" as const)
        : can.createLink(actor, p, application)
          ? ("available" as const)
          : can.applyToProduct(actor, p, application)
            ? ("apply" as const)
            : application?.status === "rejected"
              ? ("rejected" as const)
              : ("applied" as const);
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      imageUrl: p.imageUrl,
      priceCents: p.priceCents,
      commissionType: p.commissionType,
      commissionBps: p.commissionBps,
      commissionFixedCents: p.commissionFixedCents,
      cookieDays: p.cookieDays,
      approval: p.approval,
      createdAt: p.createdAt,
      vendorName: p.vendorName,
      // What one sale pays, so percentage and fixed commissions compare.
      perSaleCents: splitCents(p.priceCents, REFERENCE_VAT_BPS, p).affiliateCents,
      // Earnings per click and conversion rate; null until the product has traffic.
      epcCents: productClicks > 0 ? Math.round((productSales?.paidCents ?? 0) / productClicks) : null,
      conversion: productClicks > 0 ? rate(productSales?.sales ?? 0, productClicks) : null,
      state,
      mine: myLinkCount > 0 || application?.status === "approved",
    };
  });

  const filtered = products
    .filter((p) => filters.tab === "all" || p.mine)
    .filter((p) => !filters.category || p.category === filters.category)
    .filter((p) => !filters.type || p.commissionType === filters.type)
    .filter((p) => p.perSaleCents >= filters.minCents)
    .sort((a, b) =>
      filters.sort === "newest"
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : filters.sort === "epc"
          ? (b.epcCents ?? -1) - (a.epcCents ?? -1)
          : b.perSaleCents - a.perSaleCents,
    );

  return {
    products: filtered,
    categories: [...new Set(promotable.map((p) => p.category))].sort(),
    counts: { all: products.length, mine: products.filter((p) => p.mine).length },
    ownProductsHidden: catalog.some((p) => p.vendorId === actor.vendor?.id),
  };
}

/* --------------------------------------------------------------- analytics */

const regions = new Intl.DisplayNames(["en"], { type: "region" });
/** "DE" → "Germany". Clicks without a known country (e.g. on localhost) are "Unknown". */
function countryName(code: string | null) {
  if (!code) return "Unknown";
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
}

const tally = <T,>(rows: T[], key: (row: T) => string, value: (row: T) => number = () => 1) => {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + value(row));
  return [...totals.entries()].map(([label, total]) => ({ label, value: total })).sort((a, b) => b.value - a.value);
};

/** Keep the biggest `limit` rows and fold the rest into "Other". */
function top(rows: { label: string; value: number }[], limit: number) {
  if (rows.length <= limit) return rows;
  const rest = rows.slice(limit - 1).reduce((s, r) => s + r.value, 0);
  return [...rows.slice(0, limit - 1), { label: "Other", value: rest }];
}

export async function getAnalytics(actor: Actor, range: DateRange) {
  if (!actor.affiliate) return null;
  const activity = await loadActivity(actor.affiliate.id, range.from);
  const clicks = activity.clicks.filter(inRange(range));
  const sales = activity.sales.filter(inRange(range));

  const earningsCents = sales.reduce((s, x) => s + x.amountCents, 0);
  const revenueCents = sales.reduce((s, x) => s + x.grossCents, 0);

  // Clicks by weekday (Monday first) and hour of day.
  const heatmap = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const c of clicks) heatmap[(c.createdAt.getDay() + 6) % 7][c.createdAt.getHours()] += 1;

  return {
    totals: {
      clicks: clicks.length,
      uniqueClicks: clicks.filter((c) => c.isUnique).length,
      sales: sales.length,
      earningsCents,
      revenueCents,
      conversion: rate(sales.length, clicks.length),
      epcCents: clicks.length > 0 ? Math.round(earningsCents / clicks.length) : 0,
      averageOrderCents: sales.length > 0 ? Math.round(revenueCents / sales.length) : 0,
    },
    series: dailySeries(range, { clicks, sales }),
    byProduct: top(tally(sales, (s) => s.productTitle, (s) => s.amountCents), 6),
    bySource: top(tally(clicks, sourceOf), 6),
    byDevice: tally(clicks, (c) => c.device[0].toUpperCase() + c.device.slice(1)),
    byCountry: top(tally(clicks, (c) => countryName(c.country)), 6),
    heatmap,
  };
}

/* ------------------------------------------------- applications (vendors) */

export async function getApplications(actor: Actor) {
  if (!actor.vendor) return null;
  return db
    .select({
      id: productApplication.id,
      status: productApplication.status,
      message: productApplication.message,
      createdAt: productApplication.createdAt,
      decidedAt: productApplication.decidedAt,
      productTitle: product.title,
      affiliateHandle: affiliate.handle,
      affiliateName: user.name,
      // What the vendor can judge the affiliate by: their track record on Affix.
      affiliateSales: sql<number>`(select count(*)::int from ${commission} where ${commission.affiliateId} = ${affiliate.id})`,
    })
    .from(productApplication)
    .innerJoin(product, eq(product.id, productApplication.productId))
    .innerJoin(affiliate, eq(affiliate.id, productApplication.affiliateId))
    .innerJoin(user, eq(user.id, affiliate.userId))
    .where(eq(product.vendorId, actor.vendor.id))
    .orderBy(desc(productApplication.createdAt));
}

export async function countPendingApplications(actor: Actor) {
  if (!actor.vendor) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(productApplication)
    .innerJoin(product, eq(product.id, productApplication.productId))
    .where(and(eq(product.vendorId, actor.vendor.id), eq(productApplication.status, "pending")));
  return row?.n ?? 0;
}
