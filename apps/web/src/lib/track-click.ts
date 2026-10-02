import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse, userAgent, type NextRequest } from "next/server";
import { affiliateLink, and, click, db, eq, product, sql } from "@affix/db";
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE, hashIp, isVisitorId } from "@/lib/tracking";

/*
 * The smart link, shared by /go/<handle>/<product> and its campaign form
 * /go/<handle>/<product>/<campaign>. Records the click, remembers the visitor
 * in a first-party cookie, then sends them to the product page with the
 * link's UTM tags. Never fails the visitor: an unknown, paused or unpublished
 * link still lands on the product page (or its "not found"), just untracked.
 */
export async function trackClick(request: NextRequest, code: string, slug: string) {
  const destination = new URL(`/p/${encodeURIComponent(slug)}`, request.url);

  const [link] = await db
    .select({
      id: affiliateLink.id,
      affiliateId: affiliateLink.affiliateId,
      productId: affiliateLink.productId,
      linkStatus: affiliateLink.status,
      utmSource: affiliateLink.utmSource,
      utmMedium: affiliateLink.utmMedium,
      utmCampaign: affiliateLink.utmCampaign,
      productStatus: product.status,
    })
    .from(affiliateLink)
    .innerJoin(product, eq(product.id, affiliateLink.productId))
    .where(eq(affiliateLink.code, code.toLowerCase()))
    .limit(1);

  if (!link || link.productStatus !== "published" || link.linkStatus !== "active") {
    return NextResponse.redirect(destination);
  }

  if (link.utmSource) destination.searchParams.set("utm_source", link.utmSource);
  if (link.utmMedium) destination.searchParams.set("utm_medium", link.utmMedium);
  if (link.utmCampaign) destination.searchParams.set("utm_campaign", link.utmCampaign);

  const ua = userAgent(request);
  const device = ua.isBot
    ? "bot"
    : ua.device.type === "mobile"
      ? "mobile"
      : ua.device.type === "tablet"
        ? "tablet"
        : "desktop";

  const cookie = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(cookie) ? cookie : randomUUID();

  const [seen] = await db
    .select({ id: click.id })
    .from(click)
    .where(and(eq(click.linkId, link.id), eq(click.visitorId, visitorId)))
    .limit(1);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  const subId = request.nextUrl.searchParams.get("s");

  await db.insert(click).values({
    linkId: link.id,
    affiliateId: link.affiliateId,
    productId: link.productId,
    visitorId,
    ipHash: hashIp(ip),
    userAgent: ua.ua.slice(0, 300) || null,
    device,
    browser: ua.browser.name ?? null,
    referrer: request.headers.get("referer")?.slice(0, 300) ?? null,
    country: country?.slice(0, 2).toUpperCase() ?? null,
    subId: subId?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || null,
    isUnique: !seen,
  });
  // Crawlers are logged but don't count as clicks.
  if (device !== "bot") {
    await db
      .update(affiliateLink)
      .set({ clicks: sql`${affiliateLink.clicks} + 1` })
      .where(eq(affiliateLink.id, link.id));
  }

  const response = NextResponse.redirect(destination);
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
