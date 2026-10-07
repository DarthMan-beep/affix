import Link from "next/link";
import { Check, Pause, Play, X } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getVendorCommissions, sellingNavFor, type ReviewState } from "@/lib/vendor";
import { Chip, Notice, PageHeader, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { decideCommissions } from "../actions";

const BASE = "/dashboard/selling/commissions";
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const tabs = [
  { key: "open", label: "To decide", states: ["review", "hold", "waiting"] },
  { key: "approved", label: "Approved", states: ["approved"] },
  { key: "closed", label: "Rejected and reversed", states: ["rejected", "reversed"] },
] as const satisfies readonly { key: string; label: string; states: readonly ReviewState[] }[];

const chips: Record<ReviewState, { label: string; tone: "green" | "neutral" | "amber" | "ink" }> = {
  review: { label: "Needs your review", tone: "amber" },
  hold: { label: "On hold", tone: "ink" },
  waiting: { label: "Refund window", tone: "neutral" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "neutral" },
  reversed: { label: "Reversed", tone: "neutral" },
};

const done: Record<string, (n: number) => string> = {
  approve: (n) => `${n} ${n === 1 ? "commission" : "commissions"} approved.`,
  reject: (n) => `${n} ${n === 1 ? "commission" : "commissions"} rejected.`,
  hold: (n) => `${n} ${n === 1 ? "commission" : "commissions"} put on hold.`,
  release: (n) => `${n} ${n === 1 ? "commission" : "commissions"} released.`,
};

const small =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition-colors";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; done?: string; n?: string }>;
}) {
  const actor = await requireActor(BASE);
  const commissions = await getVendorCommissions(actor);
  const params = await searchParams;

  if (!commissions) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="Commissions" />
        <WorkspaceLocked kind="selling" />
      </>
    );
  }

  const tab = tabs.find((t) => t.key === params.status) ?? tabs[0];
  const inTab = (t: (typeof tabs)[number]) => commissions.filter((c) => (t.states as readonly string[]).includes(c.state));
  const rows = inTab(tab);
  const total = (states: ReviewState[]) =>
    commissions.filter((c) => states.includes(c.state)).reduce((s, c) => s + c.amountCents, 0);
  const n = Number(params.n ?? 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Selling · /${actor.vendor!.slug}`}
        title="Commissions"
        description="What affiliates earned on your sales. Approve, reject or hold a commission while it is still pending."
      />

      <SubNav label="Selling" items={await sellingNavFor(actor)} />

      {params.done && done[params.done] && n > 0 && <Notice tone="success" title={done[params.done](n)} />}
      {params.done === "none" && (
        <Notice tone="info" title="Nothing changed">
          Tick at least one pending commission first.
        </Notice>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Need your review" value={formatNumber(commissions.filter((c) => c.state === "review").length)} />
        <Stat label="Pending" value={formatCents(total(["review", "hold", "waiting"]))} />
        <Stat label="Approved" value={formatCents(total(["approved"]))} />
        <Stat label="Rejected and reversed" value={formatCents(total(["rejected", "reversed"]))} />
      </dl>

      <div className="inline-flex max-w-full overflow-x-auto rounded-full bg-ink/[0.05] p-1" role="group" aria-label="Status">
        {tabs.map((t) => {
          const active = t.key === tab.key;
          return (
            <Link
              key={t.key}
              href={`${BASE}?status=${t.key}`}
              aria-current={active ? "true" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[0.85rem] font-semibold transition-colors ${
                active ? "bg-card text-ink shadow-[0_1px_2px_rgb(14_42_30/0.12)]" : "text-muted hover:text-ink"
              }`}
            >
              {t.label} <span className="font-mono tabular text-[0.75rem] text-muted">{inTab(t).length}</span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          {tab.key === "open" ? "Nothing is waiting. New commissions appear here with each affiliate sale." : "Nothing here yet."}
        </p>
      ) : (
        // One form: tick rows for the buttons underneath, or use a row's own buttons.
        <form className="space-y-4">
          <input type="hidden" name="tab" value={tab.key} />
          <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
            <table className="w-full min-w-[58rem] text-left text-[0.9rem]">
              <thead>
                <tr className="border-b border-line text-[0.78rem] text-muted">
                  {tab.key === "open" && <th className="w-10 py-3.5 pl-6 font-medium"><span className="sr-only">Select</span></th>}
                  <th className="px-4 py-3.5 font-medium">Sale</th>
                  <th className="px-4 py-3.5 font-medium">Affiliate</th>
                  <th className="px-4 py-3.5 text-right font-medium">Sale value</th>
                  <th className="px-4 py-3.5 text-right font-medium">Commission</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  {tab.key === "open" && <th className="px-6 py-3.5 text-right font-medium">Decide</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => (
                  <tr key={c.id}>
                    {tab.key === "open" && (
                      <td className="py-4 pl-6">
                        <input
                          type="checkbox"
                          name="ids"
                          value={c.id}
                          aria-label={`Select commission for order ${c.orderNumber}`}
                          className="h-4 w-4 rounded border-line accent-[#0e2a1e]"
                        />
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <span className="block font-semibold text-ink">{c.productTitle}</span>
                      <span className="block text-[0.76rem] text-muted-2">
                        <span className="font-mono">{c.orderNumber}</span> · {day.format(c.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-ink">@{c.affiliateHandle}</td>
                    <td className="font-mono tabular px-4 py-4 text-right">{formatCents(c.grossCents)}</td>
                    <td className="font-mono tabular px-4 py-4 text-right font-semibold text-ink">
                      {formatCents(c.amountCents)}
                    </td>
                    <td className="px-4 py-4">
                      <Chip tone={chips[c.state].tone}>{chips[c.state].label}</Chip>
                      {c.state === "waiting" && (
                        <span className="mt-1 block text-[0.76rem] text-muted-2">
                          Approves itself on {shortDay.format(c.availableAt)}
                        </span>
                      )}
                      {(c.state === "rejected" || c.state === "reversed") && c.note && (
                        <span className="mt-1 block max-w-[14rem] text-[0.76rem] leading-snug text-muted-2">{c.note}</span>
                      )}
                    </td>
                    {tab.key === "open" && (
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="submit"
                            formAction={decideCommissions.bind(null, "approve", c.id)}
                            className={`${small} bg-ink text-cream hover:bg-forest-700`}
                          >
                            <Check size={13} strokeWidth={3} /> Approve
                          </button>
                          <button
                            type="submit"
                            formAction={decideCommissions.bind(null, c.onHold ? "release" : "hold", c.id)}
                            className={`${small} text-ink ring-1 ring-inset ring-ink/15 hover:ring-ink/40`}
                          >
                            {c.onHold ? (
                              <>
                                <Play size={13} /> Release
                              </>
                            ) : (
                              <>
                                <Pause size={13} /> Hold
                              </>
                            )}
                          </button>
                          <button
                            type="submit"
                            formAction={decideCommissions.bind(null, "reject", c.id)}
                            aria-label={`Reject commission for order ${c.orderNumber}`}
                            className={`${small} text-muted ring-1 ring-inset ring-ink/15 hover:text-ink hover:ring-ink/40`}
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tab.key === "open" && (
            <div className="flex flex-col gap-3 rounded-[24px] bg-card p-5 ring-1 ring-line lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="reason" className="text-[0.88rem] font-medium text-ink">
                  Reason for rejecting
                </label>
                <input
                  id="reason"
                  name="reason"
                  maxLength={200}
                  placeholder="Optional. The affiliate sees it, e.g. duplicate order."
                  className="mt-2 h-11 w-full rounded-xl border border-line bg-card px-4 text-[0.9rem] text-ink outline-none placeholder:text-muted-2 focus:border-ink/40 focus:ring-4 focus:ring-spring/40"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  formAction={decideCommissions.bind(null, "approve", null)}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.88rem] font-semibold text-cream hover:bg-forest-700"
                >
                  <Check size={15} strokeWidth={3} /> Approve selected
                </button>
                <button
                  type="submit"
                  formAction={decideCommissions.bind(null, "reject", null)}
                  className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.88rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 hover:ring-ink/40"
                >
                  <X size={15} /> Reject selected
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
