import Image from "next/image";
import Link from "next/link";
import { Info, Link2, Send } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getMarketplace, type MarketplaceFilters } from "@/lib/analytics";
import { promotingNav } from "@/lib/dashboard-nav";
import { commissionLabel } from "@/lib/money";
import { parseEuros } from "@/lib/validation";
import { Chip, PageHeader, formatCents } from "@/components/dashboard/ui";
import { formatPercent } from "@/components/dashboard/format";
import { Select, TextInput } from "@/components/dashboard/form";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { createLink } from "../../actions";
import { applyToProduct } from "../actions";

const BASE = "/dashboard/promoting/marketplace";
const sorts = [
  { value: "commission", label: "Highest commission" },
  { value: "epc", label: "Best earnings per click" },
  { value: "newest", label: "Newest" },
];

type Params = { tab?: string; category?: string; type?: string; min?: string; sort?: string };

function parseFilters(p: Params): MarketplaceFilters {
  return {
    tab: p.tab === "mine" ? "mine" : "all",
    category: p.category ?? "",
    type: p.type === "percent" || p.type === "fixed" ? p.type : "",
    minCents: parseEuros(p.min ?? "") ?? 0,
    sort: p.sort === "epc" || p.sort === "newest" ? p.sort : "commission",
  };
}

