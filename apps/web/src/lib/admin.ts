import "server-only";

import { can, parseRoles, type Actor } from "@affix/auth/permissions";
import {
  adjustment,
  affiliate,
  affiliateLink,
  and,
  blocklist,
  click,
  commission,
  db,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  order,
  payout,
  product,
  referral,
  referralBonus,
  sql,
  user,
  vendor,
} from "@affix/db";
import { getEarnings } from "@/lib/commerce";
import { adminNav } from "@/lib/dashboard-nav";
import { FRAUD_WINDOW_DAYS, NO_SIGNALS, getTrustScores } from "@/lib/fraud";
import { dayKey, daysIn, type DateRange } from "@/lib/range";

/*
 * Data functions for platform staff. Every one starts with a permission check
 * and returns null to anyone who isn't an admin. Unlike the vendor and
 * affiliate views, these see the whole platform.
 */

/* --------------------------------------------------------------- navigation */

/** The Admin tabs, with badges for what is waiting on staff. */
export async function adminNavFor(actor: Actor) {
  if (!can.viewAdmin(actor)) return adminNav;
  const [requested, trust] = await Promise.all([
    db.$count(payout, eq(payout.status, "requested")),
    getTrustScores(),
  ]);
  const atRisk = [...trust.values()].filter((t) => t.level === "risk").length;
  return adminNav.map((item) =>
    item.href.endsWith("/payouts")
      ? { ...item, count: requested }
      : item.href.endsWith("/fraud")
        ? { ...item, count: atRisk }
        : item,
  );
}

/* ----------------------------------------------------------------- overview */

