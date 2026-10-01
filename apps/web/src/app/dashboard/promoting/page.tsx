import Image from "next/image";
import { Link2, Info } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getPromoting } from "@/lib/data";
import { promotingNav } from "@/lib/dashboard-nav";
import { commissionLabel } from "@/lib/money";
import { PageHeader, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { createLink } from "../actions";
import { CopyLink } from "./copy-link";

export default async function PromotingPage() {
  const actor = await requireActor("/dashboard/promoting");
  const data = await getPromoting(actor);

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Promote products" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  const { links, available, ownProductsHidden } = data;
  const clicks = links.reduce((s, l) => s + l.clicks, 0);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={`Promoting · @${actor.affiliate!.handle}`}
        title="Your links"
        description="Share a link anywhere. Every sale it brings in pays you within seconds."
      />

      <SubNav label="Promoting" items={promotingNav} />

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Links" value={formatNumber(links.length)} />
        <Stat label="Clicks" value={formatNumber(clicks)} />
        <Stat label="Products available" value={formatNumber(available.length)} />
      </dl>

      {links.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No links yet. Pick a product below to get your first one.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[44rem] text-left text-[0.92rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Product</th>
                <th className="px-4 py-3.5 font-medium">Your link</th>
                <th className="px-4 py-3.5 text-right font-medium">Commission</th>
                <th className="px-6 py-3.5 text-right font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {links.map((l) => (
                <tr key={l.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-paper">
                        {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                      </span>
                      <span>
                        <span className="block font-semibold text-ink">{l.productTitle}</span>
                        <span className="block text-[0.8rem] text-muted">
                          by {l.vendorName} · {formatCents(l.priceCents)}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[16rem] px-4 py-4">
                    <CopyLink code={l.code} />
                  </td>
                  <td className="font-mono tabular px-4 py-4 text-right text-leaf-700">{commissionLabel(l)}</td>
                  <td className="font-mono tabular px-6 py-4 text-right">{formatNumber(l.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display tracking-heading text-[1.5rem] font-bold text-ink">Products you can promote</h2>
          {ownProductsHidden && (
            <p className="flex items-center gap-1.5 text-[0.85rem] text-muted">
              <Info size={14} /> Your own products are hidden: no commission on self-referrals.
            </p>
          )}
        </div>
        {available.length === 0 ? (
          <p className="mt-5 rounded-[24px] bg-card px-6 py-10 text-center text-muted ring-1 ring-line">
            You&apos;re already promoting every published product.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {available.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-[22px] bg-card ring-1 ring-line">
                <div className="relative aspect-[16/9]">
                  {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="(min-width: 1280px) 22rem, 50vw" className="object-cover" />}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-ink">{p.title}</p>
                  <p className="text-[0.8rem] text-muted">
                    by {p.vendorName} · {formatCents(p.priceCents)}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <p className="text-[0.8rem] text-muted">
                      <span className="font-mono font-semibold text-leaf-700">{commissionLabel(p)}</span> commission
                    </p>
                    <form action={createLink.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[0.8rem] font-semibold text-cream hover:bg-forest-700"
                      >
                        <Link2 size={13} /> Get link
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
