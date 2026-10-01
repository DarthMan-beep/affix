import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { parseRoles } from "@affix/auth/permissions";
import { requireActor } from "@/lib/dal";
import { getAdmin } from "@/lib/data";
import { countRequestedPayouts } from "@/lib/commerce";
import { adminNav } from "@/lib/dashboard-nav";
import { Chip, PageHeader, Stat, formatNumber } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";

const joined = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminPage() {
  const actor = await requireActor("/dashboard/admin");
  const data = await getAdmin(actor);

  if (!data) {
    return (
      <section className="mx-auto mt-16 max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-spring">
          <ShieldAlert size={24} />
        </span>
        <h1 className="font-display tracking-heading mt-6 text-[2rem] font-bold text-ink">Admins only</h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-muted">
          This area is for Affix staff. If you think you should have access, ask an admin to add the
          admin role to your account.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[0.92rem] font-semibold text-cream hover:bg-forest-700"
        >
          Back to overview
        </Link>
      </section>
    );
  }

  const { users, totals } = data;
  const waiting = await countRequestedPayouts(actor);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Platform overview" description="Every account on Affix and what it can do." />

      <SubNav
        label="Admin"
        items={adminNav.map((i) => (i.href.endsWith("/payouts") ? { ...i, count: waiting } : i))}
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accounts" value={formatNumber(totals.users)} />
        <Stat label="Vendors" value={formatNumber(totals.vendors)} />
        <Stat label="Affiliates" value={formatNumber(totals.affiliates)} />
        <Stat label="Products" value={formatNumber(totals.products)} />
      </dl>

      <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
        <table className="w-full min-w-[46rem] text-left text-[0.9rem]">
          <thead>
            <tr className="border-b border-line text-[0.78rem] text-muted">
              <th className="px-6 py-3.5 font-medium">Account</th>
              <th className="px-4 py-3.5 font-medium">Access</th>
              <th className="px-4 py-3.5 font-medium">Email</th>
              <th className="px-6 py-3.5 text-right font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-3.5">
                  <span className="block font-semibold text-ink">{u.name}</span>
                  <span className="block text-[0.8rem] text-muted">{u.email}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    {parseRoles(u.role).includes("admin") && <Chip tone="ink">Admin</Chip>}
                    {u.vendorSlug && <Chip tone="green">Vendor</Chip>}
                    {u.affiliateHandle && <Chip tone="green">Affiliate</Chip>}
                    {u.banned && <Chip tone="amber">Suspended</Chip>}
                    {!u.vendorSlug && !u.affiliateHandle && !parseRoles(u.role).includes("admin") && <Chip>Member</Chip>}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {u.emailVerified ? <Chip tone="green">Verified</Chip> : <Chip tone="amber">Unverified</Chip>}
                </td>
                <td className="font-mono tabular px-6 py-3.5 text-right text-[0.82rem] text-muted">
                  {joined.format(u.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
