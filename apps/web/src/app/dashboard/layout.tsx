import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { isAdmin } from "@affix/auth/permissions";
import { Logo } from "@/components/ui/logo";
import { DashboardNav, type NavItem } from "@/components/dashboard/nav";
import { requireActor } from "@/lib/dal";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Dashboard · Affix" };

// The layout reads the actor to render navigation only. Every page and action
// performs its own checks (layouts don't re-run on client-side navigation).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  const items: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "overview" },
    { href: "/dashboard/selling", label: "Selling", icon: "selling", badge: actor.vendor ? undefined : "Set up" },
    { href: "/dashboard/promoting", label: "Promoting", icon: "promoting", badge: actor.affiliate ? undefined : "Set up" },
    ...(isAdmin(actor) ? [{ href: "/dashboard/admin", label: "Admin", icon: "admin" } as const] : []),
  ];
  const initials = actor.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const account = (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-spring text-[0.85rem] font-bold text-ink">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9rem] font-semibold text-cream">{actor.name}</p>
        <p className="truncate text-[0.78rem] text-cream/55">{actor.email}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <aside className="grain relative isolate hidden w-[17rem] shrink-0 flex-col bg-forest-950 px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <Logo className="px-3 text-cream" sizeClass="h-[26px] w-auto" />
        <div className="mt-10">
          <DashboardNav items={items} variant="sidebar" />
        </div>
        <div className="mt-auto space-y-3 border-t border-cream/10 pt-5">
          {account}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.88rem] font-medium text-cream/60 transition-colors hover:bg-cream/[0.06] hover:text-cream"
            >
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 bg-forest-950 lg:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <Logo className="text-cream" sizeClass="h-[24px] w-auto" />
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[0.85rem] font-medium text-cream/70 hover:bg-cream/10 hover:text-cream"
              >
                <LogOut size={15} /> Sign out
              </button>
            </form>
          </div>
          <DashboardNav items={items} variant="tabs" />
        </header>

        <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
