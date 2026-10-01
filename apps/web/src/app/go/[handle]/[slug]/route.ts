import { randomUUID } from "node:crypto";
import { NextResponse, userAgent, type NextRequest } from "next/server";
import { affiliateLink, and, click, db, eq, product, sql } from "@affix/db";
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE, hashIp, isVisitorId } from "@/lib/tracking";

/*
 * The smart link: /go/<handle>/<product> (shown to people as affix.to/<code>).
 * Records the click, remembers the visitor in a first-party cookie, then sends
 * them to the product page. Never fails the visitor: if anything about the
 * link is wrong they still land on the product page (or its "not found").
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string; slug: string }> },
) {
  const { handle, slug } = await params;
  const destination = new URL(`/p/${encodeURIComponent(slug)}`, request.url);

  const [link] = await db
    .select({
      id: affiliateLink.id,
      affiliateId: affiliateLink.affiliateId,
      productId: affiliateLink.productId,
      status: product.status,
    })
    .from(affiliateLink)
    .innerJoin(product, eq(product.id, affiliateLink.productId))
    .where(eq(affiliateLink.code, `${handle}/${slug}`.toLowerCase()))
    .limit(1);

  if (!link || link.status !== "published") return NextResponse.redirect(destination);

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
