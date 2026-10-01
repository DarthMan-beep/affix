"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Link2, ShieldCheck, Store } from "lucide-react";

const icons = { overview: LayoutGrid, selling: Store, promoting: Link2, admin: ShieldCheck };

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
  badge?: string;
};

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav({ items, variant }: { items: NavItem[]; variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();

  if (variant === "tabs") {
    return (
      <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = icons[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[0.85rem] font-medium transition-colors ${
                active ? "bg-cream text-ink" : "text-cream/70 hover:bg-cream/10 hover:text-cream"
              }`}
            >
              <Icon size={15} /> {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Dashboard" className="space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = icons[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] font-medium transition-colors ${
              active ? "bg-cream/10 text-cream" : "text-cream/60 hover:bg-cream/[0.06] hover:text-cream"
            }`}
          >
            {active && <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-spring" />}
            <Icon size={17} className={active ? "text-spring" : ""} />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="rounded-full border border-cream/15 px-2 py-0.5 text-[0.66rem] font-semibold text-cream/60">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
