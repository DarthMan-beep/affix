import "server-only";

import { createHash } from "node:crypto";
import { affiliate, affiliateLink, and, asc, click, db, desc, eq, gte, ne, user } from "@affix/db";

/*
 * Attribution without third-party cookies: every visitor gets a first-party
 * id in the `affix_vid` cookie. A click through an affiliate link is stored
 * with that id, and at checkout the sale goes to the last link the visitor
 * clicked for that product within the product's cookie window.
 */

export const VISITOR_COOKIE = "affix_vid";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isVisitorId = (value: string | undefined): value is string => !!value && UUID.test(value);

/** Salted hash of an IP address: comparable, but not reversible to the address. */
export function hashIp(ip: string | null) {
  if (!ip) return null;
  const salt = process.env.BETTER_AUTH_SECRET ?? "affix";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * The click that earns a sale of `productId` for this visitor, or null. Which
 * of several clicks wins is a platform setting: the last one (default) or the
 * first. Clicks through a suspended affiliate's links never earn.
 */
export async function findAttribution(
  visitorId: string,
  productId: string,
  cookieDays: number,
  model: "last_click" | "first_click" = "last_click",
) {
  const since = new Date(Date.now() - cookieDays * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      clickId: click.id,
      linkId: click.linkId,
      affiliateId: click.affiliateId,
      affiliateUserId: affiliate.userId,
      affiliateEmail: user.email,
    })
    .from(click)
    .innerJoin(affiliateLink, eq(affiliateLink.id, click.linkId))
    .innerJoin(affiliate, eq(affiliate.id, click.affiliateId))
    .innerJoin(user, eq(user.id, affiliate.userId))
    .where(
      and(
        eq(click.visitorId, visitorId),
        eq(click.productId, productId),
        ne(click.device, "bot"),
        eq(affiliate.suspended, false),
        gte(click.createdAt, since),
      ),
    )
    .orderBy(model === "first_click" ? asc(click.createdAt) : desc(click.createdAt))
    .limit(1);
  return row ?? null;
}