/** The current filters as a query string, with one of them replaced. */
function query(p: Params, patch: Params) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...patch })) if (v) next.set(k, v);
  const qs = next.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="whitespace-nowrap text-[0.66rem] uppercase tracking-wider text-muted-2">{label}</dt>
      <dd className="font-mono tabular mt-0.5 text-[0.88rem] font-semibold text-ink">{value}</dd>
    </div>
  );
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Params> }) {
  const actor = await requireActor(BASE);
  const params = await searchParams;
  const filters = parseFilters(params);
  const data = await getMarketplace(actor, filters);

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Marketplace" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  const { products, categories, counts, ownProductsHidden } = data;
  const filtered = Boolean(filters.category || filters.type || filters.minCents);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Promoting · @${actor.affiliate!.handle}`}
        title="Marketplace"
        description="Every product you can promote, with what a sale pays and how well it converts."
      />

      <SubNav label="Promoting" items={promotingNav} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-ink/[0.05] p-1" role="group" aria-label="Which products">
          {(
            [
              { tab: "", label: "All products", count: counts.all },
              { tab: "mine", label: "My products", count: counts.mine },
            ] as const
          ).map((t) => {
            const active = (filters.tab === "mine") === (t.tab === "mine");
            return (
              <Link
                key={t.label}
                href={query(params, { tab: t.tab })}
                aria-current={active ? "true" : undefined}
                className={`rounded-full px-4 py-1.5 text-[0.85rem] font-semibold transition-colors ${
                  active ? "bg-card text-ink shadow-[0_1px_2px_rgb(14_42_30/0.12)]" : "text-muted hover:text-ink"
                }`}
              >
                {t.label} <span className="font-mono tabular text-[0.75rem] text-muted">{t.count}</span>
              </Link>
            );
          })}
        </div>
        {ownProductsHidden && (
          <p className="flex items-center gap-1.5 text-[0.85rem] text-muted">
            <Info size={14} /> Your own products are hidden: no commission on self-referrals.
          </p>
        )}
      </div>

      {/* A plain GET form: the filters live in the address, so a filtered view can be bookmarked. */}
      <form
        key={JSON.stringify(params)}
        action={BASE}
        className="grid gap-4 rounded-[24px] bg-card p-5 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-[1fr_1fr_0.8fr_1.2fr_auto] lg:items-end"
      >
        {filters.tab === "mine" && <input type="hidden" name="tab" value="mine" />}
        <Select
          label="Category"
          name="category"
          defaultValue={filters.category}
          required={false}
          options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          label="Commission type"
          name="type"
          defaultValue={filters.type}
          required={false}
          options={[
            { value: "", label: "Any type" },
            { value: "percent", label: "Percentage" },
            { value: "fixed", label: "Fixed amount" },
          ]}
        />
        <TextInput
          label="Pays at least"
          name="min"
          defaultValue={params.min ?? ""}
          required={false}
          inputMode="decimal"
          prefix="€"
          placeholder="0"
        />
        <Select label="Sort by" name="sort" defaultValue={filters.sort} required={false} options={sorts} />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700"
          >
            Apply
          </button>
          {filtered && (
            <Link
              href={query({}, { tab: filters.tab === "mine" ? "mine" : "" })}
              className="rounded-full px-3 py-2 text-[0.85rem] font-semibold text-muted hover:text-ink"
            >
              Reset
            </Link>
          )}
        </div>
      </form>

      {products.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          {filters.tab === "mine" && !filtered
            ? "You aren't promoting anything yet. Switch to All products and pick one."
            : "No products match these filters."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-[22px] bg-card ring-1 ring-line">
              <div className="relative aspect-[16/9] bg-paper-2">
                {p.imageUrl && (
                  <Image src={p.imageUrl} alt="" fill sizes="(min-width: 1280px) 22rem, 50vw" className="object-cover" />
                )}
                <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[0.7rem] font-semibold text-ink backdrop-blur">
                  {p.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{p.title}</p>
                    <p className="text-[0.8rem] text-muted">
                      by {p.vendorName} · {formatCents(p.priceCents)}
                    </p>
                  </div>
                  {p.approval === "application" && p.state !== "promoting" && <Chip>Approval needed</Chip>}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3.5">
                  <Figure label="Commission" value={commissionLabel(p)} />
                  <Figure label="Per sale" value={`≈ ${formatCents(p.perSaleCents)}`} />
                  <Figure label="Per click" value={p.epcCents === null ? "—" : formatCents(p.epcCents)} />
                  <Figure label="Converts" value={p.conversion === null ? "—" : formatPercent(p.conversion)} />
                </dl>
                <p className="mt-3 text-[0.78rem] text-muted-2">Cookie lasts {p.cookieDays} days</p>

                <div className="mt-auto pt-4">
                  {p.state === "available" && (
                    <form action={createLink.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-[0.85rem] font-semibold text-cream hover:bg-forest-700"
                      >
                        <Link2 size={14} /> Get link
                      </button>
                    </form>
                  )}
                  {p.state === "promoting" && (
                    <Link
                      href="/dashboard/promoting/links"
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full px-4 text-[0.85rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 hover:ring-ink/40"
                    >
                      <Link2 size={14} /> Promoting · manage links
                    </Link>
                  )}
                  {p.state === "apply" && (
                    <form action={applyToProduct.bind(null, p.id)} className="space-y-2">
                      <label className="sr-only" htmlFor={`message-${p.id}`}>
                        How will you promote {p.title}?
                      </label>
                      <textarea
                        id={`message-${p.id}`}
                        name="message"
                        rows={2}
                        maxLength={500}
                        placeholder="Tell the vendor how you'll promote it (optional)"
                        className="block w-full resize-none rounded-xl border border-line bg-card px-3 py-2 text-[0.85rem] text-ink outline-none placeholder:text-muted-2 focus:border-ink/40 focus:ring-4 focus:ring-spring/40"
                      />
                      <button
                        type="submit"
                        className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-[0.85rem] font-semibold text-cream hover:bg-forest-700"
                      >
                        <Send size={14} /> Apply to promote
                      </button>
                    </form>
                  )}
                  {p.state === "applied" && (
                    <p className="flex h-10 items-center justify-center rounded-full bg-[#e0a030]/15 text-[0.85rem] font-semibold text-[#6b4a0e]">
                      Applied · waiting for the vendor
                    </p>
                  )}
                  {p.state === "rejected" && (
                    <p className="flex h-10 items-center justify-center rounded-full bg-ink/[0.06] text-[0.85rem] font-semibold text-muted">
                      Application not accepted
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
