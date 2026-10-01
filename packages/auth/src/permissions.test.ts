import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { can, parseRoles, type Actor } from "./permissions";

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
