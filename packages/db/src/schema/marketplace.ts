/*
 * Marketplace domain. One account can be a vendor, an affiliate, or both:
 * each capability is an optional 1:1 profile row on top of the user.
 * Money is stored in integer cents, commission in basis points (3000 = 30%).
 * A product pays either a percentage of the net price (commission_bps) or a
 * fixed amount per sale (commission_fixed_cents), chosen by commission_type.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
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
  // Set by platform staff: a suspended affiliate's links stop tracking and they can't withdraw.
  suspended: boolean("suspended").default(false).notNull(),
  // Private note for platform staff. Never shown to the affiliate.
  adminNote: text("admin_note"),
  createdAt: createdAt(),
});

export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);
export const commissionType = pgEnum("commission_type", ["percent", "fixed"]);
// How commissions are approved: automatically after the refund window, or by the vendor.
export const commissionApproval = pgEnum("commission_approval", ["auto", "manual"]);
// Who may promote a product: any affiliate, or only those the vendor approved.
export const productApproval = pgEnum("product_approval", ["open", "application"]);

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
    approval: productApproval("approval").default("open").notNull(),
    commissionApproval: commissionApproval("commission_approval").default("auto").notNull(),
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

export const linkStatus = pgEnum("link_status", ["active", "paused"]);

/*
 * An affiliate can have several links to one product, one per campaign
 * ("instagram-bio", "youtube-review"). The first link has no campaign.
 */
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
    // Public path: affix.to/<code>, e.g. "maya/sourdough-at-home" or
    // "maya/sourdough-at-home/instagram-bio" for a campaign link.
    code: text("code").notNull().unique(),
    campaign: text("campaign"),
    // UTM tags added to the product page address when someone follows the link.
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    // Paused links still send visitors to the product, but don't track or earn.
    status: linkStatus("status").default("active").notNull(),
    clicks: integer("clicks").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("affiliate_link_affiliate_product_idx").on(t.affiliateId, t.productId)],
);

export const applicationStatus = pgEnum("application_status", ["pending", "approved", "rejected"]);

/** An affiliate's request to promote a product that requires approval. */
export const productApplication = pgTable(
  "product_application",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    // How the affiliate plans to promote the product (shown to the vendor).
    message: text("message"),
    status: applicationStatus("status").default("pending").notNull(),
    createdAt: createdAt(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("product_application_product_affiliate_uq").on(t.productId, t.affiliateId),
    index("product_application_status_idx").on(t.status),
  ],
);

/**
 * A vendor's special deal with one affiliate for one product: it replaces the
 * product's standard commission on that affiliate's sales.
 */
export const affiliateRate = pgTable(
  "affiliate_rate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    commissionType: commissionType("commission_type").notNull(),
    commissionBps: integer("commission_bps").default(0).notNull(),
    commissionFixedCents: integer("commission_fixed_cents").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("affiliate_rate_product_affiliate_uq").on(t.productId, t.affiliateId),
    check("affiliate_rate_bps_range", sql`${t.commissionBps} between 0 and 9000`),
    check("affiliate_rate_fixed_positive", sql`${t.commissionFixedCents} >= 0`),
  ],
);

export const creativeKind = pgEnum("creative_kind", ["banner", "text"]);

/**
 * Promotion material a vendor offers for a product: a banner (rendered by
 * /b/<id>.png from an image, a headline and a size) or ready-made text.
 */
export const creative = pgTable(
  "creative",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    kind: creativeKind("kind").notNull(),
    title: text("title").notNull(),
    // Banners: pixel size ("300x250"), background image and the line of text on it.
    size: text("size"),
    imageUrl: text("image_url"),
    headline: text("headline"),
    // Text creatives: the copy. "{link}" is replaced by the affiliate's own link.
    body: text("body"),
    createdAt: createdAt(),
  },
  (t) => [index("creative_product_id_idx").on(t.productId)],
);
