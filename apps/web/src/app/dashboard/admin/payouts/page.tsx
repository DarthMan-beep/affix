import Link from "next/link";
import { Check, Send, ShieldAlert, X } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getAdminPayouts, methodLabel } from "@/lib/commerce";
import { adminNav } from "@/lib/dashboard-nav";
import { Chip, PageHeader, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { markPayoutCompleted, markPayoutSent, rejectPayout } from "../actions";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const states = {
  requested: { label: "Requested", tone: "amber" },
  sent: { label: "Sent", tone: "neutral" },
  completed: { label: "Completed", tone: "green" },
  rejected: { label: "Rejected", tone: "neutral" },
} as const;

export default async function AdminPayoutsPage() {
  const actor = await requireActor("/dashboard/admin/payouts");
  const data = await getAdminPayouts(actor);

  if (!data) {
    return (
      <section className="mx-auto mt-16 max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-spring">
          <ShieldAlert size={24} />
        </span>
        <h1 className="font-display tracking-heading mt-6 text-[2rem] font-bold text-ink">Admins only</h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-muted">Payouts are processed by Affix staff.</p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[0.92rem] font-semibold text-cream hover:bg-forest-700"
        >
          Back to overview
        </Link>
      </section>
    );
  }

  const { payouts, totals } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Payouts"
        description="Pay each request to the destination shown, mark it as sent, then as completed once it has arrived."
      />

      <SubNav
        label="Admin"
        items={adminNav.map((i) => (i.href.endsWith("/payouts") ? { ...i, count: totals.requested } : i))}
      />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting" value={formatNumber(totals.requested)} />
        <Stat label="To pay" value={formatCents(totals.requestedCents)} />
        <Stat label="Sent" value={formatCents(totals.sentCents)} />
        <Stat label="Completed" value={<span className="text-leaf-700">{formatCents(totals.completedCents)}</span>} />
      </dl>

      {payouts.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No payout requests yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[56rem] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Request</th>
                <th className="px-4 py-3.5 font-medium">Affiliate</th>
                <th className="px-4 py-3.5 font-medium">Pay to</th>
                <th className="px-4 py-3.5 text-right font-medium">Amount</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
                <th className="px-6 py-3.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="font-mono block text-[0.82rem] text-ink">{p.reference}</span>
                    <span className="block text-[0.76rem] text-muted-2">{day.format(p.requestedAt)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="block font-semibold text-ink">{p.affiliateName}</span>
                    <span className="block text-[0.78rem] text-muted">@{p.affiliateHandle}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="block text-ink">
                      {methodLabel[p.methodType]} · {p.methodHolder}
                    </span>
                    <span className="font-mono block text-[0.78rem] text-muted">{p.methodDetails}</span>
                  </td>
                  <td className="font-mono tabular px-4 py-4 text-right font-semibold text-ink">
                    {formatCents(p.amountCents)}
                  </td>
                  <td className="px-4 py-4">
                    <Chip tone={states[p.status].tone}>{states[p.status].label}</Chip>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      {p.status === "requested" && (
                        <form action={markPayoutSent.bind(null, p.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-[0.8rem] font-semibold text-cream hover:bg-forest-700"
                          >
                            <Send size={13} /> Mark as sent
                          </button>
                        </form>
                      )}
                      {p.status === "sent" && (
                        <form action={markPayoutCompleted.bind(null, p.id)}>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-spring px-3.5 py-1.5 text-[0.8rem] font-semibold text-ink hover:bg-spring-300"
                          >
                            <Check size={13} strokeWidth={3} /> Mark as completed
                          </button>
                        </form>
                      )}
                      {(p.status === "requested" || p.status === "sent") && (
                        <form action={rejectPayout.bind(null, p.id)}>
                          <button
                            type="submit"
                            aria-label={`Reject payout ${p.reference}`}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-muted ring-1 ring-inset ring-ink/15 hover:text-ink hover:ring-ink/40"
                          >
                            <X size={13} /> Reject
                          </button>
                        </form>
                      )}
                      {p.status === "completed" && p.completedAt && (
                        <span className="text-[0.78rem] text-muted-2">Paid {day.format(p.completedAt)}</span>
                      )}
                    </div>
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
