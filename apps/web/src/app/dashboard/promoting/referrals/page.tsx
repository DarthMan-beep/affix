import { requireActor } from "@/lib/dal";
import { promotingNav } from "@/lib/dashboard-nav";
import { getReferrals, type InviteeStatus } from "@/lib/referrals";
import { Chip, Notice, PageHeader, Panel, Stat, formatCents, formatNumber, percent } from "@/components/dashboard/ui";
import { EmptyNote } from "@/components/dashboard/format";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { InviteLink } from "./invite-link";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const statuses: Record<InviteeStatus, { label: string; tone: "green" | "neutral" | "amber" }> = {
  earning: { label: "Earning", tone: "green" },
  no_sales: { label: "No sales yet", tone: "amber" },
  not_promoting: { label: "Not promoting yet", tone: "neutral" },
  ended: { label: "Bonus period over", tone: "neutral" },
};

const months = (n: number) => `${n} ${n === 1 ? "month" : "months"}`;

export default async function ReferralsPage() {
  const actor = await requireActor("/dashboard/promoting/referrals");
  const data = await getReferrals(actor);

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Referrals" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  const { handle, canInvite, bonusBps, months: period, invitees, totals } = data;
  const off = bonusBps === 0;
  const steps = [
    { title: "Share your invite link", body: "Anyone who creates an Affix account through it is tied to you." },
    { title: "They start promoting", body: "They pick products and share links, exactly like you do." },
    {
      title: `You earn ${percent(bonusBps)} on top`,
      body: `For ${months(period)} after they join, each of their commissions earns you a bonus. They keep their full commission.`,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Promoting · @${handle}`}
        title="Referrals"
        description={
          off
            ? "Invite other affiliates to Affix. The referral bonus is switched off at the moment."
            : `Invite other affiliates. For ${months(period)} after they join, you earn ${percent(bonusBps)} on top of every commission they earn. Affix pays it out of its own fee.`
        }
      />

      <SubNav label="Promoting" items={promotingNav} />

      {!canInvite && (
        <Notice tone="warning" title="Your account is suspended">
          Your invite link is paused and new sales by people you invited earn no bonus. Contact Affix support.
        </Notice>
      )}
      {canInvite && off && (
        <Notice tone="info" title="The referral bonus is switched off">
          You can still invite people. Sales made while it is off earn no bonus.
        </Notice>
      )}

      <Panel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display tracking-heading text-[1.3rem] font-bold text-ink">Your invite link</h2>
            <p className="mt-1.5 max-w-[46ch] text-[0.9rem] leading-relaxed text-muted">
              It opens the sign-up page. The account has to be created within 30 days of the click, in the same browser.
            </p>
          </div>
          <InviteLink handle={handle} />
        </div>
        <ol className="mt-7 grid gap-5 border-t border-line pt-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3.5">
              <span className="font-mono tabular grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[0.78rem] font-semibold text-spring">
                {i + 1}
              </span>
              <span>
                <span className="block text-[0.95rem] font-semibold text-ink">{s.title}</span>
                <span className="mt-1 block text-[0.86rem] leading-relaxed text-muted">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invited" value={formatNumber(totals.invited)} />
        <Stat label="Earning for you" value={formatNumber(totals.earning)} />
        <Stat label="Bonus pending" value={formatCents(totals.pendingCents)} />
        <Stat label="Bonus earned" value={<span className="text-leaf-700">{formatCents(totals.earnedCents)}</span>} />
      </dl>

      <section>
        <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">People you invited</h2>
        <p className="mt-1.5 text-[0.9rem] text-muted">
          A bonus is pending while the sale behind it is in its refund window, like a commission. Earned bonuses are
          part of your balance and go out with your next payout.
        </p>
        <div className="mt-5 overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          {invitees.length === 0 ? (
            <EmptyNote>Nobody has joined through your link yet. Share it with someone who would be good at this.</EmptyNote>
          ) : (
            <table className="w-full min-w-[46rem] text-left text-[0.92rem]">
              <thead>
                <tr className="border-b border-line text-[0.78rem] text-muted">
                  <th className="px-6 py-3.5 font-medium">Who</th>
                  <th className="px-4 py-3.5 font-medium">Joined</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="px-4 py-3.5 text-right font-medium">Sales</th>
                  <th className="px-4 py-3.5 text-right font-medium">Pending</th>
                  <th className="px-6 py-3.5 text-right font-medium">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invitees.map((i) => (
                  <tr key={i.id}>
                    <td className="px-6 py-4">
                      <span className="block font-semibold text-ink">{i.name}</span>
                      {i.handle && <span className="font-mono block text-[0.76rem] text-muted-2">@{i.handle}</span>}
                    </td>
                    <td className="font-mono tabular whitespace-nowrap px-4 py-4 text-[0.82rem] text-muted">
                      {day.format(i.joinedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Chip tone={statuses[i.status].tone}>{statuses[i.status].label}</Chip>
                      {i.status !== "ended" && (
                        <span className="mt-1 block text-[0.76rem] text-muted-2">bonus until {day.format(i.endsAt)}</span>
                      )}
                    </td>
                    <td className="font-mono tabular px-4 py-4 text-right">{formatNumber(i.sales)}</td>
                    <td className="font-mono tabular px-4 py-4 text-right text-muted">{formatCents(i.pendingCents)}</td>
                    <td className="font-mono tabular px-6 py-4 text-right font-semibold text-leaf-700">
                      {formatCents(i.earnedCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
