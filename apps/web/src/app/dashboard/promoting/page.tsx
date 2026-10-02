import Link from "next/link";
import { ArrowRight, Banknote, MousePointerClick, Plus, ShoppingBag } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getOverview } from "@/lib/analytics";
import { promotingNav } from "@/lib/dashboard-nav";
import { parseRange } from "@/lib/range";
import { Chip, PageHeader, Panel, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { EmptyNote, formatPercent } from "@/components/dashboard/format";
import { RangeTabs } from "@/components/dashboard/breakdowns";
import { TimeChart } from "@/components/dashboard/charts";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";

const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const label = (isoDay: string) => shortDay.format(new Date(`${isoDay}T12:00:00`));

export default async function PromotingOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const actor = await requireActor("/dashboard/promoting");
  const range = parseRange({ range: (await searchParams).range });
  const data = await getOverview(actor, range);

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Promote products" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  const { periods, today, totals, series, topLinks, events } = data;
  const firstName = actor.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Promoting · @${actor.affiliate!.handle}`}
        title={`Hello, ${firstName}`}
        description="What your links earned, and how they are doing."
        action={
          <Link
            href="/dashboard/promoting/links#new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700"
          >
            <Plus size={16} /> New link
          </Link>
        }
      />

      <SubNav label="Promoting" items={promotingNav} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Today" value={formatCents(periods.todayCents)} />
        <Stat label="This week" value={formatCents(periods.weekCents)} />
        <Stat label="This month" value={formatCents(periods.monthCents)} />
        <Stat label="Lifetime earned" value={formatCents(periods.lifetimeCents)} />
        <Stat label="Pending" value={formatCents(periods.pendingCents)} />
      </dl>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.8rem] text-muted">Earnings, last {range.days} days</p>
            <p className="font-display tracking-heading tabular mt-1 text-[2rem] font-bold leading-tight text-ink">
              {formatCents(totals.earningsCents)}
            </p>
          </div>
          <RangeTabs base="/dashboard/promoting" range={range} />
        </div>
        <div className="mt-4">
          <TimeChart
            kind="line"
            unit="eur"
            points={series.map((d) => ({ label: label(d.date), value: d.earningsCents }))}
            description={`Daily earnings for the last ${range.days} days, ${formatCents(totals.earningsCents)} in total.`}
          />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.8rem] text-muted">Clicks, last {range.days} days</p>
              <p className="font-display tracking-heading tabular mt-1 text-[1.6rem] font-bold leading-tight text-ink">
                {formatNumber(totals.clicks)}
              </p>
            </div>
            <p className="text-right text-[0.8rem] text-muted">
              <span className="font-mono tabular font-semibold text-ink">{formatNumber(today.clicks)}</span> today
            </p>
          </div>
          <div className="mt-4">
            <TimeChart
              kind="bar"
              unit="count"
              points={series.map((d) => ({ label: label(d.date), value: d.clicks }))}
              description={`Daily clicks for the last ${range.days} days, ${formatNumber(totals.clicks)} in total.`}
            />
          </div>
        </Panel>
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.8rem] text-muted">Sales, last {range.days} days</p>
              <p className="font-display tracking-heading tabular mt-1 text-[1.6rem] font-bold leading-tight text-ink">
                {formatNumber(totals.sales)}
              </p>
            </div>
            <p className="text-right text-[0.8rem] text-muted">
              <span className="font-mono tabular font-semibold text-ink">{formatPercent(totals.conversion)}</span>{" "}
              of clicks convert
            </p>
          </div>
          <div className="mt-4">
            <TimeChart
              kind="bar"
              unit="count"
              points={series.map((d) => ({ label: label(d.date), value: d.sales }))}
              description={`Daily sales for the last ${range.days} days, ${formatNumber(totals.sales)} in total.`}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-5">
        <section className="overflow-hidden rounded-[24px] bg-card ring-1 ring-line">
          <div className="flex items-center justify-between gap-4 px-6 pb-2 pt-6">
            <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">Top links</h2>
            <Link
              href="/dashboard/promoting/links"
              className="group inline-flex items-center gap-1 text-[0.85rem] font-semibold text-ink hover:text-leaf-700"
            >
              All {formatNumber(totals.activeLinks)} active
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {topLinks.length === 0 ? (
            <EmptyNote>No clicks or sales in this period yet.</EmptyNote>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-[0.9rem]">
                <thead>
                  <tr className="border-b border-line text-[0.78rem] text-muted">
                    <th className="px-6 py-3 font-medium">Link</th>
                    <th className="px-3 py-3 text-right font-medium">Clicks</th>
                    <th className="px-3 py-3 text-right font-medium">Sales</th>
                    <th className="px-3 py-3 text-right font-medium">Conv.</th>
                    <th className="px-6 py-3 text-right font-medium">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {topLinks.map((l) => (
                    <tr key={l.id}>
                      <td className="px-6 py-3.5">
                        <span className="block font-semibold text-ink">{l.productTitle}</span>
                        <span className="font-mono block text-[0.76rem] text-muted-2">{l.campaign ?? "main link"}</span>
                      </td>
                      <td className="font-mono tabular px-3 py-3.5 text-right">{formatNumber(l.clicks)}</td>
                      <td className="font-mono tabular px-3 py-3.5 text-right">{formatNumber(l.sales)}</td>
                      <td className="font-mono tabular px-3 py-3.5 text-right text-muted">{formatPercent(l.conversion)}</td>
                      <td className="font-mono tabular px-6 py-3.5 text-right font-semibold text-leaf-700">
                        {formatCents(l.earningsCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Panel>
          <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">Recent activity</h2>
          {events.length === 0 ? (
            <EmptyNote>Nothing yet. Share a link to get started.</EmptyNote>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {events.map((e, i) => {
                const Icon = e.kind === "click" ? MousePointerClick : e.kind === "sale" ? ShoppingBag : Banknote;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        e.kind === "click" ? "bg-ink/[0.06] text-ink" : "bg-spring/30 text-leaf-700"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9rem] leading-snug text-ink">
                        {e.kind === "click" && (
                          <>
                            Click from <span className="font-semibold">{e.source}</span> on {e.productTitle}
                          </>
                        )}
                        {e.kind === "sale" && (
                          <>
                            Sale of {e.productTitle}:{" "}
                            <span className="font-mono font-semibold text-leaf-700">+{formatCents(e.amountCents)}</span>
                          </>
                        )}
                        {e.kind === "payout" && (
                          <>
                            Payout of <span className="font-mono font-semibold">{formatCents(e.amountCents)}</span>{" "}
                            <Chip tone={e.status === "completed" ? "green" : e.status === "requested" ? "amber" : "neutral"}>
                              {e.status}
                            </Chip>
                          </>
                        )}
                      </p>
                      <p className="mt-0.5 text-[0.76rem] text-muted-2">{when.format(e.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
