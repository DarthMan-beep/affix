import Link from "next/link";
import { ArrowRight, Banknote, ShieldAlert, UserX } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { adminNavFor, getPlatformOverview } from "@/lib/admin";
import { parseRange } from "@/lib/range";
import { PageHeader, Panel, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { AdminOnly } from "@/components/dashboard/admin-only";
import { EmptyNote, formatPercent } from "@/components/dashboard/format";
import { BarList, RangeTabs } from "@/components/dashboard/breakdowns";
import { TimeChart } from "@/components/dashboard/charts";
import { SubNav } from "@/components/dashboard/subnav";

const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const label = (isoDay: string) => shortDay.format(new Date(`${isoDay}T12:00:00`));

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const actor = await requireActor("/dashboard/admin");
  const range = parseRange({ range: (await searchParams).range });
  const data = await getPlatformOverview(actor, range);
  if (!data) return <AdminOnly />;

  const { totals, series, split, funnel, topAffiliates, byCategory, alerts } = data;
  const top = funnel[0].value;

  const todo = [
    alerts.payoutsWaiting > 0 && {
      icon: Banknote,
      href: "/dashboard/admin/payouts",
      text: `${formatNumber(alerts.payoutsWaiting)} payout ${alerts.payoutsWaiting === 1 ? "request" : "requests"} waiting (${formatCents(alerts.payoutsWaitingCents)})`,
    },
    alerts.atRisk > 0 && {
      icon: ShieldAlert,
      href: "/dashboard/admin/fraud",
      text: `${formatNumber(alerts.atRisk)} ${alerts.atRisk === 1 ? "affiliate" : "affiliates"} at risk of fraud`,
    },
    alerts.toWatch > 0 && {
      icon: ShieldAlert,
      href: "/dashboard/admin/fraud",
      text: `${formatNumber(alerts.toWatch)} ${alerts.toWatch === 1 ? "affiliate" : "affiliates"} to keep an eye on`,
    },
    alerts.suspended > 0 && {
      icon: UserX,
      href: "/dashboard/admin/affiliates?status=suspended",
      text: `${formatNumber(alerts.suspended)} suspended ${alerts.suspended === 1 ? "affiliate" : "affiliates"}`,
    },
  ].filter((x) => x !== false);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Platform overview"
        description="Everything sold through Affix, where the money went, and what needs your attention."
      />

      <SubNav label="Admin" items={await adminNavFor(actor)} />

      {todo.length > 0 && (
        <Panel>
          <h2 className="font-display tracking-heading text-[1.1rem] font-bold text-ink">Needs attention</h2>
          <ul className="mt-3 divide-y divide-line">
            {todo.map((t) => (
              <li key={t.text}>
                <Link href={t.href} className="group flex items-center gap-3 py-3 text-[0.92rem] text-ink hover:text-leaf-700">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e0a030]/20 text-[#7a5410]">
                    <t.icon size={16} />
                  </span>
                  <span className="flex-1 font-medium">{t.text}</span>
                  <ArrowRight size={15} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.8rem] text-muted">Sales on the platform, last {range.days} days</p>
            <p className="font-display tracking-heading tabular mt-1 text-[2rem] font-bold leading-tight text-ink">
              {formatCents(totals.revenueCents)}
            </p>
          </div>
          <RangeTabs base="/dashboard/admin" range={range} />
        </div>
        <div className="mt-4">
          <TimeChart
            kind="line"
            unit="eur"
            points={series.map((d) => ({ label: label(d.date), value: d.revenueCents }))}
            description={`Daily sales on the platform for the last ${range.days} days, ${formatCents(totals.revenueCents)} in total.`}
          />
        </div>
      </Panel>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={formatNumber(totals.orders)} />
        <Stat label="Affix fees" value={<span className="text-leaf-700">{formatCents(totals.feeCents)}</span>} />
        <Stat label="Commissions" value={formatCents(totals.commissionsCents)} />
        <Stat label="New accounts" value={formatNumber(totals.signups)} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel>
          <h2 className="font-display tracking-heading text-[1.1rem] font-bold text-ink">Where the money went</h2>
          <div className="mt-4">
            <BarList rows={split} unit="eur" empty="No sales in this period." />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display tracking-heading text-[1.1rem] font-bold text-ink">From click to sale</h2>
          {top === 0 ? (
            <EmptyNote>No clicks in this period.</EmptyNote>
          ) : (
            <ol className="mt-4 space-y-3">
              {funnel.map((step, i) => (
                <li key={step.label}>
                  <div className="flex items-baseline justify-between gap-3 text-[0.88rem]">
                    <span className="text-ink">{step.label}</span>
                    <span className="shrink-0 text-muted">
                      <span className="font-mono tabular font-semibold text-ink">{formatNumber(step.value)}</span>
                      {i > 0 && <> · {formatPercent(step.value / top)} of clicks</>}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-ink/[0.06]">
                    <div
                      className="h-full rounded-full bg-split-vendor"
                      style={{ width: `${Math.max(1.5, (step.value / top) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel>
          <h2 className="font-display tracking-heading text-[1.1rem] font-bold text-ink">Sales by category</h2>
          <div className="mt-4">
            <BarList rows={byCategory} unit="eur" empty="No sales in this period." />
          </div>
        </Panel>
        <Panel>
          <p className="text-[0.8rem] text-muted">New accounts per day</p>
          <p className="font-display tracking-heading tabular mt-1 text-[1.6rem] font-bold leading-tight text-ink">
            {formatNumber(totals.signups)}
          </p>
          <div className="mt-4">
            <TimeChart
              kind="bar"
              unit="count"
              points={series.map((d) => ({ label: label(d.date), value: d.signups }))}
              description={`New accounts per day for the last ${range.days} days, ${formatNumber(totals.signups)} in total.`}
            />
          </div>
        </Panel>
      </div>

      <section className="overflow-hidden rounded-[24px] bg-card ring-1 ring-line">
        <div className="flex items-center justify-between gap-4 px-6 pb-2 pt-6">
          <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">Top affiliates</h2>
          <Link
            href="/dashboard/admin/affiliates"
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
