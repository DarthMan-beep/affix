/*
 * Commerce domain: what happens after someone opens an affiliate link.
 *   click       one visit through a link (who, from where, on what device)
 *   order       one sale of a product, with the full money split in cents
 *   commission  the affiliate's share of an order, pending until the refund
 *               window has passed, then approved and eligible for payout
 *   payout      a withdrawal of approved commissions to a payout method
 *   referral    who invited a new account, and the bonus the inviter earns
 *               on that account's commissions
 * Payments are simulated: no card is charged and no money is transferred.
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
import { affiliate, affiliateLink, product, vendor } from "./marketplace";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const clickDevice = pgEnum("click_device", ["desktop", "mobile", "tablet", "bot"]);

export const click = pgTable(
  "click",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => affiliateLink.id, { onDelete: "cascade" }),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    // First-party visitor id from the `affix_vid` cookie; attribution matches on it.
    visitorId: text("visitor_id").notNull(),
    // Salted hash, never the raw address: enough to spot repeats from one IP.
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    device: clickDevice("device").default("desktop").notNull(),
    browser: text("browser"),
    referrer: text("referrer"),
    country: text("country"),
    // Optional campaign tag passed as ?s=instagram-bio
    subId: text("sub_id"),
    // First visit of this visitor through this link.
    isUnique: boolean("is_unique").default(true).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("click_link_id_idx").on(t.linkId),
    index("click_affiliate_id_idx").on(t.affiliateId),
    index("click_visitor_product_idx").on(t.visitorId, t.productId),
    index("click_created_at_idx").on(t.createdAt),
  ],
);

export const orderStatus = pgEnum("order_status", ["paid", "refunded"]);

export const order = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Public reference shown to the buyer, e.g. "AFX-7K2M9QXD"
    number: text("number").notNull().unique(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendor.id, { onDelete: "cascade" }),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    buyerCountry: text("buyer_country").notNull(),
    buyerUserId: text("buyer_user_id").references(() => user.id, { onDelete: "set null" }),
    // The split: gross = net + vat, net = fee + affiliate + vendor.
    grossCents: integer("gross_cents").notNull(),
    vatBps: integer("vat_bps").notNull(),
    vatCents: integer("vat_cents").notNull(),
    netCents: integer("net_cents").notNull(),
    feeCents: integer("fee_cents").notNull(),
    affiliateCents: integer("affiliate_cents").default(0).notNull(),
    vendorCents: integer("vendor_cents").notNull(),
    // Attribution: the click that earned the sale (null for direct sales).
    clickId: uuid("click_id").references(() => click.id, { onDelete: "set null" }),
    linkId: uuid("link_id").references(() => affiliateLink.id, { onDelete: "set null" }),
    affiliateId: uuid("affiliate_id").references(() => affiliate.id, { onDelete: "set null" }),
    // Set when the buyer came through their own affiliate link: the sale counts,
    // the commission doesn't, and staff can see who tried.
    selfReferralAffiliateId: uuid("self_referral_affiliate_id").references(() => affiliate.id, {
      onDelete: "set null",
    }),
    status: orderStatus("status").default("paid").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("order_vendor_id_idx").on(t.vendorId),
    index("order_product_id_idx").on(t.productId),
    index("order_affiliate_id_idx").on(t.affiliateId),
    check("order_gross_positive", sql`${t.grossCents} > 0`),
  ],
);

export const payoutMethodType = pgEnum("payout_method_type", ["bank", "paypal", "wise"]);

export const payoutMethod = pgTable(
  "payout_method",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    type: payoutMethodType("type").notNull(),
    holder: text("holder").notNull(),
    // IBAN for bank transfers, account email for PayPal and Wise.
    details: text("details").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("payout_method_affiliate_id_idx").on(t.affiliateId)],
);

export const payoutStatus = pgEnum("payout_status", ["requested", "sent", "completed", "rejected"]);

export const payout = pgTable(
  "payout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Public reference, e.g. "PO-4H7Q2M9X"
    reference: text("reference").notNull().unique(),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    // Snapshot of the destination at request time (the method may change later).
    methodType: payoutMethodType("method_type").notNull(),
    methodHolder: text("method_holder").notNull(),
    methodDetails: text("method_details").notNull(),
    status: payoutStatus("status").default("requested").notNull(),
    note: text("note"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("payout_affiliate_id_idx").on(t.affiliateId),
    index("payout_status_idx").on(t.status),
    check("payout_amount_positive", sql`${t.amountCents} > 0`),
  ],
);

export const commissionStatus = pgEnum("commission_status", [
  "pending",
  "approved",
  "rejected",
  "reversed",
]);

export const commission = pgTable(
  "commission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => order.id, { onDelete: "cascade" }),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    status: commissionStatus("status").default("pending").notNull(),
    // End of the refund window: pending commissions are approved from this moment.
    availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    // The vendor approves this one by hand (the product's setting when it was sold).
    manualReview: boolean("manual_review").default(false).notNull(),
    // Held by the vendor: stays pending and is not approved automatically.
    onHold: boolean("on_hold").default(false).notNull(),
    // Set once the commission is part of a payout request.
    payoutId: uuid("payout_id").references(() => payout.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("commission_affiliate_id_idx").on(t.affiliateId),
    index("commission_status_idx").on(t.status),
    index("commission_payout_id_idx").on(t.payoutId),
    check("commission_amount_positive", sql`${t.amountCents} >= 0`),
  ],
);

/**
 * A manual change to an affiliate's balance by platform staff: a bonus, or a
 * correction (negative). Paid out together with the approved commissions.
 */
export const adjustment = pgTable(
  "adjustment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    payoutId: uuid("payout_id").references(() => payout.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("adjustment_affiliate_id_idx").on(t.affiliateId),
    check("adjustment_amount_not_zero", sql`${t.amountCents} <> 0`),
  ],
);

/**
 * One account that signed up through an affiliate's invite link. The inviter
 * earns a bonus on that account's commissions for a set period from this date.
 */
export const referral = pgTable(
  "referral",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    // An account is invited by one affiliate at most.
    invitedUserId: text("invited_user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index("referral_inviter_id_idx").on(t.inviterId)],
);

/**
 * The inviter's bonus on one commission of an invited affiliate. Paid by the
 * platform out of its fee: the order's split is not changed by it. It follows
 * its commission (pending, approved, rejected, reversed) until it is paid out.
 */
export const referralBonus = pgTable(
  "referral_bonus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referralId: uuid("referral_id")
      .notNull()
      .references(() => referral.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commission.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    payoutId: uuid("payout_id").references(() => payout.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("referral_bonus_commission_uq").on(t.commissionId),
    index("referral_bonus_inviter_id_idx").on(t.inviterId),
    index("referral_bonus_payout_id_idx").on(t.payoutId),
    check("referral_bonus_amount_positive", sql`${t.amountCents} > 0`),
  ],
);