export async function getPlatformOverview(actor: Actor, range: DateRange) {
  if (!can.viewAdmin(actor)) return null;

  const [orders, [clicks], signups, [waiting], [suspended], trust, [bonuses]] = await Promise.all([
    db
      .select({
        createdAt: order.createdAt,
        grossCents: order.grossCents,
        vatCents: order.vatCents,
        feeCents: order.feeCents,
        affiliateCents: order.affiliateCents,
        vendorCents: order.vendorCents,
        affiliateHandle: affiliate.handle,
        category: product.category,
      })
      .from(order)
      .innerJoin(product, eq(product.id, order.productId))
      .leftJoin(affiliate, eq(affiliate.id, order.affiliateId))
      .where(and(eq(order.status, "paid"), gte(order.createdAt, range.from))),
    db
      .select({
        clicks: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${click.visitorId})::int`,
      })
      .from(click)
      .where(and(gte(click.createdAt, range.from), sql`${click.device} <> 'bot'`)),
    db.select({ createdAt: user.createdAt }).from(user).where(gte(user.createdAt, range.from)),
    db
      .select({ n: sql<number>`count(*)::int`, cents: sql<number>`coalesce(sum(${payout.amountCents}), 0)::int` })
      .from(payout)
      .where(eq(payout.status, "requested")),
    db.select({ n: sql<number>`count(*)::int` }).from(affiliate).where(eq(affiliate.suspended, true)),
    getTrustScores(),
    // Referral bonuses on this period's sales: the part of its fees Affix passes on to inviters.
    db
      .select({ cents: sql<number>`coalesce(sum(${referralBonus.amountCents}), 0)::int` })
      .from(referralBonus)
      .innerJoin(commission, eq(commission.id, referralBonus.commissionId))
      .innerJoin(order, eq(order.id, commission.orderId))
      .where(
        and(
          gte(order.createdAt, range.from),
          lte(order.createdAt, range.to),
          inArray(commission.status, ["pending", "approved"]),
        ),
      ),
  ]);

  const referralBonusCents = bonuses?.cents ?? 0;
  const paid = orders.filter((o) => o.createdAt <= range.to);
  const sum = (pick: (o: (typeof orders)[number]) => number) => paid.reduce((s, o) => s + pick(o), 0);
  const viaAffiliates = paid.filter((o) => o.affiliateHandle);

  const days = new Map(
    daysIn(range).map((d) => [dayKey(d), { date: dayKey(d), revenueCents: 0, feeCents: 0, signups: 0 }]),
  );
  for (const o of paid) {
    const day = days.get(dayKey(o.createdAt));
    if (!day) continue;
    day.revenueCents += o.grossCents;
    day.feeCents += o.feeCents;
  }
  for (const s of signups) {
    const day = days.get(dayKey(s.createdAt));
    if (day) day.signups += 1;
  }

  const byAffiliate = new Map<string, { handle: string; sales: number; revenueCents: number; commissionCents: number }>();
  for (const o of viaAffiliates) {
    const row = byAffiliate.get(o.affiliateHandle!) ?? { handle: o.affiliateHandle!, sales: 0, revenueCents: 0, commissionCents: 0 };
    row.sales += 1;
    row.revenueCents += o.grossCents;
    row.commissionCents += o.affiliateCents;
    byAffiliate.set(row.handle, row);
  }
  const byCategory = new Map<string, number>();
  for (const o of paid) byCategory.set(o.category, (byCategory.get(o.category) ?? 0) + o.grossCents);

  return {
    totals: {
      orders: paid.length,
      revenueCents: sum((o) => o.grossCents),
      vatCents: sum((o) => o.vatCents),
      feeCents: sum((o) => o.feeCents),
      commissionsCents: sum((o) => o.affiliateCents),
      vendorCents: sum((o) => o.vendorCents),
      signups: signups.filter((s) => s.createdAt <= range.to).length,
    },
    series: [...days.values()],
    // Where every euro of revenue went.
    split: [
      { label: "Vendors", value: sum((o) => o.vendorCents) },
      { label: "Affiliates", value: sum((o) => o.affiliateCents) },
      { label: "VAT", value: sum((o) => o.vatCents) },
      { label: "Affix fees", value: sum((o) => o.feeCents) - referralBonusCents },
      ...(referralBonusCents > 0 ? [{ label: "Referral bonuses", value: referralBonusCents }] : []),
    ].sort((a, b) => b.value - a.value),
    funnel: [
      { label: "Clicks on affiliate links", value: clicks?.clicks ?? 0 },
      { label: "Visitors", value: clicks?.visitors ?? 0 },
      { label: "Sales through affiliates", value: viaAffiliates.length },
    ],
    topAffiliates: [...byAffiliate.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
    byCategory: [...byCategory.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    alerts: {
      payoutsWaiting: waiting?.n ?? 0,
      payoutsWaitingCents: waiting?.cents ?? 0,
      atRisk: [...trust.values()].filter((t) => t.level === "risk").length,
      toWatch: [...trust.values()].filter((t) => t.level === "watch").length,
      suspended: suspended?.n ?? 0,
    },
  };
}

/* --------------------------------------------------------------- affiliates */

export type AffiliateFilters = {
  q: string;
  status: "" | "active" | "suspended" | "banned";
  sort: "revenue" | "trust" | "newest";
};

export async function getAdminAffiliates(actor: Actor, filters: AffiliateFilters) {
  if (!can.manageAffiliates(actor)) return null;

  const [rows, links, sales, trust] = await Promise.all([
    db
      .select({
        id: affiliate.id,
        handle: affiliate.handle,
        suspended: affiliate.suspended,
        createdAt: affiliate.createdAt,
        name: user.name,
        email: user.email,
        banned: user.banned,
      })
      .from(affiliate)
      .innerJoin(user, eq(user.id, affiliate.userId)),
    db
      .select({
        affiliateId: affiliateLink.affiliateId,
        links: sql<number>`count(*)::int`,
        clicks: sql<number>`coalesce(sum(${affiliateLink.clicks}), 0)::int`,
      })
      .from(affiliateLink)
      .groupBy(affiliateLink.affiliateId),
    db
      .select({
        affiliateId: order.affiliateId,
        sales: sql<number>`count(*)::int`,
        revenueCents: sql<number>`coalesce(sum(${order.grossCents}), 0)::int`,
        earnedCents: sql<number>`coalesce(sum(${order.affiliateCents}), 0)::int`,
      })
      .from(order)
      .where(and(eq(order.status, "paid"), isNotNull(order.affiliateId)))
      .groupBy(order.affiliateId),
    getTrustScores(),
  ]);

  const linksBy = new Map(links.map((l) => [l.affiliateId, l]));
  const salesBy = new Map(sales.map((s) => [s.affiliateId, s]));
  const q = filters.q.trim().toLowerCase();

  const all = rows.map((r) => {
    const status = r.banned ? ("banned" as const) : r.suspended ? ("suspended" as const) : ("active" as const);
    return {
      ...r,
      status,
      links: linksBy.get(r.id)?.links ?? 0,
      clicks: linksBy.get(r.id)?.clicks ?? 0,
      sales: salesBy.get(r.id)?.sales ?? 0,
      revenueCents: salesBy.get(r.id)?.revenueCents ?? 0,
      earnedCents: salesBy.get(r.id)?.earnedCents ?? 0,
      trust: trust.get(r.id) ?? NO_SIGNALS,
    };
  });

  const affiliates = all
    .filter((a) => !filters.status || a.status === filters.status)
    .filter((a) => !q || [a.name, a.handle, a.email].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) =>
      filters.sort === "trust"
        ? a.trust.score - b.trust.score
        : filters.sort === "newest"
          ? b.createdAt.getTime() - a.createdAt.getTime()
          : b.revenueCents - a.revenueCents,
    );

  return {
    affiliates,
    counts: {
      all: all.length,
      active: all.filter((a) => a.status === "active").length,
      suspended: all.filter((a) => a.status === "suspended").length,
      banned: all.filter((a) => a.status === "banned").length,
    },
  };
}

export async function getAffiliateProfile(actor: Actor, id: string) {
  if (!can.manageAffiliates(actor) || !/^[0-9a-f-]{36}$/i.test(id)) return null;

  const [who] = await db
    .select({
      id: affiliate.id,
      handle: affiliate.handle,
      suspended: affiliate.suspended,
      adminNote: affiliate.adminNote,
      createdAt: affiliate.createdAt,
      userId: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      banned: user.banned,
      role: user.role,
    })
    .from(affiliate)
    .innerJoin(user, eq(user.id, affiliate.userId))
    .where(eq(affiliate.id, id))
    .limit(1);
  if (!who) return null;

  // Who invited them through the referral program, if anyone.
  const [invitedBy] = await db
    .select({ id: affiliate.id, handle: affiliate.handle })
    .from(referral)
    .innerJoin(affiliate, eq(affiliate.id, referral.inviterId))
    .where(eq(referral.invitedUserId, who.userId))
    .limit(1);

  // The affiliate's own earnings view, read on their behalf.
  const asAffiliate: Actor = {
    userId: who.userId,
    name: who.name,
    email: who.email,
    emailVerified: who.emailVerified,
    roles: parseRoles(who.role),
    vendor: null,
    affiliate: { id: who.id, handle: who.handle, suspended: who.suspended },
  };

  const [earnings, links, adjustments, trust] = await Promise.all([
    getEarnings(asAffiliate),
    db
      .select({
        id: affiliateLink.id,
        code: affiliateLink.code,
        status: affiliateLink.status,
        clicks: affiliateLink.clicks,
        productTitle: product.title,
      })
      .from(affiliateLink)
      .innerJoin(product, eq(product.id, affiliateLink.productId))
      .where(eq(affiliateLink.affiliateId, id))
      .orderBy(desc(affiliateLink.clicks)),
    db
      .select({
        id: adjustment.id,
        createdAt: adjustment.createdAt,
        amountCents: adjustment.amountCents,
        reason: adjustment.reason,
        byName: user.name,
      })
      .from(adjustment)
      .leftJoin(user, eq(user.id, adjustment.createdBy))
      .where(eq(adjustment.affiliateId, id))
      .orderBy(desc(adjustment.createdAt)),
    getTrustScores(),
  ]);

  return {
    ...who,
    canBan: can.banUser(actor, { userId: who.userId, roles: parseRoles(who.role) }),
    invitedBy: invitedBy ?? null,
    totals: earnings!.totals,
    commissions: earnings!.commissions.slice(0, 10),
    links,
    adjustments,
    trust: trust.get(id) ?? NO_SIGNALS,
  };
}

/* -------------------------------------------------------------------- fraud */

export async function getFraud(actor: Actor) {
  if (!can.manageAffiliates(actor)) return null;
  const since = new Date(Date.now() - FRAUD_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [affiliates, trust, ipRows, blocks, selfReferrals] = await Promise.all([
    db
      .select({ id: affiliate.id, handle: affiliate.handle, suspended: affiliate.suspended, name: user.name })
      .from(affiliate)
      .innerJoin(user, eq(user.id, affiliate.userId)),
    getTrustScores(),
    // The busiest addresses of the last 30 days, and whose links they clicked.
    db
      .select({
        ipHash: click.ipHash,
        handle: affiliate.handle,
        clicks: sql<number>`count(*)::int`,
      })
      .from(click)
      .innerJoin(affiliate, eq(affiliate.id, click.affiliateId))
      .where(and(gte(click.createdAt, since), isNotNull(click.ipHash), sql`${click.device} <> 'bot'`))
      .groupBy(click.ipHash, affiliate.handle),
    db.select().from(blocklist).orderBy(desc(blocklist.createdAt)),
    db
      .select({
        number: order.number,
        createdAt: order.createdAt,
        grossCents: order.grossCents,
        productTitle: product.title,
        handle: affiliate.handle,
      })
      .from(order)
      .innerJoin(product, eq(product.id, order.productId))
      .innerJoin(affiliate, eq(affiliate.id, order.selfReferralAffiliateId))
      .orderBy(desc(order.createdAt))
      .limit(10),
  ]);

  const blockedIps = new Set(blocks.filter((b) => b.kind === "ip").map((b) => b.value));
  const ips = new Map<string, { ipHash: string; clicks: number; handles: string[] }>();
  for (const r of ipRows) {
    const row = ips.get(r.ipHash!) ?? { ipHash: r.ipHash!, clicks: 0, handles: [] };
    row.clicks += r.clicks;
    row.handles.push(r.handle);
    ips.set(row.ipHash, row);
  }

  return {
    affiliates: affiliates
      .map((a) => ({ ...a, trust: trust.get(a.id) ?? NO_SIGNALS }))
      .sort((a, b) => a.trust.score - b.trust.score),
    // Only addresses busy enough to matter.
    addresses: [...ips.values()]
      .filter((ip) => ip.clicks >= 10)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)
      .map((ip) => ({ ...ip, blocked: blockedIps.has(ip.ipHash) })),
    blocks,
    selfReferrals,
  };
}

/* ----------------------------------------------------------------- accounts */

/** Every account, for the Accounts tab, with whether this admin may ban it. */
export async function getAccounts(actor: Actor) {
  if (!can.viewAdmin(actor)) return null;
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      banned: user.banned,
      createdAt: user.createdAt,
      vendorSlug: vendor.slug,
      affiliateId: affiliate.id,
      affiliateHandle: affiliate.handle,
    })
    .from(user)
    .leftJoin(vendor, eq(vendor.userId, user.id))
    .leftJoin(affiliate, eq(affiliate.userId, user.id))
    .orderBy(desc(user.createdAt));

  return users.map((u) => ({
    ...u,
    isAdmin: parseRoles(u.role).includes("admin"),
    canBan: can.banUser(actor, { userId: u.id, roles: parseRoles(u.role) }),
  }));
}
