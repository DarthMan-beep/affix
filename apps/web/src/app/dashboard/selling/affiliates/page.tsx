import { requireActor } from "@/lib/dal";
import { commissionLabel } from "@/lib/money";
import { getVendorAffiliates, sellingNavFor } from "@/lib/vendor";
import { Chip, Notice, PageHeader, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { clearAffiliateRate, setAffiliateRate } from "../actions";

const field =
  "h-10 rounded-xl border border-line bg-card px-3 text-[0.85rem] text-ink outline-none focus:border-ink/40 focus:ring-4 focus:ring-spring/40";

export default async function VendorAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ rate?: string }>;
}) {
  const actor = await requireActor("/dashboard/selling/affiliates");
  const rows = await getVendorAffiliates(actor);
  const { rate } = await searchParams;

  if (!rows) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="Affiliates" />
        <WorkspaceLocked kind="selling" />
      </>
    );
  }

  const affiliates = new Set(rows.map((r) => r.affiliateId)).size;
  const sum = (pick: (r: NonNullable<typeof rows>[number]) => number) => rows.reduce((s, r) => s + pick(r), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Selling · /${actor.vendor!.slug}`}
        title="Affiliates"
        description="Everyone promoting your products and what they brought in. Give your best partners their own commission rate."
      />

      <SubNav label="Selling" items={await sellingNavFor(actor)} />

      {rate === "saved" && <Notice tone="success" title="Custom rate saved. It applies to this affiliate's next sales." />}
      {rate === "removed" && <Notice tone="success" title="Back to the product's standard commission." />}
      {rate === "invalid" && (
        <Notice tone="warning" title="That rate can't be used">
          Enter a percentage from 0 to 90 or an amount in euros, and leave yourself something after VAT and the Affix fee.
        </Notice>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Affiliates" value={formatNumber(affiliates)} />
        <Stat label="Clicks sent" value={formatNumber(sum((r) => r.clicks))} />
        <Stat label="Sales" value={formatNumber(sum((r) => r.sales))} />
        <Stat label="Revenue" value={<span className="text-leaf-700">{formatCents(sum((r) => r.revenueCents))}</span>} />
      </dl>

      {rows.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No affiliates yet. They appear here as soon as someone gets a link for one of your products.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[60rem] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Affiliate</th>
                <th className="px-4 py-3.5 font-medium">Product</th>
                <th className="px-3 py-3.5 text-right font-medium">Clicks</th>
                <th className="px-3 py-3.5 text-right font-medium">Sales</th>
                <th className="px-3 py-3.5 text-right font-medium">Revenue</th>
                <th className="px-3 py-3.5 text-right font-medium">Earned</th>
                <th className="px-6 py-3.5 font-medium">Commission rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={`${r.affiliateId}:${r.productId}`} className="align-top">
                  <td className="px-6 py-4">
                    <span className="block font-semibold text-ink">{r.name}</span>
                    <span className="block text-[0.78rem] text-muted">
                      @{r.handle} · {formatNumber(r.links)} {r.links === 1 ? "link" : "links"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-ink">{r.productTitle}</td>
                  <td className="font-mono tabular px-3 py-4 text-right">{formatNumber(r.clicks)}</td>
                  <td className="font-mono tabular px-3 py-4 text-right">{formatNumber(r.sales)}</td>
                  <td className="font-mono tabular px-3 py-4 text-right">{formatCents(r.revenueCents)}</td>
                  <td className="font-mono tabular px-3 py-4 text-right text-muted">{formatCents(r.commissionCents)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono tabular font-semibold text-leaf-700">
                        {commissionLabel(r.custom ?? r.standard)}
                      </span>
                      {r.custom ? (
                        <Chip tone="green">Custom</Chip>
                      ) : (
                        <span className="text-[0.78rem] text-muted-2">standard</span>
                      )}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer list-none text-[0.8rem] font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink [&::-webkit-details-marker]:hidden">
                        {r.custom ? "Change rate" : "Set a custom rate"}
                      </summary>
                      <form
                        action={setAffiliateRate.bind(null, r.productId, r.affiliateId)}
                        className="mt-3 flex flex-wrap items-center gap-2"
                      >
                        <label className="sr-only" htmlFor={`type-${r.affiliateId}-${r.productId}`}>
                          Commission type
                        </label>
                        <select
                          id={`type-${r.affiliateId}-${r.productId}`}
                          name="type"
                          defaultValue={(r.custom ?? r.standard).commissionType}
                          className={`${field} cursor-pointer`}
                        >
                          <option value="percent">Percent (%)</option>
                          <option value="fixed">Fixed (€ per sale)</option>
                        </select>
                        <label className="sr-only" htmlFor={`value-${r.affiliateId}-${r.productId}`}>
                          Rate
                        </label>
                        <input
                          id={`value-${r.affiliateId}-${r.productId}`}
                          name="value"
                          inputMode="decimal"
                          required
                          placeholder="40"
                          className={`${field} w-24`}
                        />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-[0.82rem] font-semibold text-cream hover:bg-forest-700"
                        >
                          Save
                        </button>
                      </form>
                      {r.custom && (
                        <form action={clearAffiliateRate.bind(null, r.productId, r.affiliateId)} className="mt-2">
                          <button type="submit" className="text-[0.8rem] font-semibold text-muted hover:text-ink">
                            Use the standard {commissionLabel(r.standard)} again
                          </button>
                        </form>
                      )}
                    </details>
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
