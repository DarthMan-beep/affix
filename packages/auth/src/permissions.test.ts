import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MIN_PAYOUT_CENTS, can, isSelfReferral, parseRoles, type Actor } from "./permissions";

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
const affiliate = { ...base, affiliate: { id: "a1", handle: "a" } };
const both = { ...vendor, affiliate: { id: "a1", handle: "a" } };
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
