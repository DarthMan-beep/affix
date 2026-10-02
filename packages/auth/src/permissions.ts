/*
 * Authorization model
 * -------------------
 * - Platform roles come from Better Auth's admin plugin (`user.role`, a
 *   comma-separated list): "user" for everyone, "admin" for staff.
 * - Capabilities come from profile rows: a `vendor` row lets you sell, an
 *   `affiliate` row lets you promote. One account can hold both.
 * Every rule is a pure function of the actor (and the resource), so the web
 * app's data-access layer and the unit tests share exactly the same logic.
 */

export type PlatformRole = "user" | "admin";

export type Actor = {
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  roles: PlatformRole[];
  vendor: { id: string; displayName: string; slug: string } | null;
  affiliate: { id: string; handle: string } | null;
};

const PLATFORM_ROLES: readonly PlatformRole[] = ["user", "admin"];

/** Parse the admin plugin's comma-separated role string. Unknown roles are dropped. */
export function parseRoles(role: string | null | undefined): PlatformRole[] {
  const roles = (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r): r is PlatformRole => (PLATFORM_ROLES as readonly string[]).includes(r));
  return roles.length > 0 ? roles : ["user"];
}

export const isAdmin = (a: Actor) => a.roles.includes("admin");
export const isVendor = (a: Actor) => a.vendor !== null;
export const isAffiliate = (a: Actor) => a.affiliate !== null;

type ProductRef = { vendorId: string; status: "draft" | "published" | "archived" };
type ApprovalRef = { approval: "open" | "application" };
/** The affiliate's application for a product, or null if they never applied. */
type ApplicationRef = { status: "pending" | "approved" | "rejected" } | null;
type LinkRef = { affiliateId: string };
type PayoutMethodRef = { affiliateId: string };

/** Smallest balance that can be withdrawn: €50. */
export const MIN_PAYOUT_CENTS = 50_00;

/**
 * A sale earns no commission when the buyer is the affiliate behind the link
 * (same account, or the same email at a guest checkout).
 */
export function isSelfReferral(
  linkOwner: { userId: string; email: string },
  buyer: { userId: string | null; email: string },
) {
  return (
    linkOwner.userId === buyer.userId ||
    linkOwner.email.trim().toLowerCase() === buyer.email.trim().toLowerCase()
  );
}

const mayPromote = (a: Actor, p: ProductRef) =>
  isAffiliate(a) && p.status === "published" && a.vendor?.id !== p.vendorId;

export const can = {
  /** Staff-only area. */
  viewAdmin: (a: Actor) => isAdmin(a),

  /** Open a selling or promoting workspace (once each). */
  becomeVendor: (a: Actor) => !isVendor(a),
  becomeAffiliate: (a: Actor) => !isAffiliate(a),

  /** Products: vendors create; owners (and admins) manage. */
  createProduct: (a: Actor) => isVendor(a),
  manageProduct: (a: Actor, p: ProductRef) => isAdmin(a) || a.vendor?.id === p.vendorId,

  /**
   * Promote a product: affiliates only, published products only, and never
   * your own product (no commission on self-referrals).
   */
  promoteProduct: (a: Actor, p: ProductRef) => mayPromote(a, p),

  /**
   * Get a link for a product: whoever may promote it, and for products that
   * require approval only once the vendor has approved the application.
   */
  createLink: (a: Actor, p: ProductRef & ApprovalRef, application: ApplicationRef) =>
    mayPromote(a, p) && (p.approval === "open" || application?.status === "approved"),

  /** Apply once, and only to products that ask for an application. */
  applyToProduct: (a: Actor, p: ProductRef & ApprovalRef, application: ApplicationRef) =>
    mayPromote(a, p) && p.approval === "application" && application === null,

  /** Applications are decided by the product's vendor (or an admin). */
  reviewApplication: (a: Actor, p: ProductRef) => isAdmin(a) || a.vendor?.id === p.vendorId,

  /** Affiliate links: the owner (and admins) manage them. */
  manageLink: (a: Actor, l: LinkRef) => isAdmin(a) || a.affiliate?.id === l.affiliateId,

  /** Payout methods hold bank details: only the affiliate they belong to. */
  managePayoutMethod: (a: Actor, m: PayoutMethodRef) => a.affiliate?.id === m.affiliateId,

  /**
   * Withdraw the available balance: affiliates with a verified email, a saved
   * payout method, and at least the minimum payout available.
   */
  requestPayout: (a: Actor, b: { availableCents: number; hasMethod: boolean }) =>
    isAffiliate(a) && a.emailVerified && b.hasMethod && b.availableCents >= MIN_PAYOUT_CENTS,

  /** Sending, completing and rejecting payouts is staff work. */
  processPayouts: (a: Actor) => isAdmin(a),
} as const;
