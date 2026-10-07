import Image from "next/image";
import Link from "next/link";
import { Pause, Play, Store, Trash2 } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getLinks } from "@/lib/analytics";
import { promotingNav } from "@/lib/dashboard-nav";
import { Chip, Notice, PageHeader, Panel, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { formatPercent } from "@/components/dashboard/format";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { deleteLink, setLinkStatus } from "../actions";
import { CopyLink } from "../copy-link";
import { NewLinkForm } from "./new-link-form";

const action =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 transition-colors hover:ring-ink/40";

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const actor = await requireActor("/dashboard/promoting/links");
  const data = await getLinks(actor);
  const { link: outcome } = await searchParams;

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Your links" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  const { links, linkable } = data;
  const sum = (pick: (l: (typeof links)[number]) => number) => links.reduce((s, l) => s + pick(l), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Promoting · @${actor.affiliate!.handle}`}
        title="Your links"
        description="One link per place you share it, so you can see which campaign brings the sales."
        action={
          <Link
            href="/dashboard/promoting/marketplace"
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.9rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 hover:bg-ink/[0.03] hover:ring-ink/40"
          >
            <Store size={16} /> Find products
          </Link>
        }
      />

      <SubNav label="Promoting" items={promotingNav} />

      {outcome === "created" && <Notice tone="success" title="Link created. Copy it from the list below." />}
      {outcome === "deleted" && <Notice tone="success" title="Link deleted." />}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Links" value={formatNumber(links.length)} />
        <Stat label="Clicks" value={formatNumber(sum((l) => l.clicks))} />
        <Stat label="Sales" value={formatNumber(sum((l) => l.sales))} />
        <Stat label="Earned" value={<span className="text-leaf-700">{formatCents(sum((l) => l.earnedCents))}</span>} />
      </dl>

      {links.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No links yet.{" "}
          <Link href="/dashboard/promoting/marketplace" className="font-semibold text-ink underline underline-offset-4">
            Pick a product in the marketplace
          </Link>{" "}
          to get your first one.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[64rem] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Product and campaign</th>
                <th className="px-4 py-3.5 font-medium">Link</th>
                <th className="px-3 py-3.5 text-right font-medium">Clicks</th>
                <th className="px-3 py-3.5 text-right font-medium">Unique</th>
                <th className="px-3 py-3.5 text-right font-medium">Sales</th>
                <th className="px-3 py-3.5 text-right font-medium">Conv.</th>
                <th className="px-3 py-3.5 text-right font-medium">Earned</th>
                <th className="px-6 py-3.5 text-right font-medium">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {links.map((l) => {
                const tags = [
                  l.utmSource && `source ${l.utmSource}`,
                  l.utmMedium && `medium ${l.utmMedium}`,
                  l.utmCampaign && `campaign ${l.utmCampaign}`,
                ].filter(Boolean);
                return (
                  <tr key={l.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-paper">
                          {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">{l.productTitle}</span>
                          <span className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-muted">
                            <span className="font-mono">{l.campaign ?? "main link"}</span>
                            {l.status === "paused" && <Chip tone="amber">Paused</Chip>}
                            {l.productStatus !== "published" && <Chip>Product offline</Chip>}
                          </span>
                          {tags.length > 0 && (
                            <span className="block text-[0.74rem] text-muted-2">UTM: {tags.join(" · ")}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[17rem] px-4 py-4">
                      <CopyLink code={l.code} />
                    </td>
                    <td className="font-mono tabular px-3 py-4 text-right">{formatNumber(l.clicks)}</td>
                    <td className="font-mono tabular px-3 py-4 text-right text-muted">{formatNumber(l.uniqueClicks)}</td>
                    <td className="font-mono tabular px-3 py-4 text-right">{formatNumber(l.sales)}</td>
                    <td className="font-mono tabular px-3 py-4 text-right text-muted">{formatPercent(l.conversion)}</td>
                    <td className="font-mono tabular px-3 py-4 text-right font-semibold text-leaf-700">
                      {formatCents(l.earnedCents)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-start justify-end gap-1.5">
                        <form action={setLinkStatus.bind(null, l.id, l.status === "active" ? "paused" : "active")}>
                          <button type="submit" className={action}>
                            {l.status === "active" ? (
                              <>
                                <Pause size={13} /> Pause
                              </>
                            ) : (
                              <>
                                <Play size={13} /> Resume
                              </>
                            )}
                          </button>
                        </form>
                        <details className="group">
                          <summary
                            className={`${action} cursor-pointer list-none text-muted [&::-webkit-details-marker]:hidden`}
                            aria-label={`Delete link ${l.code}`}
                          >
                            <Trash2 size={13} />
                          </summary>
                          <div className="mt-2 w-56 rounded-2xl bg-paper p-3.5 text-left ring-1 ring-line">
                            <p className="text-[0.85rem] leading-snug text-ink">
                              Delete this link and its click history? Sales it already earned are kept.
                            </p>
                            <form action={deleteLink.bind(null, l.id)} className="mt-3">
                              <button
                                type="submit"
                                className="inline-flex h-9 w-full items-center justify-center rounded-full bg-[#a8432b] px-4 text-[0.82rem] font-semibold text-white hover:bg-[#8f3823]"
                              >
                                Delete link
                              </button>
                            </form>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Panel className="scroll-mt-24">
        <h2 id="new" className="font-display tracking-heading scroll-mt-24 text-[1.25rem] font-bold text-ink">
          New campaign link
        </h2>
        <p className="mt-1.5 max-w-[60ch] text-[0.9rem] leading-relaxed text-muted">
          Make a separate link for each place you promote a product. Add <span className="font-mono">?s=anything</span>{" "}
          to any link to tag a single post without creating a new link.
        </p>
        <div className="mt-6">
          <NewLinkForm products={linkable} />
        </div>
      </Panel>
    </div>
  );
}
