import "server-only";

import { cache } from "react";
import { and, db, desc, eq, ne, product, vendor } from "@affix/db";

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
