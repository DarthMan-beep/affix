import "server-only";

import { and, click, commission, db, gte, isNotNull, order, sql } from "@affix/db";

/*
 * Fraud signals and the trust score. Nothing here is stored: every signal is
 * worked out from the clicks, orders and commissions of the last 30 days, so
 * it always reflects what the data says right now.
 *
 * A score starts at 100 and each signal takes points off. 80 and up is fine,
 * 50 to 79 is worth a look, below 50 is at risk.
 */

export const FRAUD_WINDOW_DAYS = 30;

export type TrustStats = {
  /** Clicks in the window, crawlers included. */
  clicks: number;
  botClicks: number;
  uniqueClicks: number;
  /** Most clicks from one (hashed) IP address, crawlers excluded. */
  topIpClicks: number;
  sales: number;
  commissions: number;
  reversed: number;
  selfReferrals: number;
};

export type TrustSignal = { key: string; label: string; detail: string; penalty: number };
export type Trust = { score: number; level: "good" | "watch" | "risk"; signals: TrustSignal[]; stats: TrustStats };

const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** Pure: the score and its reasons for one affiliate's numbers. */
export function scoreTrust(stats: TrustStats): Trust {
  const signals: TrustSignal[] = [];
  const human = stats.clicks - stats.botClicks;

  const ipShare = human > 0 ? stats.topIpClicks / human : 0;
  if (stats.topIpClicks >= 20 && ipShare >= 0.3) {
    signals.push({
      key: "ip",
      label: "Clicks from one address",
      detail: `${stats.topIpClicks} clicks (${pct(ipShare)}) came from a single IP address.`,
      penalty: ipShare >= 0.5 ? 45 : 35,
    });
  }
  const botShare = stats.clicks > 0 ? stats.botClicks / stats.clicks : 0;
  if (stats.clicks >= 20 && botShare >= 0.2) {
    signals.push({
      key: "bots",
      label: "Bot traffic",
      detail: `${pct(botShare)} of clicks came from crawlers and scripts.`,
      penalty: 20,
    });
  }
  const uniqueShare = human > 0 ? stats.uniqueClicks / human : 1;
  if (human >= 50 && uniqueShare < 0.5) {
    signals.push({
      key: "repeat",
      label: "Repeat clicks",
      detail: `Only ${pct(uniqueShare)} of clicks were from new visitors.`,
      penalty: 15,
    });
  }
  if (stats.selfReferrals > 0) {
    signals.push({
      key: "self",
      label: "Self-referral",
      detail: `${stats.selfReferrals} ${stats.selfReferrals === 1 ? "purchase" : "purchases"} through their own link.`,
      penalty: Math.min(30, stats.selfReferrals * 15),
    });
  }
  const conversion = human > 0 ? stats.sales / human : 0;
  if (stats.sales >= 5 && conversion > 0.25) {
    signals.push({
      key: "conversion",
      label: "Unusual conversion rate",
      detail: `${pct(conversion)} of clicks became sales, far above normal.`,
      penalty: 20,
    });
  }
  const reversedShare = stats.commissions > 0 ? stats.reversed / stats.commissions : 0;
  if (stats.commissions >= 3 && reversedShare > 0.2) {
    signals.push({
      key: "refunds",
      label: "Many refunds",
      detail: `${pct(reversedShare)} of their sales were refunded or rejected.`,
      penalty: 15,
    });
  }

  const score = Math.max(0, 100 - signals.reduce((s, x) => s + x.penalty, 0));
  return { score, level: score >= 80 ? "good" : score >= 50 ? "watch" : "risk", signals, stats };
}

const EMPTY: TrustStats = {
  clicks: 0,
  botClicks: 0,
  uniqueClicks: 0,
  topIpClicks: 0,
  sales: 0,
  commissions: 0,
  reversed: 0,
  selfReferrals: 0,
};

/** Trust for every affiliate that has any activity, keyed by affiliate id. Others score 100. */
export async function getTrustScores() {
  const since = new Date(Date.now() - FRAUD_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [clicks, ips, commissions, selfReferrals] = await Promise.all([
    db
      .select({
        affiliateId: click.affiliateId,
        clicks: sql<number>`count(*)::int`,
        botClicks: sql<number>`count(*) filter (where ${click.device} = 'bot')::int`,
        uniqueClicks: sql<number>`count(*) filter (where ${click.device} <> 'bot' and ${click.isUnique})::int`,
      })
      .from(click)
      .where(gte(click.createdAt, since))
      .groupBy(click.affiliateId),
    db
      .select({ affiliateId: click.affiliateId, ipHash: click.ipHash, n: sql<number>`count(*)::int` })
      .from(click)
      .where(and(gte(click.createdAt, since), isNotNull(click.ipHash), sql`${click.device} <> 'bot'`))
      .groupBy(click.affiliateId, click.ipHash),
    db
      .select({
        affiliateId: commission.affiliateId,
        commissions: sql<number>`count(*)::int`,
        reversed: sql<number>`count(*) filter (where ${commission.status} in ('reversed', 'rejected'))::int`,
        sales: sql<number>`count(*) filter (where ${commission.createdAt} >= ${since.toISOString()}::timestamptz and ${commission.status} in ('pending', 'approved'))::int`,
      })
      .from(commission)
      .groupBy(commission.affiliateId),
    db
      .select({ affiliateId: order.selfReferralAffiliateId, n: sql<number>`count(*)::int` })
      .from(order)
      .where(isNotNull(order.selfReferralAffiliateId))
      .groupBy(order.selfReferralAffiliateId),
  ]);

  const stats = new Map<string, TrustStats>();
  const of = (id: string) => {
    if (!stats.has(id)) stats.set(id, { ...EMPTY });
    return stats.get(id)!;
  };
  for (const c of clicks) Object.assign(of(c.affiliateId), { clicks: c.clicks, botClicks: c.botClicks, uniqueClicks: c.uniqueClicks });
  for (const ip of ips) of(ip.affiliateId).topIpClicks = Math.max(of(ip.affiliateId).topIpClicks, ip.n);
  for (const c of commissions) Object.assign(of(c.affiliateId), { commissions: c.commissions, reversed: c.reversed, sales: c.sales });
  for (const s of selfReferrals) if (s.affiliateId) of(s.affiliateId).selfReferrals = s.n;

  const trust = new Map<string, Trust>();
  for (const [id, s] of stats) trust.set(id, scoreTrust(s));
  return trust;
}

export const NO_SIGNALS: Trust = scoreTrust(EMPTY);
