import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_PAYOUT_CENTS,
  can,
  isSelfReferral,
  parseRoles,
  referralActive,
  referralBonusCents,
  referralEndsAt,
  type Actor,
} from "./permissions";

const base: Actor = {
  userId: "u1",
  name: "Test",
  email: "t@example.com",
  emailVerified: true,
  roles: ["user"],
  vendor: null,
  affiliate: null,
};
const vendor = { ...base, vendor: { id: "v1", displayName: "V", slug: "v" } };
const affiliate = { ...base, affiliate: { id: "a1", handle: "a", suspended: false } };
const both = { ...vendor, affiliate: { id: "a1", handle: "a", suspended: false } };
const admin = { ...base, roles: ["user", "admin"] as Actor["roles"] };

const published = { vendorId: "v1", status: "published" as const };
const othersPublished = { vendorId: "v2", status: "published" as const };
const othersDraft = { vendorId: "v2", status: "draft" as const };

describe("parseRoles", () => {
  it("defaults to user", () => {
    assert.deepEqual(parseRoles(null), ["user"]);
    assert.deepEqual(parseRoles(""), ["user"]);
  });
  it("reads comma-separated roles and drops unknown ones", () => {
    assert.deepEqual(parseRoles("user, admin"), ["user", "admin"]);
    assert.deepEqual(parseRoles("superuser"), ["user"]);
  });
});

describe("capabilities", () => {
  it("only vendors create products", () => {
    assert.equal(can.createProduct(base), false);
    assert.equal(can.createProduct(affiliate), false);
    assert.equal(can.createProduct(vendor), true);
  });
  it("each workspace can be opened once", () => {
    assert.equal(can.becomeVendor(base), true);
    assert.equal(can.becomeVendor(vendor), false);
    assert.equal(can.becomeAffiliate(both), false);
  });
  it("only admins see the admin area", () => {
    assert.equal(can.viewAdmin(both), false);
    assert.equal(can.viewAdmin(admin), true);
  });
});

describe("resource rules", () => {
  it("vendors manage only their own products; admins manage any", () => {
    assert.equal(can.manageProduct(vendor, published), true);
    assert.equal(can.manageProduct(vendor, othersPublished), false);
    assert.equal(can.manageProduct(admin, othersPublished), true);
  });
  it("affiliates promote published products of other vendors only", () => {
    assert.equal(can.promoteProduct(affiliate, othersPublished), true);
    assert.equal(can.promoteProduct(affiliate, othersDraft), false);
    assert.equal(can.promoteProduct(vendor, othersPublished), false, "not an affiliate");
    assert.equal(can.promoteProduct(both, published), false, "no self-referrals");
    assert.equal(can.promoteProduct(both, othersPublished), true);
  });
  it("links are managed by their owner or an admin", () => {
    assert.equal(can.manageLink(affiliate, { affiliateId: "a1" }), true);
    assert.equal(can.manageLink(affiliate, { affiliateId: "a2" }), false);
    assert.equal(can.manageLink(admin, { affiliateId: "a2" }), true);
  });
});

describe("payouts", () => {
  const enough = { availableCents: MIN_PAYOUT_CENTS, hasMethod: true };

  it("payout methods belong to one affiliate; not even admins manage them", () => {
    assert.equal(can.managePayoutMethod(affiliate, { affiliateId: "a1" }), true);
    assert.equal(can.managePayoutMethod(affiliate, { affiliateId: "a2" }), false);
    assert.equal(can.managePayoutMethod(admin, { affiliateId: "a1" }), false);
  });
  it("a payout needs an affiliate, a verified email, a method and the minimum balance", () => {
    assert.equal(can.requestPayout(affiliate, enough), true);
    assert.equal(can.requestPayout(vendor, enough), false, "not an affiliate");
    assert.equal(can.requestPayout({ ...affiliate, emailVerified: false }, enough), false);
    assert.equal(can.requestPayout(affiliate, { ...enough, hasMethod: false }), false);
    assert.equal(can.requestPayout(affiliate, { ...enough, availableCents: MIN_PAYOUT_CENTS - 1 }), false);
  });
  it("only admins process payouts", () => {
    assert.equal(can.processPayouts(affiliate), false);
    assert.equal(can.processPayouts(admin), true);
  });
});

describe("self-referrals", () => {
  const owner = { userId: "u1", email: "maya@affix.dev" };

  it("the same account or the same email earns no commission", () => {
    assert.equal(isSelfReferral(owner, { userId: "u1", email: "other@example.com" }), true);
    assert.equal(isSelfReferral(owner, { userId: null, email: " Maya@Affix.dev " }), true);
  });
  it("anyone else is a real sale", () => {
    assert.equal(isSelfReferral(owner, { userId: "u2", email: "buyer@example.com" }), false);
    assert.equal(isSelfReferral(owner, { userId: null, email: "buyer@example.com" }), false);
  });
});

