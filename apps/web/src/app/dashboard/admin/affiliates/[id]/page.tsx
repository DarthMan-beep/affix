import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pause, ShieldOff, UserCheck, UserX } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getAffiliateProfile } from "@/lib/admin";
import { Chip, Notice, PageHeader, Panel, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { AdminOnly } from "@/components/dashboard/admin-only";
import { TrustBadge, TrustSignals } from "@/components/dashboard/trust";
import { can } from "@affix/auth/permissions";
import {
  addAdjustment,
  holdAffiliateCommissions,
  saveAffiliateNote,
  setAffiliateSuspended,
  setUserBanned,
} from "../../actions";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const done: Record<string, { tone: "success" | "warning"; title: string }> = {
  suspended: { tone: "success", title: "Affiliate suspended. Their links no longer track and payouts are paused." },
  reinstated: { tone: "success", title: "Affiliate reinstated." },
  held: { tone: "success", title: "Their pending commissions are on hold." },
  note: { tone: "success", title: "Note saved." },
  adjusted: { tone: "success", title: "Balance adjusted." },
  "adjustment-invalid": { tone: "warning", title: "Enter an amount and a reason of at least 3 characters." },
};

const field =
  "h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[0.9rem] text-ink outline-none placeholder:text-muted-2 focus:border-ink/40 focus:ring-4 focus:ring-spring/40";
const outline =
  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.85rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 hover:bg-ink/[0.03] hover:ring-ink/40";

export default async function AffiliateProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { id } = await params;
  const actor = await requireActor(`/dashboard/admin/affiliates/${id}`);
  if (!can.manageAffiliates(actor)) return <AdminOnly />;
  const a = await getAffiliateProfile(actor, id);
  if (!a) notFound();

  const outcome = done[(await searchParams).done ?? ""];
  const here = `/dashboard/admin/affiliates/${a.id}`;
  const clicks = a.links.reduce((s, l) => s + l.clicks, 0);

  return (
    <div className="space-y-8">
      <Link href="/dashboard/admin/affiliates" className="inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> Affiliates
      </Link>

      <PageHeader
        eyebrow={`Admin · @${a.handle}`}
        title={a.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{a.email}</span>
            {a.banned ? <Chip tone="ink">Banned</Chip> : a.suspended ? <Chip tone="amber">Suspended</Chip> : <Chip tone="green">Active</Chip>}
            <TrustBadge trust={a.trust} />
            <span className="text-[0.85rem] text-muted-2">Joined {day.format(a.createdAt)}</span>
            {a.invitedBy && (
              <span className="text-[0.85rem] text-muted-2">
                · invited by{" "}
                <Link href={`/dashboard/admin/affiliates/${a.invitedBy.id}`} className="font-semibold text-ink hover:underline">
                  @{a.invitedBy.handle}
                </Link>
              </span>
            )}
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <form action={setAffiliateSuspended.bind(null, a.id, !a.suspended)}>
              <button type="submit" className={outline}>
                {a.suspended ? (
                  <>
                    <UserCheck size={15} /> Reinstate
                  </>
                ) : (
                  <>
                    <ShieldOff size={15} /> Suspend
                  </>
                )}
              </button>
            </form>
            {a.canBan && (
              <form action={setUserBanned.bind(null, a.userId, !a.banned, here)}>
                <button
                  type="submit"
                  className={
                    a.banned
                      ? outline
                      : "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.85rem] font-semibold text-[#8f3823] ring-1 ring-inset ring-[#c2553a]/30 hover:bg-[#c2553a]/10"
                  }
                >
                  <UserX size={15} /> {a.banned ? "Restore sign-in" : "Ban account"}
                </button>
              </form>
            )}
          </div>
        }
      />

      {outcome && <Notice tone={outcome.tone} title={outcome.title} />}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Clicks" value={formatNumber(clicks)} />
        <Stat label="Sales" value={formatNumber(a.totals.sales)} />
        <Stat label="Lifetime earned" value={formatCents(a.totals.lifetimeCents)} />
        <Stat label="Pending" value={formatCents(a.totals.pendingCents)} />
        <Stat label="Available" value={<span className="text-leaf-700">{formatCents(a.totals.availableCents)}</span>} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display tracking-heading text-[1.2rem] font-bold text-ink">Trust</h2>
            <TrustBadge trust={a.trust} />
          </div>
          <div className="mt-4">
            <TrustSignals trust={a.trust} />
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-[0.82rem]">
            <div>
              <dt className="text-muted">Clicks, 30 days</dt>
              <dd className="font-mono tabular mt-0.5 font-semibold text-ink">{formatNumber(a.trust.stats.clicks)}</dd>
            </div>
            <div>
              <dt className="text-muted">From bots</dt>
              <dd className="font-mono tabular mt-0.5 font-semibold text-ink">{formatNumber(a.trust.stats.botClicks)}</dd>
            </div>
            <div>
              <dt className="text-muted">Sales, 30 days</dt>
              <dd className="font-mono tabular mt-0.5 font-semibold text-ink">{formatNumber(a.trust.stats.sales)}</dd>
            </div>
          </dl>
          {a.totals.pendingCents > 0 && (
            <form action={holdAffiliateCommissions.bind(null, a.id)} className="mt-5">
              <button type="submit" className={outline}>
                <Pause size={15} /> Hold their pending commissions
              </button>
            </form>
          )}
        </Panel>

        <Panel>
          <h2 className="font-display tracking-heading text-[1.2rem] font-bold text-ink">Staff note</h2>
          <p className="mt-1 text-[0.85rem] text-muted">Only Affix staff see this.</p>
          <form action={saveAffiliateNote.bind(null, a.id)} className="mt-4 space-y-3">
            <label className="sr-only" htmlFor="note">
              Staff note
            </label>
            <textarea
              id="note"
              name="note"
              rows={5}
              maxLength={2000}
              defaultValue={a.adminNote ?? ""}
              placeholder="What you found, what you agreed, what to check next time."
              className="block w-full resize-y rounded-xl border border-line bg-card px-3.5 py-3 text-[0.9rem] leading-relaxed text-ink outline-none placeholder:text-muted-2 focus:border-ink/40 focus:ring-4 focus:ring-spring/40"
            />
            <button type="submit" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-[0.85rem] font-semibold text-cream hover:bg-forest-700">
              Save note
            </button>
          </form>
        </Panel>
      </div>

      <Panel>
        <h2 className="font-display tracking-heading text-[1.2rem] font-bold text-ink">Adjust balance</h2>
        <p className="mt-1 max-w-[60ch] text-[0.85rem] leading-relaxed text-muted">
          Add a bonus or take off a correction. It is paid out with their next payout, and they see the reason.
        </p>
        <form action={addAdjustment.bind(null, a.id)} className="mt-4 grid gap-3 sm:grid-cols-[9rem_8rem_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="direction" className="text-[0.82rem] font-medium text-ink">
              Type
            </label>
            <select id="direction" name="direction" defaultValue="plus" className={`${field} mt-1.5 cursor-pointer`}>
              <option value="plus">Bonus (+)</option>
              <option value="minus">Correction (−)</option>
            </select>
          </div>
          <div>
            <label htmlFor="amount" className="text-[0.82rem] font-medium text-ink">
              Amount (€)
            </label>
            <input id="amount" name="amount" inputMode="decimal" required placeholder="25.00" className={`${field} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="reason" className="text-[0.82rem] font-medium text-ink">
              Reason
            </label>
            <input id="reason" name="reason" required maxLength={200} placeholder="Launch bonus" className={`${field} mt-1.5`} />
          </div>
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-[0.88rem] font-semibold text-cream hover:bg-forest-700">
            Add
          </button>
        </form>
        {a.adjustments.length > 0 && (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {a.adjustments.map((x) => (
              <li key={x.id} className="flex items-baseline justify-between gap-4 py-3 text-[0.9rem]">
                <span className="min-w-0">
                  <span className="block text-ink">{x.reason}</span>
                  <span className="block text-[0.76rem] text-muted-2">
                    {day.format(x.createdAt)}
                    {x.byName ? ` · by ${x.byName}` : ""}
                  </span>
                </span>
                <span className={`font-mono tabular shrink-0 font-semibold ${x.amountCents > 0 ? "text-leaf-700" : "text-[#8f3823]"}`}>
                  {x.amountCents > 0 ? "+" : "−"}
                  {formatCents(Math.abs(x.amountCents))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="overflow-hidden rounded-[24px] bg-card ring-1 ring-line">
          <h2 className="font-display tracking-heading px-6 pb-2 pt-6 text-[1.2rem] font-bold text-ink">Links</h2>
          {a.links.length === 0 ? (
            <p className="px-6 py-8 text-center text-[0.9rem] text-muted">No links yet.</p>
          ) : (
            <table className="w-full text-left text-[0.88rem]">
              <tbody className="divide-y divide-line">
                {a.links.map((l) => (
                  <tr key={l.id}>
                    <td className="px-6 py-3">
                      <span className="block font-semibold text-ink">{l.productTitle}</span>
                      <span className="font-mono block break-all text-[0.74rem] text-muted-2">affix.to/{l.code}</span>
                    </td>
                    <td className="px-3 py-3">{l.status === "paused" && <Chip tone="amber">Paused</Chip>}</td>
                    <td className="font-mono tabular whitespace-nowrap px-6 py-3 text-right">{formatNumber(l.clicks)} clicks</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="overflow-hidden rounded-[24px] bg-card ring-1 ring-line">
          <h2 className="font-display tracking-heading px-6 pb-2 pt-6 text-[1.2rem] font-bold text-ink">Latest commissions</h2>
          {a.commissions.length === 0 ? (
            <p className="px-6 py-8 text-center text-[0.9rem] text-muted">No commissions yet.</p>
          ) : (
            <table className="w-full text-left text-[0.88rem]">
              <tbody className="divide-y divide-line">
                {a.commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-3">
                      <span className="block font-semibold text-ink">{c.productTitle}</span>
                      <span className="block text-[0.74rem] text-muted-2">
                        <span className="font-mono">{c.orderNumber}</span> · {day.format(c.createdAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[0.8rem] capitalize text-muted">{c.state.replace("_", " ")}</td>
                    <td className="font-mono tabular px-6 py-3 text-right font-semibold text-ink">{formatCents(c.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
