import type { SubNavItem } from "@/components/dashboard/subnav";

/** Second-level navigation of each workspace. */

export const sellingNav: SubNavItem[] = [
  { href: "/dashboard/selling", label: "Products" },
  { href: "/dashboard/selling/orders", label: "Orders" },
  { href: "/dashboard/selling/applications", label: "Applications" },
];

export const promotingNav: SubNavItem[] = [
  { href: "/dashboard/promoting", label: "Overview" },
  { href: "/dashboard/promoting/links", label: "Links" },
  { href: "/dashboard/promoting/marketplace", label: "Marketplace" },
  { href: "/dashboard/promoting/earnings", label: "Earnings" },
  { href: "/dashboard/promoting/analytics", label: "Analytics" },
  { href: "/dashboard/promoting/payouts", label: "Payouts" },
];

export const adminNav: SubNavItem[] = [
  { href: "/dashboard/admin", label: "Accounts" },
  { href: "/dashboard/admin/payouts", label: "Payouts" },
];
