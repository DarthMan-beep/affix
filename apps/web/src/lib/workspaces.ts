import "server-only";

import { randomBytes } from "node:crypto";
import { affiliate, db, eq, vendor } from "@affix/db";

export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "member";

/** Try `base`, then `base-3fa2`-style variants until the unique insert succeeds. */
async function insertWithUniqueSlug(base: string, tryInsert: (slug: string) => Promise<boolean>) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    if (await tryInsert(slug)) return slug;
  }
  throw new Error(`Could not find a free handle for "${base}"`);
}

/** Give a user the vendor capability (no-op if they already have it). */
export async function openVendorWorkspace(userId: string, displayName: string) {
  const existing = await db.query.vendor.findFirst({ where: eq(vendor.userId, userId) });
  if (existing) return existing.slug;
  return insertWithUniqueSlug(slugify(displayName), async (slug) => {
    const rows = await db
      .insert(vendor)
      .values({ userId, displayName, slug })
      .onConflictDoNothing()
      .returning({ id: vendor.id });
    return rows.length > 0;
  });
}

/** Give a user the affiliate capability (no-op if they already have it). */
export async function openAffiliateWorkspace(userId: string, name: string) {
  const existing = await db.query.affiliate.findFirst({ where: eq(affiliate.userId, userId) });
  if (existing) return existing.handle;
  return insertWithUniqueSlug(slugify(name.split(" ")[0] ?? name), async (handle) => {
    const rows = await db
      .insert(affiliate)
      .values({ userId, handle })
      .onConflictDoNothing()
      .returning({ id: affiliate.id });
    return rows.length > 0;
  });
}
