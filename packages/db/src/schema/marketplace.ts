/*
 * Marketplace domain. One account can be a vendor, an affiliate, or both:
 * each capability is an optional 1:1 profile row on top of the user.
 * Money is stored in integer cents, commission in basis points (3000 = 30%).
 * A product pays either a percentage of the net price (commission_bps) or a
 * fixed amount per sale (commission_fixed_cents), chosen by commission_type.
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const vendor = pgTable("vendor", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: createdAt(),
});

export const affiliate = pgTable("affiliate", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  createdAt: createdAt(),
});

export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);
export const commissionType = pgEnum("commission_type", ["percent", "fixed"]);

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendor.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    priceCents: integer("price_cents").notNull(),
    commissionType: commissionType("commission_type").default("percent").notNull(),
    commissionBps: integer("commission_bps").notNull(),
    commissionFixedCents: integer("commission_fixed_cents").default(0).notNull(),
    // How long a click keeps earning the affiliate a commission on a later sale.
    cookieDays: integer("cookie_days").default(30).notNull(),
    // Refund window: a commission stays pending this long before it can be paid out.
    refundDays: integer("refund_days").default(14).notNull(),
    imageUrl: text("image_url"),
    status: productStatus("status").default("draft").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("product_vendor_id_idx").on(t.vendorId),
    index("product_status_idx").on(t.status),
    check("product_price_positive", sql`${t.priceCents} > 0`),
    check("product_commission_range", sql`${t.commissionBps} between 0 and 9000`),
    check("product_commission_fixed_positive", sql`${t.commissionFixedCents} >= 0`),
    check("product_cookie_days_range", sql`${t.cookieDays} between 1 and 90`),
    check("product_refund_days_range", sql`${t.refundDays} between 0 and 90`),
  ],
);

export const affiliateLink = pgTable(
  "affiliate_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    // Public path segment: affix.to/<code>, e.g. "maya/sourdough-at-home"
    code: text("code").notNull().unique(),
    clicks: integer("clicks").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("affiliate_link_affiliate_product_uq").on(t.affiliateId, t.productId)],
);
