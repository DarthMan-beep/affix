import "server-only";

import { can, type Actor } from "@affix/auth/permissions";
import {
  affiliate,
  affiliateLink,
  db,
  desc,
  eq,
  product,
  sql,
  user,
  vendor,
} from "@affix/db";

/*
 * Data functions for the dashboard. Each takes the verified Actor from the
 * DAL, applies the permission rules, and returns only the fields the UI needs
 * (DTOs), never whole rows. `null` means "not allowed".
 */

export async function getSelling(actor: Actor) {
  if (!actor.vendor) return null;
  return db
    .select({
      id: product.id,
      title: product.title,
      category: product.category,
      imageUrl: product.imageUrl,
      priceCents: product.priceCents,
      commissionType: product.commissionType,
      commissionBps: product.commissionBps,
      commissionFixedCents: product.commissionFixedCents,
      status: product.status,
      affiliates: sql<number>`count(distinct ${affiliateLink.affiliateId})::int`,
      links: sql<number>`count(${affiliateLink.id})::int`,
      clicks: sql<number>`coalesce(sum(${affiliateLink.clicks}), 0)::int`,
    })
    .from(product)
    .leftJoin(affiliateLink, eq(affiliateLink.productId, product.id))
    .where(eq(product.vendorId, actor.vendor.id))
    .groupBy(product.id)
    .orderBy(desc(product.createdAt));
}

/** One product with everything the editor needs; null if it isn't the actor's to manage. */
export async function getProductForEdit(actor: Actor, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await db.query.product.findFirst({
    where: eq(product.id, id),
    columns: {
      id: true,
      vendorId: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      priceCents: true,
      commissionType: true,
      commissionBps: true,
      commissionFixedCents: true,
      cookieDays: true,
      refundDays: true,
      approval: true,
      commissionApproval: true,
      imageUrl: true,
      status: true,
    },
  });
  if (!row || !can.manageProduct(actor, row)) return null;
  return row;
}

export async function getPromoting(actor: Actor) {
  if (!actor.affiliate) return null;

  const links = await db
    .select({
      id: affiliateLink.id,
      code: affiliateLink.code,
      clicks: affiliateLink.clicks,
      productId: product.id,
      productTitle: product.title,
      imageUrl: product.imageUrl,
      priceCents: product.priceCents,
      commissionType: product.commissionType,
      commissionBps: product.commissionBps,
      commissionFixedCents: product.commissionFixedCents,
      vendorName: vendor.displayName,
    })
    .from(affiliateLink)
    .innerJoin(product, eq(product.id, affiliateLink.productId))
    .innerJoin(vendor, eq(vendor.id, product.vendorId))
    .where(eq(affiliateLink.affiliateId, actor.affiliate.id))
    .orderBy(desc(affiliateLink.clicks));

  const catalog = await db
    .select({
      id: product.id,
      title: product.title,
      category: product.category,
      imageUrl: product.imageUrl,
      priceCents: product.priceCents,
      commissionType: product.commissionType,
      commissionBps: product.commissionBps,
      commissionFixedCents: product.commissionFixedCents,
      status: product.status,
      vendorId: product.vendorId,
      vendorName: vendor.displayName,
    })
    .from(product)
    .innerJoin(vendor, eq(vendor.id, product.vendorId))
    .where(eq(product.status, "published"))
    .orderBy(product.title);

  const linked = new Set(links.map((l) => l.productId));
  const available = catalog.filter((p) => !linked.has(p.id) && can.promoteProduct(actor, p));
  const ownProductsHidden = catalog.some((p) => p.vendorId === actor.vendor?.id);

  return { links, available, ownProductsHidden };
}

export async function getAdmin(actor: Actor) {
  if (!can.viewAdmin(actor)) return null;

  const [users, products, links] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        banned: user.banned,
        createdAt: user.createdAt,
        vendorSlug: vendor.slug,
        affiliateHandle: affiliate.handle,
      })
      .from(user)
      .leftJoin(vendor, eq(vendor.userId, user.id))
      .leftJoin(affiliate, eq(affiliate.userId, user.id))
      .orderBy(desc(user.createdAt)),
    db.$count(product),
    db.$count(affiliateLink),
  ]);

  return {
    users,
    totals: {
      users: users.length,
      vendors: users.filter((u) => u.vendorSlug).length,
      affiliates: users.filter((u) => u.affiliateHandle).length,
      products,
      links,
    },
  };
}
