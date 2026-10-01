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
type LinkRef = { affiliateId: string };

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
  promoteProduct: (a: Actor, p: ProductRef) =>
    isAffiliate(a) && p.status === "published" && a.vendor?.id !== p.vendorId,

  /** Affiliate links: the owner (and admins) manage them. */
  manageLink: (a: Actor, l: LinkRef) => isAdmin(a) || a.affiliate?.id === l.affiliateId,
} as const;
