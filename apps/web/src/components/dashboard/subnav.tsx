"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SubNavItem = { href: string; label: string; count?: number };

/** Second-level navigation inside one workspace (e.g. Links · Earnings · Payouts). */
export function SubNav({ label, items }: { label: string; items: SubNavItem[] }) {
  const pathname = usePathname();
  // The longest matching href wins, so "/dashboard/selling" isn't active on "/dashboard/selling/orders".
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
      {items.map((item) => {
        const current = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[0.88rem] font-medium transition-colors ${
              current ? "bg-ink text-cream" : "text-muted hover:bg-ink/[0.05] hover:text-ink"
            }`}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span
                className={`font-mono tabular rounded-full px-1.5 text-[0.7rem] ${
                  current ? "bg-cream/15 text-cream" : "bg-ink/[0.07] text-ink"
                }`}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
