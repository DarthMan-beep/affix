import { requireActor } from "@/lib/dal";
import { countPendingApplications } from "@/lib/analytics";
import { getOrders } from "@/lib/commerce";
import { sellingNav } from "@/lib/dashboard-nav";
import { Chip, PageHeader, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function OrdersPage() {
  const actor = await requireActor("/dashboard/selling/orders");
  const data = await getOrders(actor);

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="Orders" />
        <WorkspaceLocked kind="selling" />
      </>
    );
  }

  const { orders, totals } = data;
  const pending = await countPendingApplications(actor);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Selling · /${actor.vendor!.slug}`}
        title="Orders"
        description="Every sale and where its money went: VAT, the Affix fee, the affiliate's commission and your share."
      />

      <SubNav
        label="Selling"
        items={sellingNav.map((i) => (i.href.endsWith("/applications") ? { ...i, count: pending } : i))}
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={formatNumber(totals.orders)} />
        <Stat label="Through affiliates" value={formatNumber(totals.viaAffiliates)} />
        <Stat label="Commissions" value={formatCents(totals.affiliateCents)} />
        <Stat label="You earned" value={<span className="text-leaf-700">{formatCents(totals.vendorCents)}</span>} />
      </dl>

      {orders.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No orders yet. They appear here as soon as someone buys one of your products.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[56rem] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Order</th>
                <th className="px-4 py-3.5 font-medium">Product</th>
                <th className="px-4 py-3.5 font-medium">Source</th>
                <th className="px-4 py-3.5 text-right font-medium">Paid</th>
                <th className="px-4 py-3.5 text-right font-medium">VAT</th>
                <th className="px-4 py-3.5 text-right font-medium">Fee</th>
                <th className="px-4 py-3.5 text-right font-medium">Affiliate</th>
                <th className="px-6 py-3.5 text-right font-medium">You get</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="font-mono block text-[0.82rem] text-ink">{o.number}</span>
                    <span className="block text-[0.76rem] text-muted-2">{day.format(o.createdAt)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="block font-semibold text-ink">{o.productTitle}</span>
                    <span className="block text-[0.78rem] text-muted">
                      {o.buyerName} · {o.buyerCountry}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {o.affiliateHandle ? <Chip tone="green">@{o.affiliateHandle}</Chip> : <Chip>Direct</Chip>}
                  </td>
                  <td className="font-mono tabular px-4 py-4 text-right">{formatCents(o.grossCents)}</td>
                  <td className="font-mono tabular px-4 py-4 text-right text-muted">{formatCents(o.vatCents)}</td>
                  <td className="font-mono tabular px-4 py-4 text-right text-muted">{formatCents(o.feeCents)}</td>
                  <td className="font-mono tabular px-4 py-4 text-right text-muted">
                    {o.affiliateCents ? formatCents(o.affiliateCents) : "—"}
                  </td>
                  <td className="font-mono tabular px-6 py-4 text-right font-semibold text-leaf-700">
                    {formatCents(o.vendorCents)}
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
