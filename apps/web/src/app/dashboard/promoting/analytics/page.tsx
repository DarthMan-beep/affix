import { Download } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getAnalytics } from "@/lib/analytics";
import { promotingNav } from "@/lib/dashboard-nav";
import { dayKey, parseRange } from "@/lib/range";
import { PageHeader, Panel, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { formatPercent } from "@/components/dashboard/format";
import { BarList, Heatmap, RangeTabs } from "@/components/dashboard/breakdowns";
import { TimeChart } from "@/components/dashboard/charts";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";

const BASE = "/dashboard/promoting/analytics";
const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const at = (isoDay: string) => new Date(`${isoDay}T12:00:00`);

const dateInput =
  "h-10 rounded-xl border border-line bg-card px-3 text-[0.85rem] text-ink outline-none focus:border-ink/40 focus:ring-4 focus:ring-spring/40";

function Chart({ title, total, children }: { title: string; total: string; children: React.ReactNode }) {
  return (
    <Panel>
      <p className="text-[0.8rem] text-muted">{title}</p>
      <p className="font-display tracking-heading tabular mt-1 text-[1.6rem] font-bold leading-tight text-ink">{total}</p>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

function Breakdown({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel>
      <h2 className="font-display tracking-heading text-[1.1rem] font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const actor = await requireActor(BASE);
  const range = parseRange(await searchParams);
  const data = await getAnalytics(actor, range);

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Analytics" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  const { totals, series, byProduct, bySource, byDevice, byCountry, heatmap } = data;
  const period = `${shortDay.format(range.from)} to ${shortDay.format(range.to)}`;
  const points = (pick: (d: (typeof series)[number]) => number) =>
    series.map((d) => ({ label: shortDay.format(at(d.date)), value: pick(d) }));
  const active = series.filter((d) => d.clicks > 0 || d.sales > 0).reverse();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Promoting · @${actor.affiliate!.handle}`}
        title="Analytics"
        description="Where your clicks come from, what they turn into, and when your audience is listening."
        action={
          <a
            href={`${BASE}/export?${range.query}`}
            download
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.9rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 hover:bg-ink/[0.03] hover:ring-ink/40"
          >
            <Download size={16} /> Export CSV
          </a>
        }
      />

      <SubNav label="Promoting" items={promotingNav} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeTabs base={BASE} range={range} />
        <form key={range.query} action={BASE} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="from">
            From
          </label>
          <input id="from" type="date" name="from" defaultValue={dayKey(range.from)} max={dayKey(new Date())} className={dateInput} />
          <span className="text-[0.85rem] text-muted">to</span>
          <label className="sr-only" htmlFor="to">
            To
          </label>
          <input id="to" type="date" name="to" defaultValue={dayKey(range.to)} max={dayKey(new Date())} className={dateInput} />
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-[0.85rem] font-semibold text-cream hover:bg-forest-700"
          >
            Apply
          </button>
        </form>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Clicks" value={formatNumber(totals.clicks)} />
        <Stat label="Unique clicks" value={formatNumber(totals.uniqueClicks)} />
        <Stat label="Sales" value={formatNumber(totals.sales)} />
        <Stat label="Conversion" value={formatPercent(totals.conversion)} />
        <Stat label="Earned" value={<span className="text-leaf-700">{formatCents(totals.earningsCents)}</span>} />
        <Stat label="Per click" value={formatCents(totals.epcCents)} />
      </dl>

      <Chart title={`Earnings, ${period}`} total={formatCents(totals.earningsCents)}>
        <TimeChart
          kind="line"
          unit="eur"
          points={points((d) => d.earningsCents)}
          description={`Daily earnings from ${period}, ${formatCents(totals.earningsCents)} in total.`}
        />
      </Chart>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Chart title="Clicks per day" total={formatNumber(totals.clicks)}>
          <TimeChart
            kind="line"
            unit="count"
            points={points((d) => d.clicks)}
            description={`Daily clicks from ${period}, ${formatNumber(totals.clicks)} in total.`}
          />
        </Chart>
        <Chart title="Sales per day" total={formatNumber(totals.sales)}>
          <TimeChart
            kind="bar"
            unit="count"
            points={points((d) => d.sales)}
            description={`Daily sales from ${period}, ${formatNumber(totals.sales)} in total.`}
          />
        </Chart>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
        <Breakdown title="Earnings by product">
          <BarList rows={byProduct} unit="eur" empty="No sales in this period." />
        </Breakdown>
        <Breakdown title="Clicks by source">
          <BarList rows={bySource} unit="count" empty="No clicks in this period." />
        </Breakdown>
        <Breakdown title="Clicks by device">
          <BarList rows={byDevice} unit="count" empty="No clicks in this period." />
        </Breakdown>
        <Breakdown title="Clicks by country">
          <BarList rows={byCountry} unit="count" empty="No clicks in this period." />
        </Breakdown>
      </div>

      <Breakdown title="When people click">
        <p className="-mt-2 mb-4 text-[0.88rem] text-muted">Clicks by weekday and hour. Darker means more.</p>
        <Heatmap cells={heatmap} />
      </Breakdown>

      <section>
        <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">Day by day</h2>
        {active.length === 0 ? (
          <p className="mt-5 rounded-[24px] bg-card px-6 py-10 text-center text-muted ring-1 ring-line">
            No clicks or sales in this period.
          </p>
        ) : (
          <div className="mt-5 max-h-[32rem] overflow-auto rounded-[24px] bg-card ring-1 ring-line">
            <table className="w-full min-w-[48rem] text-left text-[0.9rem]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-line text-[0.78rem] text-muted">
                  <th className="px-6 py-3.5 font-medium">Date</th>
                  <th className="px-3 py-3.5 text-right font-medium">Clicks</th>
                  <th className="px-3 py-3.5 text-right font-medium">Unique</th>
                  <th className="px-3 py-3.5 text-right font-medium">Sales</th>
                  <th className="px-3 py-3.5 text-right font-medium">Pending</th>
                  <th className="px-3 py-3.5 text-right font-medium">Approved</th>
                  <th className="px-3 py-3.5 text-right font-medium">Sales value</th>
                  <th className="px-6 py-3.5 text-right font-medium">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {active.map((d) => (
                  <tr key={d.date}>
                    <td className="whitespace-nowrap px-6 py-3 text-ink">{longDay.format(at(d.date))}</td>
                    <td className="font-mono tabular px-3 py-3 text-right">{formatNumber(d.clicks)}</td>
                    <td className="font-mono tabular px-3 py-3 text-right text-muted">{formatNumber(d.uniqueClicks)}</td>
                    <td className="font-mono tabular px-3 py-3 text-right">{formatNumber(d.sales)}</td>
                    <td className="font-mono tabular px-3 py-3 text-right text-muted">{formatNumber(d.pending)}</td>
                    <td className="font-mono tabular px-3 py-3 text-right text-muted">{formatNumber(d.approved)}</td>
                    <td className="font-mono tabular px-3 py-3 text-right">{formatCents(d.revenueCents)}</td>
                    <td className="font-mono tabular px-6 py-3 text-right font-semibold text-leaf-700">
                      {formatCents(d.earningsCents)}
                    </td>
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