describe("applications", () => {
  const open = { ...othersPublished, approval: "open" as const };
  const gated = { ...othersPublished, approval: "application" as const };

  it("open products give a link straight away", () => {
    assert.equal(can.createLink(affiliate, open, null), true);
    assert.equal(can.applyToProduct(affiliate, open, null), false, "nothing to apply for");
  });
  it("gated products need an approved application", () => {
    assert.equal(can.createLink(affiliate, gated, null), false);
    assert.equal(can.createLink(affiliate, gated, { status: "pending" }), false);
    assert.equal(can.createLink(affiliate, gated, { status: "rejected" }), false);
    assert.equal(can.createLink(affiliate, gated, { status: "approved" }), true);
  });
  it("an affiliate applies once, never to their own product", () => {
    assert.equal(can.applyToProduct(affiliate, gated, null), true);
    assert.equal(can.applyToProduct(affiliate, gated, { status: "rejected" }), false);
    assert.equal(can.applyToProduct(both, { ...published, approval: "application" }, null), false);
    assert.equal(can.createLink(both, { ...published, approval: "open" }, null), false, "no self-referrals");
  });
  it("the product's vendor or an admin reviews applications", () => {
    assert.equal(can.reviewApplication(vendor, published), true);
    assert.equal(can.reviewApplication(vendor, othersPublished), false);
    assert.equal(can.reviewApplication(admin, othersPublished), true);
  });
});

describe("commission review and refunds", () => {
  it("the product's vendor or an admin decides pending commissions", () => {
    assert.equal(can.reviewCommission(vendor, { vendorId: "v1", status: "pending" }), true);
    assert.equal(can.reviewCommission(vendor, { vendorId: "v2", status: "pending" }), false);
    assert.equal(can.reviewCommission(affiliate, { vendorId: "v1", status: "pending" }), false);
    assert.equal(can.reviewCommission(admin, { vendorId: "v2", status: "pending" }), true);
  });
  it("a decided commission can't be decided again", () => {
    assert.equal(can.reviewCommission(vendor, { vendorId: "v1", status: "approved" }), false);
    assert.equal(can.reviewCommission(vendor, { vendorId: "v1", status: "rejected" }), false);
  });
  it("orders are refunded once, by their vendor, before the commission is paid out", () => {
    const paid = { vendorId: "v1", status: "paid" as const, commissionPaidOut: false };
    assert.equal(can.refundOrder(vendor, paid), true);
    assert.equal(can.refundOrder(vendor, { ...paid, vendorId: "v2" }), false);
    assert.equal(can.refundOrder(vendor, { ...paid, status: "refunded" }), false);
    assert.equal(can.refundOrder(vendor, { ...paid, commissionPaidOut: true }), false);
    assert.equal(can.refundOrder(admin, { ...paid, vendorId: "v2" }), true);
  });
});

describe("platform staff", () => {
  const suspended = { ...base, affiliate: { id: "a1", handle: "a", suspended: true } };

  it("a suspended affiliate can't promote, apply or withdraw", () => {
    const open = { ...othersPublished, approval: "open" as const };
    assert.equal(can.promoteProduct(suspended, othersPublished), false);
    assert.equal(can.createLink(suspended, open, null), false);
    assert.equal(can.requestPayout(suspended, { availableCents: MIN_PAYOUT_CENTS, hasMethod: true }), false);
  });
  it("the minimum payout follows the platform setting", () => {
    assert.equal(can.requestPayout(affiliate, { availableCents: 3000, hasMethod: true, minimumCents: 2500 }), true);
    assert.equal(can.requestPayout(affiliate, { availableCents: 3000, hasMethod: true, minimumCents: 10000 }), false);
    assert.equal(can.requestPayout(affiliate, { availableCents: 3000, hasMethod: true }), false, "default is €50");
  });
  it("only admins manage affiliates and settings", () => {
    assert.equal(can.manageAffiliates(vendor), false);
    assert.equal(can.manageAffiliates(admin), true);
    assert.equal(can.changeSettings(both), false);
    assert.equal(can.changeSettings(admin), true);
  });
  it("an admin can ban users, but not themselves or another admin", () => {
    assert.equal(can.banUser(admin, { userId: "u2", roles: ["user"] }), true);
    assert.equal(can.banUser(admin, { userId: "u1", roles: ["user", "admin"] }), false, "own account");
    assert.equal(can.banUser(admin, { userId: "u3", roles: ["user", "admin"] }), false, "another admin");
    assert.equal(can.banUser(vendor, { userId: "u2", roles: ["user"] }), false);
  });
});

describe("referral program", () => {
  const invitedAt = new Date("2026-01-15T10:00:00Z");
  it("pays the inviter a share of the invited affiliate's commission", () => {
    assert.equal(referralBonusCents({ commissionCents: 10_000, feeCents: 1_500 }, 500), 500);
    assert.equal(referralBonusCents({ commissionCents: 2_243, feeCents: 536 }, 500), 112, "rounded to the cent");
  });
  it("never pays more than the platform's fee on the sale, and nothing when switched off", () => {
    assert.equal(referralBonusCents({ commissionCents: 10_000, feeCents: 300 }, 500), 300);
    assert.equal(referralBonusCents({ commissionCents: 10_000, feeCents: 1_500 }, 0), 0);
  });
  it("runs for the set number of months from the sign-up", () => {
    assert.equal(referralEndsAt(invitedAt, 12).toISOString(), "2027-01-15T10:00:00.000Z");
    assert.equal(referralActive(invitedAt, 12, new Date("2027-01-15T09:59:59Z")), true);
    assert.equal(referralActive(invitedAt, 12, new Date("2027-01-15T10:00:00Z")), false);
    assert.equal(referralActive(invitedAt, 12, new Date("2026-01-14T10:00:00Z")), false, "not before the sign-up");
  });
  it("only affiliates in good standing can invite", () => {
    assert.equal(can.inviteAffiliates(affiliate), true);
    assert.equal(can.inviteAffiliates(vendor), false);
    assert.equal(
      can.inviteAffiliates({ ...base, affiliate: { id: "a1", handle: "a", suspended: true } }),
      false,
    );
  });
});
