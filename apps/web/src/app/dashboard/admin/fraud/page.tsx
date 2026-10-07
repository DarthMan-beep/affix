import Link from "next/link";
import { Ban, Trash2 } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { adminNavFor, getFraud } from "@/lib/admin";
import { FRAUD_WINDOW_DAYS } from "@/lib/fraud";
import { Chip, Notice, PageHeader, Panel, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { AdminOnly } from "@/components/dashboard/admin-only";
import { SubNav } from "@/components/dashboard/subnav";
import { TrustBadge, TrustSignals } from "@/components/dashboard/trust";
import { addBlock, blockAddress, removeBlock } from "../actions";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const kindLabel = { ip: "Address", referrer: "Referring site", email_domain: "Email domain" } as const;

const field =
  "h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[0.9rem] text-ink outline-none placeholder:text-muted-2 focus:border-ink/40 focus:ring-4 focus:ring-spring/40";

export default async function FraudPage({
  searchParams,
}: {
  searchParams: Promise<{ block?: string }>;
}) {
  const actor = await requireActor("/dashboard/admin/fraud");
  const data = await getFraud(actor);
  if (!data) return <AdminOnly />;

  const { affiliates, addresses, blocks, selfReferrals } = data;
  const { block } = await searchParams;
  const flagged = affiliates.filter((a) => a.trust.level !== "good");
  const count = (level: "good" | "watch" | "risk") => affiliates.filter((a) => a.trust.level === level).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Fraud"
        description={`Warning signs in the last ${FRAUD_WINDOW_DAYS} days of clicks and sales. Every affiliate starts at a trust score of 100 and loses points for each sign.`}
      />

      <SubNav label="Admin" items={await adminNavFor(actor)} />

      {block === "added" && <Notice tone="success" title="Added to the blocklist." />}
      {block === "removed" && <Notice tone="success" title="Removed from the blocklist." />}
      {block === "invalid" && (
        <Notice tone="warning" title="That isn't a site or domain">
          Enter something like example.com.
        </Notice>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="At risk" value={formatNumber(count("risk"))} />
        <Stat label="To watch" value={formatNumber(count("watch"))} />
        <Stat label="In good standing" value={formatNumber(count("good"))} />
        <Stat label="Blocked" value={formatNumber(blocks.length)} />
      </dl>

      <section>
        <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">Affiliates with warning signs</h2>
        {flagged.length === 0 ? (
          <p className="mt-5 rounded-[24px] bg-card px-6 py-10 text-center text-muted ring-1 ring-line">
            Nobody stands out. Every affiliate is in good standing.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 lg:grid-cols-2">
            {flagged.map((a) => (
              <li key={a.id} className="rounded-[22px] bg-card p-5 ring-1 ring-line">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/dashboard/admin/affiliates/${a.id}`} className="font-semibold text-ink hover:text-leaf-700">
                      {a.name}
                    </Link>
                    <p className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
                      @{a.handle} {a.suspended && <Chip tone="amber">Suspended</Chip>}
                    </p>
                  </div>
                  <TrustBadge trust={a.trust} />
                </div>
                <div className="mt-4">
                  <TrustSignals trust={a.trust} />
                </div>
                <Link
                  href={`/dashboard/admin/affiliates/${a.id}`}
                  className="mt-4 inline-flex text-[0.85rem] font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
                >
                  Review and act
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">Busiest addresses</h2>
        <p className="mt-1.5 max-w-[62ch] text-[0.9rem] leading-relaxed text-muted">
          Addresses that clicked affiliate links 10 times or more. Affix stores a scrambled fingerprint of each
          address, never the address itself.
        </p>
        {addresses.length === 0 ? (
          <p className="mt-5 rounded-[24px] bg-card px-6 py-10 text-center text-muted ring-1 ring-line">
            No address clicked that often.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
            <table className="w-full min-w-[36rem] text-left text-[0.9rem]">
              <thead>
                <tr className="border-b border-line text-[0.78rem] text-muted">
                  <th className="px-6 py-3.5 font-medium">Address fingerprint</th>
                  <th className="px-4 py-3.5 font-medium">Clicked links of</th>
                  <th className="px-4 py-3.5 text-right font-medium">Clicks</th>
                  <th className="px-6 py-3.5 text-right font-medium">Block</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {addresses.map((ip) => (
                  <tr key={ip.ipHash}>
                    <td className="font-mono px-6 py-3.5 text-[0.82rem] text-ink">{ip.ipHash.slice(0, 12)}…</td>
                    <td className="px-4 py-3.5 text-muted">{ip.handles.map((h) => `@${h}`).join(", ")}</td>
                    <td className="font-mono tabular px-4 py-3.5 text-right font-semibold">{formatNumber(ip.clicks)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-end">
                        {ip.blocked ? (
                          <Chip tone="ink">Blocked</Chip>
                        ) : (
                          <form action={blockAddress.bind(null, ip.ipHash)}>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-[#8f3823] ring-1 ring-inset ring-[#c2553a]/30 hover:bg-[#c2553a]/10"
                            >
                              <Ban size={13} /> Block
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selfReferrals.length > 0 && (
        <section>
          <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">Self-referral attempts</h2>
          <p className="mt-1.5 text-[0.9rem] text-muted">
            Purchases made through the buyer&apos;s own affiliate link. The sale counted; no commission was paid.
          </p>
          <div className="mt-5 overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
            <table className="w-full min-w-[34rem] text-left text-[0.9rem]">
              <tbody className="divide-y divide-line">
                {selfReferrals.map((s) => (
                  <tr key={s.number}>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <span className="font-mono block text-[0.82rem] text-ink">{s.number}</span>
                      <span className="block text-[0.76rem] text-muted-2">{day.format(s.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-ink">{s.productTitle}</td>
                    <td className="px-4 py-3.5 text-muted">@{s.handle}</td>
                    <td className="font-mono tabular px-6 py-3.5 text-right">{formatCents(s.grossCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Panel>
        <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">Blocklist</h2>
        <p className="mt-1.5 max-w-[62ch] text-[0.9rem] leading-relaxed text-muted">
          Visitors from a blocked address or referring site still reach the product, but their click isn&apos;t tracked.
          Sign-ups from a blocked email domain are refused.
        </p>

        {blocks.length > 0 && (
          <ul className="mt-5 divide-y divide-line rounded-2xl ring-1 ring-line">
            {blocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <Chip>{kindLabel[b.kind]}</Chip>
                <span className="font-mono min-w-0 flex-1 truncate text-[0.85rem] text-ink">
                  {b.kind === "ip" ? `${b.value.slice(0, 12)}…` : b.value}
                </span>
                {b.note && <span className="text-[0.8rem] text-muted">{b.note}</span>}
                <form action={removeBlock.bind(null, b.id)}>
                  <button
                    type="submit"
                    aria-label={`Remove ${b.value} from the blocklist`}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-muted hover:bg-ink/[0.05] hover:text-ink"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addBlock} className="mt-6 grid gap-3 sm:grid-cols-[11rem_1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="kind" className="text-[0.82rem] font-medium text-ink">
              Block a
            </label>
            <select id="kind" name="kind" defaultValue="referrer" className={`${field} mt-1.5 cursor-pointer`}>
              <option value="referrer">Referring site</option>
              <option value="email_domain">Email domain</option>
            </select>
          </div>
          <div>
            <label htmlFor="value" className="text-[0.82rem] font-medium text-ink">
              Site or domain
            </label>
            <input id="value" name="value" required maxLength={120} placeholder="clickfarm.example" className={`${field} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="block-note" className="text-[0.82rem] font-medium text-ink">
              Note (optional)
            </label>
            <input id="block-note" name="note" maxLength={200} placeholder="Why it is blocked" className={`${field} mt-1.5`} />
          </div>
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-[0.88rem] font-semibold text-cream hover:bg-forest-700">
            Block
          </button>
        </form>
      </Panel>
    </div>
  );
}
