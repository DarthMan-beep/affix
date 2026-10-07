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
  affiliate: { id: string; handle: string; suspended: boolean } | null;
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

/** Smallest balance that can be withdrawn unless staff set another minimum: €50. */
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

/** When an invited account stops earning its inviter a bonus: `months` after it signed up. */
export function referralEndsAt(invitedAt: Date, months: number) {
  const end = new Date(invitedAt);
  end.setMonth(end.getMonth() + months);
  return end;
}

/** Whether a sale made at `at` still earns the inviter a bonus. */
export const referralActive = (invitedAt: Date, months: number, at: Date = new Date()) =>
  at >= invitedAt && at < referralEndsAt(invitedAt, months);

/**
 * The inviter's bonus on one commission of an affiliate they invited: a share
 * of that commission, paid by the platform out of its fee on the sale. It can
 * therefore never be more than the fee, and it costs the vendor and the
 * invited affiliate nothing.
 */
export function referralBonusCents(sale: { commissionCents: number; feeCents: number }, bonusBps: number) {
  const wanted = Math.round((sale.commissionCents * bonusBps) / 10_000);
  return Math.max(0, Math.min(wanted, sale.feeCents));
}

/** An affiliate in good standing: staff have not suspended them. */
const isActiveAffiliate = (a: Actor) => a.affiliate !== null && !a.affiliate.suspended;

const mayPromote = (a: Actor, p: ProductRef) =>
  isActiveAffiliate(a) && p.status === "published" && a.vendor?.id !== p.vendorId;

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

  /**
   * Commissions on a product are approved, rejected or held by its vendor (or
   * an admin), and only while they are still pending.
   */
  reviewCommission: (a: Actor, c: { vendorId: string; status: "pending" | "approved" | "rejected" | "reversed" }) =>
    (isAdmin(a) || a.vendor?.id === c.vendorId) && c.status === "pending",

  /**
   * Refund an order: its vendor (or an admin), once, and not after the
   * affiliate's commission has gone into a payout.
   */
  refundOrder: (a: Actor, o: { vendorId: string; status: "paid" | "refunded"; commissionPaidOut: boolean }) =>
    (isAdmin(a) || a.vendor?.id === o.vendorId) && o.status === "paid" && !o.commissionPaidOut,

  /** Affiliate links: the owner (and admins) manage them. */
  manageLink: (a: Actor, l: LinkRef) => isAdmin(a) || a.affiliate?.id === l.affiliateId,

  /** Payout methods hold bank details: only the affiliate they belong to. */
  managePayoutMethod: (a: Actor, m: PayoutMethodRef) => a.affiliate?.id === m.affiliateId,

  /**
   * Withdraw the available balance: affiliates in good standing with a verified
   * email, a saved payout method, and at least the minimum payout available
   * (the platform's setting, or the default).
   */
  requestPayout: (a: Actor, b: { availableCents: number; hasMethod: boolean; minimumCents?: number }) =>
    isActiveAffiliate(a) &&
    a.emailVerified &&
    b.hasMethod &&
    b.availableCents >= (b.minimumCents ?? MIN_PAYOUT_CENTS),

  /** Invite others with a referral link: affiliates in good standing. */
  inviteAffiliates: (a: Actor) => isActiveAffiliate(a),

  /** Sending, completing and rejecting payouts is staff work. */
  processPayouts: (a: Actor) => isAdmin(a),

  /** Suspending affiliates, notes, balance adjustments and blocklists are staff work. */
  manageAffiliates: (a: Actor) => isAdmin(a),

  /** Platform settings are changed by staff only. */
  changeSettings: (a: Actor) => isAdmin(a),

  /** Staff can ban an account, but never their own and never another admin's. */
  banUser: (a: Actor, target: { userId: string; roles: PlatformRole[] }) =>
    isAdmin(a) && target.userId !== a.userId && !target.roles.includes("admin"),
} as const;
