import type { SubNavItem } from "@/components/dashboard/subnav";

/** Second-level navigation of each workspace. */

export const sellingNav: SubNavItem[] = [
  { href: "/dashboard/selling", label: "Products" },
  { href: "/dashboard/selling/orders", label: "Orders" },
];

export const promotingNav: SubNavItem[] = [
  { href: "/dashboard/promoting", label: "Links" },
  { href: "/dashboard/promoting/earnings", label: "Earnings" },
  { href: "/dashboard/promoting/payouts", label: "Payouts" },
];

export const adminNav: SubNavItem[] = [
  { href: "/dashboard/admin", label: "Accounts" },
  { href: "/dashboard/admin/payouts", label: "Payouts" },
];
