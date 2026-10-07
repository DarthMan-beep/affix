import type { SubNavItem } from "@/components/dashboard/subnav";

/** Second-level navigation of each workspace. */

export const sellingNav: SubNavItem[] = [
  { href: "/dashboard/selling", label: "Overview" },
  { href: "/dashboard/selling/products", label: "Products" },
  { href: "/dashboard/selling/orders", label: "Orders" },
  { href: "/dashboard/selling/commissions", label: "Commissions" },
  { href: "/dashboard/selling/affiliates", label: "Affiliates" },
  { href: "/dashboard/selling/applications", label: "Applications" },
  { href: "/dashboard/selling/creatives", label: "Creatives" },
];

export const promotingNav: SubNavItem[] = [
  { href: "/dashboard/promoting", label: "Overview" },
  { href: "/dashboard/promoting/links", label: "Links" },
  { href: "/dashboard/promoting/marketplace", label: "Marketplace" },
  { href: "/dashboard/promoting/creatives", label: "Creatives" },
  { href: "/dashboard/promoting/earnings", label: "Earnings" },
  { href: "/dashboard/promoting/analytics", label: "Analytics" },
  { href: "/dashboard/promoting/referrals", label: "Referrals" },
  { href: "/dashboard/promoting/payouts", label: "Payouts" },
];

export const adminNav: SubNavItem[] = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/affiliates", label: "Affiliates" },
  { href: "/dashboard/admin/accounts", label: "Accounts" },
  { href: "/dashboard/admin/payouts", label: "Payouts" },
  { href: "/dashboard/admin/fraud", label: "Fraud" },
  { href: "/dashboard/admin/settings", label: "Settings" },
];
