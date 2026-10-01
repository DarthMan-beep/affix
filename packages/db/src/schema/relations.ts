import { relations } from "drizzle-orm";
import { account, session, user } from "./auth";
import { affiliate, affiliateLink, product, vendor } from "./marketplace";

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
}));

export const productRelations = relations(product, ({ one, many }) => ({
  vendor: one(vendor, { fields: [product.vendorId], references: [vendor.id] }),
  links: many(affiliateLink),
}));

export const affiliateLinkRelations = relations(affiliateLink, ({ one }) => ({
  affiliate: one(affiliate, { fields: [affiliateLink.affiliateId], references: [affiliate.id] }),
  product: one(product, { fields: [affiliateLink.productId], references: [product.id] }),
}));
