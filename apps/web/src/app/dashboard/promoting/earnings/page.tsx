import { requireActor } from "@/lib/dal";
import { getEarnings, type CommissionState } from "@/lib/commerce";
import { promotingNav } from "@/lib/dashboard-nav";
import { Chip, PageHeader, Stat, formatCents } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const states: Record<CommissionState, { label: string; tone: "green" | "neutral" | "amber" | "ink" }> = {
  pending: { label: "Pending", tone: "amber" },
  available: { label: "Available", tone: "green" },
  in_payout: { label: "In payout", tone: "neutral" },
  paid: { label: "Paid", tone: "ink" },
  rejected: { label: "Rejected", tone: "neutral" },
  reversed: { label: "Reversed", tone: "neutral" },
};

export default async function EarningsPage() {
  const actor = await requireActor("/dashboard/promoting/earnings");
  const data = await getEarnings(actor);

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Your earnings" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  const { commissions, totals } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Promoting · @${actor.affiliate!.handle}`}
        title="Your earnings"
        description="Every sale your links brought in. A commission is pending during the product's refund window, then it becomes available to withdraw."
      />

      <SubNav label="Promoting" items={promotingNav} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Available" value={<span className="text-leaf-700">{formatCents(totals.availableCents)}</span>} />
        <Stat label="Pending" value={formatCents(totals.pendingCents)} />
        <Stat label="Paid out" value={formatCents(totals.paidCents + totals.inPayoutCents)} />
        <Stat label="Lifetime earned" value={formatCents(totals.lifetimeCents)} />
      </dl>

      {commissions.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No commissions yet. Share one of your links: the first sale it brings in shows up here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[44rem] text-left text-[0.92rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Date</th>
                <th className="px-4 py-3.5 font-medium">Product</th>
                <th className="px-4 py-3.5 text-right font-medium">Sale</th>
                <th className="px-4 py-3.5 text-right font-medium">Commission</th>
                <th className="px-6 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {commissions.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono tabular whitespace-nowrap px-6 py-4 text-[0.82rem] text-muted">
                    {day.format(c.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="block font-semibold text-ink">{c.productTitle}</span>
                    <span className="font-mono block text-[0.76rem] text-muted-2">{c.orderNumber}</span>
                  </td>
                  <td className="font-mono tabular px-4 py-4 text-right">{formatCents(c.grossCents)}</td>
                  <td className="font-mono tabular px-4 py-4 text-right font-semibold text-leaf-700">
                    +{formatCents(c.amountCents)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Chip tone={states[c.state].tone}>{states[c.state].label}</Chip>
                    {c.state === "pending" && (
                      <span className="ml-2 text-[0.78rem] text-muted-2">until {shortDay.format(c.availableAt)}</span>
                    )}
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
