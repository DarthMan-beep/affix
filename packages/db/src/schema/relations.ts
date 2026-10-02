import { relations } from "drizzle-orm";
import { account, session, user } from "./auth";
import { click, commission, order, payout, payoutMethod } from "./commerce";
import { affiliate, affiliateLink, product, productApplication, vendor } from "./marketplace";

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  vendor: one(vendor),
  affiliate: one(affiliate),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const vendorRelations = relations(vendor, ({ one, many }) => ({
  user: one(user, { fields: [vendor.userId], references: [user.id] }),
  products: many(product),
}));

export const affiliateRelations = relations(affiliate, ({ one, many }) => ({
  user: one(user, { fields: [affiliate.userId], references: [user.id] }),
  links: many(affiliateLink),
  commissions: many(commission),
  payoutMethods: many(payoutMethod),
  payouts: many(payout),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  vendor: one(vendor, { fields: [product.vendorId], references: [vendor.id] }),
  links: many(affiliateLink),
  orders: many(order),
  applications: many(productApplication),
}));

export const productApplicationRelations = relations(productApplication, ({ one }) => ({
  product: one(product, { fields: [productApplication.productId], references: [product.id] }),
  affiliate: one(affiliate, { fields: [productApplication.affiliateId], references: [affiliate.id] }),
}));

export const affiliateLinkRelations = relations(affiliateLink, ({ one, many }) => ({
  affiliate: one(affiliate, { fields: [affiliateLink.affiliateId], references: [affiliate.id] }),
  product: one(product, { fields: [affiliateLink.productId], references: [product.id] }),
  clickLog: many(click),
}));

export const clickRelations = relations(click, ({ one }) => ({
  link: one(affiliateLink, { fields: [click.linkId], references: [affiliateLink.id] }),
  affiliate: one(affiliate, { fields: [click.affiliateId], references: [affiliate.id] }),
  product: one(product, { fields: [click.productId], references: [product.id] }),
}));

export const orderRelations = relations(order, ({ one }) => ({
  product: one(product, { fields: [order.productId], references: [product.id] }),
  vendor: one(vendor, { fields: [order.vendorId], references: [vendor.id] }),
  affiliate: one(affiliate, { fields: [order.affiliateId], references: [affiliate.id] }),
  click: one(click, { fields: [order.clickId], references: [click.id] }),
  commission: one(commission),
}));

export const commissionRelations = relations(commission, ({ one }) => ({
  order: one(order, { fields: [commission.orderId], references: [order.id] }),
  affiliate: one(affiliate, { fields: [commission.affiliateId], references: [affiliate.id] }),
  product: one(product, { fields: [commission.productId], references: [product.id] }),
  payout: one(payout, { fields: [commission.payoutId], references: [payout.id] }),
}));

export const payoutMethodRelations = relations(payoutMethod, ({ one }) => ({
  affiliate: one(affiliate, { fields: [payoutMethod.affiliateId], references: [affiliate.id] }),
}));

export const payoutRelations = relations(payout, ({ one, many }) => ({
  affiliate: one(affiliate, { fields: [payout.affiliateId], references: [affiliate.id] }),
  commissions: many(commission),
}));
