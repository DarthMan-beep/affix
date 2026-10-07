import Link from "next/link";
import { requireActor } from "@/lib/dal";
import { adminNavFor, getAdminAffiliates, type AffiliateFilters } from "@/lib/admin";
import { Chip, PageHeader, formatCents, formatNumber } from "@/components/dashboard/ui";
import { AdminOnly } from "@/components/dashboard/admin-only";
import { Select, TextInput } from "@/components/dashboard/form";
import { SubNav } from "@/components/dashboard/subnav";
import { TrustBadge } from "@/components/dashboard/trust";

const BASE = "/dashboard/admin/affiliates";
const joined = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

type Params = { q?: string; status?: string; sort?: string };

function parseFilters(p: Params): AffiliateFilters {
  return {
    q: (p.q ?? "").slice(0, 80),
    status: p.status === "active" || p.status === "suspended" || p.status === "banned" ? p.status : "",
    sort: p.sort === "trust" || p.sort === "newest" ? p.sort : "revenue",
  };
}

const statusChip = {
  active: { label: "Active", tone: "green" },
  suspended: { label: "Suspended", tone: "amber" },
  banned: { label: "Banned", tone: "ink" },
} as const;

export default async function AdminAffiliatesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const actor = await requireActor(BASE);
  const params = await searchParams;
  const filters = parseFilters(params);
  const data = await getAdminAffiliates(actor, filters);
  if (!data) return <AdminOnly />;

  const { affiliates, counts } = data;
  const tabs = [
    { key: "", label: "All", count: counts.all },
    { key: "active", label: "Active", count: counts.active },
    { key: "suspended", label: "Suspended", count: counts.suspended },
    { key: "banned", label: "Banned", count: counts.banned },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Affiliates"
        description="Everyone promoting on Affix: what they bring in, and how far their traffic can be trusted."
      />

      <SubNav label="Admin" items={await adminNavFor(actor)} />

      <div className="inline-flex max-w-full overflow-x-auto rounded-full bg-ink/[0.05] p-1" role="group" aria-label="Status">
        {tabs.map((t) => {
          const active = filters.status === t.key;
          const next = new URLSearchParams(
            Object.entries({ q: filters.q, status: t.key, sort: filters.sort }).filter(([, v]) => v),
          ).toString();
          return (
            <Link
              key={t.label}
              href={next ? `${BASE}?${next}` : BASE}
              aria-current={active ? "true" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[0.85rem] font-semibold transition-colors ${
                active ? "bg-card text-ink shadow-[0_1px_2px_rgb(14_42_30/0.12)]" : "text-muted hover:text-ink"
              }`}
            >
              {t.label} <span className="font-mono tabular text-[0.75rem] text-muted">{t.count}</span>
            </Link>
          );
        })}
      </div>

      <form
        key={JSON.stringify(params)}
        action={BASE}
        className="grid gap-4 rounded-[24px] bg-card p-5 ring-1 ring-line sm:grid-cols-[1.4fr_1fr_auto] sm:items-end"
      >
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        <TextInput label="Search" name="q" defaultValue={filters.q} required={false} placeholder="Name, handle or email" maxLength={80} />
        <Select
          label="Sort by"
          name="sort"
          defaultValue={filters.sort}
          required={false}
          options={[
            { value: "revenue", label: "Most revenue" },
            { value: "trust", label: "Lowest trust score" },
            { value: "newest", label: "Newest" },
          ]}
        />
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700"
        >
          Apply
        </button>
      </form>

      {affiliates.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No affiliates match.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[62rem] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Affiliate</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
                <th className="px-4 py-3.5 font-medium">Trust</th>
                <th className="px-3 py-3.5 text-right font-medium">Clicks</th>
                <th className="px-3 py-3.5 text-right font-medium">Sales</th>
                <th className="px-3 py-3.5 text-right font-medium">Revenue</th>
                <th className="px-3 py-3.5 text-right font-medium">Earned</th>
                <th className="px-6 py-3.5 text-right font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {affiliates.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-3.5">
                    <Link href={`${BASE}/${a.id}`} className="block font-semibold text-ink hover:text-leaf-700">
                      {a.name}
                    </Link>
                    <span className="block text-[0.78rem] text-muted">
                      @{a.handle} · {a.email}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Chip tone={statusChip[a.status].tone}>{statusChip[a.status].label}</Chip>
                  </td>
                  <td className="px-4 py-3.5">
                    <TrustBadge trust={a.trust} />
                  </td>
                  <td className="font-mono tabular px-3 py-3.5 text-right">{formatNumber(a.clicks)}</td>
                  <td className="font-mono tabular px-3 py-3.5 text-right">{formatNumber(a.sales)}</td>
                  <td className="font-mono tabular px-3 py-3.5 text-right">{formatCents(a.revenueCents)}</td>
                  <td className="font-mono tabular px-3 py-3.5 text-right text-muted">{formatCents(a.earnedCents)}</td>
                  <td className="font-mono tabular whitespace-nowrap px-6 py-3.5 text-right text-[0.82rem] text-muted">
                    {joined.format(a.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
