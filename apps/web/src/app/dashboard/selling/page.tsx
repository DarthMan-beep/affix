import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { parseRange } from "@/lib/range";
import { getSellingOverview, sellingNavFor } from "@/lib/vendor";
import { PageHeader, Panel, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { EmptyNote } from "@/components/dashboard/format";
import { BarList, RangeTabs } from "@/components/dashboard/breakdowns";
import { TimeChart } from "@/components/dashboard/charts";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";

const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const label = (isoDay: string) => shortDay.format(new Date(`${isoDay}T12:00:00`));

export default async function SellingOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const actor = await requireActor("/dashboard/selling");
  const range = parseRange({ range: (await searchParams).range });
  const data = await getSellingOverview(actor, range);

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="Sell your products" />
        <WorkspaceLocked kind="selling" />
      </>
    );
  }

  const { periods, totals, series, channels, topAffiliates, topProducts } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Selling · /${actor.vendor!.slug}`}
        title="Your sales"
        description="What your products sold, what affiliates earned on it, and what you keep."
        action={
          <Link
            href="/dashboard/selling/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700"
          >
            <Plus size={16} /> New product
          </Link>
        }
      />

      <SubNav label="Selling" items={await sellingNavFor(actor)} />

      <div>
        <p className="mb-2.5 text-[0.82rem] text-muted">You earned, after VAT, fees and commissions</p>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Today" value={formatCents(periods.todayCents)} />
          <Stat label="This week" value={formatCents(periods.weekCents)} />
          <Stat label="This month" value={formatCents(periods.monthCents)} />
          <Stat label="All time" value={<span className="text-leaf-700">{formatCents(periods.allTimeCents)}</span>} />
        </dl>
      </div>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.8rem] text-muted">Revenue, last {range.days} days</p>
            <p className="font-display tracking-heading tabular mt-1 text-[2rem] font-bold leading-tight text-ink">
              {formatCents(totals.revenueCents)}
            </p>
          </div>
          <RangeTabs base="/dashboard/selling" range={range} />
        </div>
        <div className="mt-4">
          <TimeChart
            kind="line"
            unit="eur"
            points={series.map((d) => ({ label: label(d.date), value: d.revenueCents }))}
            description={`Daily revenue for the last ${range.days} days, ${formatCents(totals.revenueCents)} in total.`}
          />
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-5">
          {[
            { label: "Sales", value: formatNumber(totals.orders) },
            { label: "Commissions", value: formatCents(totals.commissionsCents) },
            { label: "You keep", value: formatCents(totals.keptCents) },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-[0.78rem] text-muted">{s.label}</dt>
              <dd className="font-mono tabular mt-0.5 text-[1rem] font-semibold text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel>
          <p className="text-[0.8rem] text-muted">Sales per day, last {range.days} days</p>
          <p className="font-display tracking-heading tabular mt-1 text-[1.6rem] font-bold leading-tight text-ink">
            {formatNumber(totals.orders)}
          </p>
          <div className="mt-4">
            <TimeChart
              kind="bar"
              unit="count"
              points={series.map((d) => ({ label: label(d.date), value: d.sales }))}
              description={`Daily sales for the last ${range.days} days, ${formatNumber(totals.orders)} in total.`}
            />
          </div>
        </Panel>
        <div className="grid gap-4 lg:gap-5">
          <Panel>
            <h2 className="font-display tracking-heading text-[1.1rem] font-bold text-ink">Where sales come from</h2>
            <div className="mt-4">
              <BarList rows={channels} unit="eur" empty="No sales in this period." />
            </div>
          </Panel>
          <Panel>
            <h2 className="font-display tracking-heading text-[1.1rem] font-bold text-ink">Revenue by product</h2>
            <div className="mt-4">
              <BarList rows={topProducts} unit="eur" empty="No sales in this period." />
            </div>
          </Panel>
        </div>
      </div>

      <section className="overflow-hidden rounded-[24px] bg-card ring-1 ring-line">
        <div className="flex items-center justify-between gap-4 px-6 pb-2 pt-6">
          <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">Top affiliates</h2>
          <Link
            href="/dashboard/selling/affiliates"
            className="group inline-flex items-center gap-1 text-[0.85rem] font-semibold text-ink hover:text-leaf-700"
          >
            All affiliates
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {topAffiliates.length === 0 ? (
          <EmptyNote>No affiliate sales in this period.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-[0.9rem]">
              <thead>
                <tr className="border-b border-line text-[0.78rem] text-muted">
                  <th className="px-6 py-3 font-medium">Affiliate</th>
                  <th className="px-3 py-3 text-right font-medium">Sales</th>
                  <th className="px-3 py-3 text-right font-medium">Revenue</th>
                  <th className="px-6 py-3 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {topAffiliates.map((a) => (
                  <tr key={a.handle}>
                    <td className="px-6 py-3.5 font-semibold text-ink">@{a.handle}</td>
                    <td className="font-mono tabular px-3 py-3.5 text-right">{formatNumber(a.sales)}</td>
                    <td className="font-mono tabular px-3 py-3.5 text-right">{formatCents(a.revenueCents)}</td>
                    <td className="font-mono tabular px-6 py-3.5 text-right text-muted">{formatCents(a.commissionCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
