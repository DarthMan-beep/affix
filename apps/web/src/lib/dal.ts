import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@affix/auth";
import { parseRoles, type Actor } from "@affix/auth/permissions";
import { affiliate, db, eq, vendor } from "@affix/db";

/*
 * Data-access layer: the only place that turns a request into an Actor.
 * Pages, Server Actions and data functions call these, then apply the
 * permission rules from @affix/auth/permissions. Memoised per request.
 */

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  if (!session) return null;

  const [vendorRow, affiliateRow] = await Promise.all([
    db.query.vendor.findFirst({
      where: eq(vendor.userId, session.user.id),
      columns: { id: true, displayName: true, slug: true },
    }),
    db.query.affiliate.findFirst({
      where: eq(affiliate.userId, session.user.id),
      columns: { id: true, handle: true, suspended: true },
    }),
  ]);

  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    roles: parseRoles(session.user.role),
    vendor: vendorRow ?? null,
    affiliate: affiliateRow ?? null,
  };
});

/** The signed-in actor, or a redirect to sign-in (returning to `next`). */
export async function requireActor(next = "/dashboard"): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return actor;
}
