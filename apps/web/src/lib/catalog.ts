import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { affiliate, and, db, desc, eq, ne, order, product, sql, vendor } from "@affix/db";

/*
 * Public catalog reads: what a visitor without an account may see. Only
 * published products are returned, and only the fields the storefront shows
 * (never the commission, which is between the vendor and its affiliates).
 */

const publicFields = {
  id: product.id,
  slug: product.slug,
  title: product.title,
  description: product.description,
  category: product.category,
  imageUrl: product.imageUrl,
  priceCents: product.priceCents,
  vendorName: vendor.displayName,
};

/** One published product by its slug, or `null`. Memoised per request. */
export const getPublicProduct = cache(async (slug: string) => {
  const [row] = await db
    .select(publicFields)
    .from(product)
    .innerJoin(vendor, eq(vendor.id, product.vendorId))
    .where(and(eq(product.slug, slug), eq(product.status, "published")))
    .limit(1);
  return row ?? null;
});

/** A few other published products, newest first. */
export async function getMoreProducts(excludeId: string, limit = 3) {
  return db
    .select(publicFields)
    .from(product)
    .innerJoin(vendor, eq(vendor.id, product.vendorId))
    .where(and(eq(product.status, "published"), ne(product.id, excludeId)))
    .orderBy(desc(product.createdAt))
    .limit(limit);
}

/**
 * What the landing page shows live: platform totals and the best-selling
 * published products. Read at request time, never at build time. Returns
 * `null` when the database can't be reached, so the page still renders.
 */
export const getLandingLive = cache(async () => {
  await connection();
  try {
    const [products, affiliates, [sales], featured] = await Promise.all([
      db.$count(product, eq(product.status, "published")),
      db.$count(affiliate, eq(affiliate.suspended, false)),
      db
        .select({
          count: sql<number>`count(*)::int`,
          commissionCents: sql<number>`coalesce(sum(${order.affiliateCents}), 0)::int`,
        })
        .from(order)
        .where(eq(order.status, "paid")),
      db
        .select({ ...publicFields, sold: sql<number>`count(${order.id})::int` })
        .from(product)
        .innerJoin(vendor, eq(vendor.id, product.vendorId))
        .leftJoin(order, and(eq(order.productId, product.id), eq(order.status, "paid")))
        .where(eq(product.status, "published"))
        .groupBy(product.id, vendor.displayName)
        .orderBy(desc(sql`count(${order.id})`), desc(product.createdAt))
        .limit(4),
    ]);
    return {
      numbers: {
        products,
        affiliates,
        sales: sales?.count ?? 0,
        commissionCents: sales?.commissionCents ?? 0,
      },
      featured,
    };
  } catch {
    return null;
  }
});
