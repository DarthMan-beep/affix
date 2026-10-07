import { Check, Send, X } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { adminNavFor } from "@/lib/admin";
import { getAdminPayouts, methodLabel } from "@/lib/commerce";
import { Chip, Notice, PageHeader, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { AdminOnly } from "@/components/dashboard/admin-only";
import { SubNav } from "@/components/dashboard/subnav";
import { advancePayouts, markPayoutCompleted, markPayoutSent, rejectPayout } from "../actions";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const states = {
  requested: { label: "Requested", tone: "amber" },
  sent: { label: "Sent", tone: "neutral" },
  completed: { label: "Completed", tone: "green" },
  rejected: { label: "Rejected", tone: "neutral" },
} as const;

const small =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold transition-colors";

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; n?: string }>;
}) {
  const actor = await requireActor("/dashboard/admin/payouts");
  const data = await getAdminPayouts(actor);
  if (!data) return <AdminOnly />;

  const { payouts, totals } = data;
  const { done, n } = await searchParams;
  const count = Number(n ?? 0);
  const open = payouts.some((p) => p.status === "requested" || p.status === "sent");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Payouts"
        description="Pay each request to the destination shown, mark it as sent, then as completed once it has arrived."
      />

      <SubNav label="Admin" items={await adminNavFor(actor)} />

      {(done === "sent" || done === "completed") && count > 0 && (
        <Notice tone="success" title={`${count} ${count === 1 ? "payout" : "payouts"} marked as ${done}.`} />
      )}
      {(done === "none" || ((done === "sent" || done === "completed") && count === 0)) && (
        <Notice tone="info" title="Nothing changed">
          Tick payouts that are waiting for that step first.
        </Notice>
      )}

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
        // One form: tick rows for the buttons underneath, or use a row's own buttons.
        <form className="space-y-4">
          <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
            <table className="w-full min-w-[60rem] text-left text-[0.9rem]">
              <thead>
                <tr className="border-b border-line text-[0.78rem] text-muted">
                  <th className="w-10 py-3.5 pl-6 font-medium">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-3.5 font-medium">Request</th>
                  <th className="px-4 py-3.5 font-medium">Affiliate</th>
                  <th className="px-4 py-3.5 font-medium">Pay to</th>
                  <th className="px-4 py-3.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payouts.map((p) => {
                  const live = p.status === "requested" || p.status === "sent";
                  return (
                    <tr key={p.id}>
                      <td className="py-4 pl-6">
                        {live && (
                          <input
                            type="checkbox"
                            name="ids"
                            value={p.id}
                            aria-label={`Select payout ${p.reference}`}
                            className="h-4 w-4 rounded border-line accent-[#0e2a1e]"
                          />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
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
                            <button
                              type="submit"
                              formAction={markPayoutSent.bind(null, p.id)}
                              className={`${small} bg-ink text-cream hover:bg-forest-700`}
                            >
                              <Send size={13} /> Mark as sent
                            </button>
                          )}
                          {p.status === "sent" && (
                            <button
                              type="submit"
                              formAction={markPayoutCompleted.bind(null, p.id)}
                              className={`${small} bg-spring text-ink hover:bg-spring-300`}
                            >
                              <Check size={13} strokeWidth={3} /> Mark as completed
                            </button>
                          )}
                          {live && (
                            <button
                              type="submit"
                              formAction={rejectPayout.bind(null, p.id)}
                              aria-label={`Reject payout ${p.reference}`}
                              className={`${small} text-muted ring-1 ring-inset ring-ink/15 hover:text-ink hover:ring-ink/40`}
                            >
                              <X size={13} /> Reject
                            </button>
                          )}
                          {p.status === "completed" && p.completedAt && (
                            <span className="text-[0.78rem] text-muted-2">Paid {day.format(p.completedAt)}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {open && (
            <div className="flex flex-col gap-3 rounded-[24px] bg-card p-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.88rem] text-muted">Tick several payouts to move them one step on together.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  formAction={advancePayouts.bind(null, "sent")}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.88rem] font-semibold text-cream hover:bg-forest-700"
                >
                  <Send size={15} /> Mark selected as sent
                </button>
                <button
                  type="submit"
                  formAction={advancePayouts.bind(null, "completed")}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-spring px-5 text-[0.88rem] font-semibold text-ink hover:bg-spring-300"
                >
                  <Check size={15} strokeWidth={3} /> Mark selected as completed
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
