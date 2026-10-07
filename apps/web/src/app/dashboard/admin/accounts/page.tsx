import Link from "next/link";
import { requireActor } from "@/lib/dal";
import { adminNavFor, getAccounts } from "@/lib/admin";
import { Chip, PageHeader, Stat, formatNumber } from "@/components/dashboard/ui";
import { AdminOnly } from "@/components/dashboard/admin-only";
import { SubNav } from "@/components/dashboard/subnav";
import { setUserBanned } from "../actions";

const BASE = "/dashboard/admin/accounts";
const joined = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AccountsPage() {
  const actor = await requireActor(BASE);
  const users = await getAccounts(actor);
  if (!users) return <AdminOnly />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Accounts"
        description="Every account on Affix and what it can do. A banned account is signed out and can't sign in again."
      />

      <SubNav label="Admin" items={await adminNavFor(actor)} />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accounts" value={formatNumber(users.length)} />
        <Stat label="Vendors" value={formatNumber(users.filter((u) => u.vendorSlug).length)} />
        <Stat label="Affiliates" value={formatNumber(users.filter((u) => u.affiliateHandle).length)} />
        <Stat label="Banned" value={formatNumber(users.filter((u) => u.banned).length)} />
      </dl>

      <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
        <table className="w-full min-w-[52rem] text-left text-[0.9rem]">
          <thead>
            <tr className="border-b border-line text-[0.78rem] text-muted">
              <th className="px-6 py-3.5 font-medium">Account</th>
              <th className="px-4 py-3.5 font-medium">Access</th>
              <th className="px-4 py-3.5 font-medium">Email</th>
              <th className="px-4 py-3.5 text-right font-medium">Joined</th>
              <th className="px-6 py-3.5 text-right font-medium">Sign-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-3.5">
                  {u.affiliateId ? (
                    <Link href={`/dashboard/admin/affiliates/${u.affiliateId}`} className="block font-semibold text-ink hover:text-leaf-700">
                      {u.name}
                    </Link>
                  ) : (
                    <span className="block font-semibold text-ink">{u.name}</span>
                  )}
                  <span className="block text-[0.8rem] text-muted">{u.email}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    {u.isAdmin && <Chip tone="ink">Admin</Chip>}
                    {u.vendorSlug && <Chip tone="green">Vendor</Chip>}
                    {u.affiliateHandle && <Chip tone="green">Affiliate</Chip>}
                    {u.banned && <Chip tone="amber">Banned</Chip>}
                    {!u.vendorSlug && !u.affiliateHandle && !u.isAdmin && <Chip>Member</Chip>}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {u.emailVerified ? <Chip tone="green">Verified</Chip> : <Chip tone="amber">Unverified</Chip>}
                </td>
                <td className="font-mono tabular px-4 py-3.5 text-right text-[0.82rem] text-muted">
                  {joined.format(u.createdAt)}
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex justify-end">
                    {u.canBan ? (
                      <form action={setUserBanned.bind(null, u.id, !u.banned, BASE)}>
                        <button
                          type="submit"
                          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold ring-1 ring-inset transition-colors ${
                            u.banned
                              ? "text-ink ring-ink/15 hover:ring-ink/40"
                              : "text-[#8f3823] ring-[#c2553a]/30 hover:bg-[#c2553a]/10"
                          }`}
                        >
                          {u.banned ? "Restore access" : "Ban"}
                        </button>
                      </form>
                    ) : (
                      <span className="text-[0.78rem] text-muted-2">{u.id === actor.userId ? "You" : "Staff"}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
