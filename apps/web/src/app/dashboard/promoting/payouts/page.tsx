import { ArrowRight, Landmark, Mail } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getPayouts, methodLabel } from "@/lib/commerce";
import { promotingNav } from "@/lib/dashboard-nav";
import { Chip, Notice, PageHeader, Panel, formatCents } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { makeDefaultMethod, removePayoutMethod, requestPayout } from "../actions";
import { MethodForm } from "./method-form";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const payoutStates = {
  requested: { label: "Requested", tone: "amber" },
  sent: { label: "Sent", tone: "neutral" },
  completed: { label: "Completed", tone: "green" },
  rejected: { label: "Rejected", tone: "neutral" },
} as const;

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ payout?: string; method?: string }>;
}) {
  const actor = await requireActor("/dashboard/promoting/payouts");
  const data = await getPayouts(actor);
  const { payout: outcome, method } = await searchParams;

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Payouts" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  const { totals, minimumCents, canRequest, methods, history } = data;
  const progress = Math.min(100, Math.round((totals.availableCents / minimumCents) * 100));
  const missing = minimumCents - totals.availableCents;
  const blocker = !actor.emailVerified
    ? "Verify your email address before your first payout."
    : methods.length === 0
      ? "Add a payout method below to withdraw."
      : missing > 0
        ? `${formatCents(missing)} to go until the ${formatCents(minimumCents)} minimum.`
        : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Promoting · @${actor.affiliate!.handle}`}
        title="Payouts"
        description="Withdraw your available balance once it reaches the minimum."
      />

      <SubNav label="Promoting" items={promotingNav} />

      {outcome === "requested" && (
        <Notice tone="success" title="Payout requested">
          We&apos;ll send it to your default payout method. You can follow it in the history below.
        </Notice>
      )}
      {outcome === "refused" && (
        <Notice tone="warning" title="That payout couldn't be requested">
          Check the balance, your payout method and your email verification, then try again.
        </Notice>
      )}
      {method === "added" && <Notice tone="success" title="Payout method saved" />}

      <Panel>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[0.82rem] text-muted">Available to withdraw</p>
            <p className="font-display tracking-heading tabular mt-1 text-[2.75rem] font-bold leading-none text-ink">
              {formatCents(totals.availableCents)}
            </p>
            <div
              className="mt-5 h-2 max-w-md overflow-hidden rounded-full bg-ink/[0.08]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={`Progress to the ${formatCents(minimumCents)} minimum payout`}
            >
              <div className="h-full rounded-full bg-leaf" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2.5 text-[0.88rem] text-muted">
              {blocker ?? `You've reached the ${formatCents(minimumCents)} minimum. The whole balance is paid out.`}
            </p>
          </div>
          <form action={requestPayout} className="shrink-0">
            <button
              type="submit"
              disabled={!canRequest}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-spring px-7 font-semibold text-ink shadow-[0_10px_30px_-12px_rgb(125_239_161/0.8)] transition-colors hover:bg-spring-300 disabled:cursor-not-allowed disabled:bg-ink/[0.08] disabled:text-muted disabled:shadow-none"
            >
              Request payout <ArrowRight size={17} />
            </button>
          </form>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-5">
          {[
            { label: "Pending", value: totals.pendingCents },
            { label: "Being paid out", value: totals.inPayoutCents },
            { label: "Paid out", value: totals.paidCents },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-[0.78rem] text-muted">{s.label}</dt>
              <dd className="font-mono tabular mt-0.5 text-[1rem] font-semibold text-ink">{formatCents(s.value)}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel>
        <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">Payout methods</h2>
        {methods.length > 0 && (
          <ul className="mt-5 divide-y divide-line rounded-2xl ring-1 ring-line">
            {methods.map((m) => {
              const Icon = m.type === "bank" ? Landmark : Mail;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/[0.06] text-ink">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[0.92rem] font-semibold text-ink">
                      {methodLabel[m.type]} {m.isDefault && <Chip tone="green">Default</Chip>}
                    </p>
                    <p className="truncate text-[0.82rem] text-muted">
                      {m.holder} · <span className="font-mono">{m.details}</span>
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {!m.isDefault && (
                      <form action={makeDefaultMethod.bind(null, m.id)}>
                        <button type="submit" className="rounded-full px-3 py-1.5 text-[0.82rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 hover:ring-ink/40">
                          Make default
                        </button>
                      </form>
                    )}
                    <form action={removePayoutMethod.bind(null, m.id)}>
                      <button type="submit" className="rounded-full px-3 py-1.5 text-[0.82rem] font-semibold text-muted hover:bg-ink/[0.05] hover:text-ink">
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className={methods.length > 0 ? "mt-7 border-t border-line pt-6" : "mt-5"}>
          <MethodForm holder={actor.name} />
        </div>
      </Panel>

      <section>
        <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">Payout history</h2>
        {history.length === 0 ? (
          <p className="mt-5 rounded-[24px] bg-card px-6 py-10 text-center text-muted ring-1 ring-line">
            No payouts yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
            <table className="w-full min-w-[42rem] text-left text-[0.92rem]">
              <thead>
                <tr className="border-b border-line text-[0.78rem] text-muted">
                  <th className="px-6 py-3.5 font-medium">Requested</th>
                  <th className="px-4 py-3.5 font-medium">Reference</th>
                  <th className="px-4 py-3.5 font-medium">Method</th>
                  <th className="px-4 py-3.5 text-right font-medium">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="font-mono tabular whitespace-nowrap px-6 py-4 text-[0.82rem] text-muted">
                      {day.format(h.requestedAt)}
                    </td>
                    <td className="font-mono px-4 py-4 text-[0.82rem] text-ink">{h.reference}</td>
                    <td className="px-4 py-4">
                      <span className="block text-ink">{methodLabel[h.methodType]}</span>
                      <span className="font-mono block text-[0.76rem] text-muted-2">{h.methodDetails}</span>
                    </td>
                    <td className="font-mono tabular px-4 py-4 text-right font-semibold text-ink">
                      {formatCents(h.amountCents)}
                    </td>
                    <td className="px-6 py-4">
                      <Chip tone={payoutStates[h.status].tone}>{payoutStates[h.status].label}</Chip>
                      {h.status === "rejected" && h.note && (
                        <span className="mt-1 block text-[0.78rem] text-muted-2">{h.note}</span>
                      )}
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
