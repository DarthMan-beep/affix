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

  const { commissions, adjustments, referralBonuses, totals } = data;

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
                      <span className="ml-2 text-[0.78rem] text-muted-2">
                        {c.onHold
                          ? "on hold by the vendor"
                          : c.manualReview
                            ? "the vendor reviews it"
                            : `until ${shortDay.format(c.availableAt)}`}
                      </span>
                    )}
                    {(c.state === "rejected" || c.state === "reversed") && c.note && (
                      <span className="mt-1 block max-w-[16rem] whitespace-normal text-[0.76rem] leading-snug text-muted-2">
                        {c.note}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {referralBonuses.length > 0 && (
        <section>
          <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">Referral bonuses</h2>
          <p className="mt-1.5 text-[0.9rem] text-muted">
            Your bonus on sales by affiliates you invited. Each one follows the sale behind it: pending during the
            refund window, then part of your balance.
          </p>
          <ul className="mt-5 divide-y divide-line rounded-[24px] bg-card px-6 ring-1 ring-line">
            {referralBonuses.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 py-4 text-[0.92rem]">
                <span className="min-w-0">
                  <span className="block text-ink">
                    {b.invitedName} sold {b.productTitle}
                  </span>
                  <span className="block text-[0.78rem] text-muted-2">{day.format(b.createdAt)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <Chip tone={states[b.state].tone}>{states[b.state].label}</Chip>
                  <span
                    className={`font-mono tabular font-semibold ${
                      b.state === "rejected" || b.state === "reversed" ? "text-muted-2 line-through" : "text-leaf-700"
                    }`}
                  >
                    +{formatCents(b.amountCents)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adjustments.length > 0 && (
        <section>
          <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">Adjustments by Affix</h2>
          <p className="mt-1.5 text-[0.9rem] text-muted">
            Bonuses and corrections. They are part of your balance and go out with your next payout.
          </p>
          <ul className="mt-5 divide-y divide-line rounded-[24px] bg-card px-6 ring-1 ring-line">
            {adjustments.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-4 py-4 text-[0.92rem]">
                <span className="min-w-0">
                  <span className="block text-ink">{a.reason}</span>
                  <span className="block text-[0.78rem] text-muted-2">{day.format(a.createdAt)}</span>
                </span>
                <span
                  className={`font-mono tabular shrink-0 font-semibold ${
                    a.amountCents > 0 ? "text-leaf-700" : "text-[#8f3823]"
                  }`}
                >
                  {a.amountCents > 0 ? "+" : "−"}
                  {formatCents(Math.abs(a.amountCents))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
