import { Trash2 } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { bannerSize } from "@/lib/creative-options";
import { getVendorCreatives, sellingNavFor } from "@/lib/vendor";
import { Chip, Notice, PageHeader, Panel } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";
import { deleteCreative } from "../actions";
import { CreativeForm } from "./creative-form";

export default async function VendorCreativesPage({
  searchParams,
}: {
  searchParams: Promise<{ creative?: string }>;
}) {
  const actor = await requireActor("/dashboard/selling/creatives");
  const data = await getVendorCreatives(actor);
  const { creative: outcome } = await searchParams;

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="Creatives" />
        <WorkspaceLocked kind="selling" />
      </>
    );
  }

  const { creatives, products } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Selling · /${actor.vendor!.slug}`}
        title="Creatives"
        description="Banners and ready-made text your affiliates can use. Each one carries the affiliate's own link."
      />

      <SubNav label="Selling" items={await sellingNavFor(actor)} />

      {outcome === "created" && <Notice tone="success" title="Creative added. Your affiliates can use it now." />}
      {outcome === "deleted" && <Notice tone="success" title="Creative deleted." />}

      {creatives.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No creatives yet. Add a banner or a ready-made text below.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {creatives.map((c) => {
            const size = bannerSize(c.size);
            return (
              <li key={c.id} className="flex flex-col rounded-[22px] bg-card p-5 ring-1 ring-line">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{c.title}</p>
                    <p className="text-[0.8rem] text-muted">{c.productTitle}</p>
                  </div>
                  <Chip>{c.kind === "banner" && size ? `${size.width} × ${size.height}` : "Text"}</Chip>
                </div>

                <div className="mt-4 flex-1">
                  {c.kind === "banner" && size ? (
                    <div className="grid place-items-center rounded-2xl bg-paper p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a generated PNG at its own size */}
                      <img
                        src={`/b/${c.id}.png`}
                        alt={`Banner: ${c.headline ?? c.productTitle}`}
                        width={size.width}
                        height={size.height}
                        loading="lazy"
                        className="h-auto max-h-64 w-auto max-w-full rounded-lg"
                      />
                    </div>
                  ) : (
                    <p className="whitespace-pre-line rounded-2xl bg-paper p-4 text-[0.88rem] leading-relaxed text-ink">
                      {c.body}
                    </p>
                  )}
                </div>

                <form action={deleteCreative.bind(null, c.id)} className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-muted hover:bg-ink/[0.05] hover:text-ink"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <Panel>
        <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">New creative</h2>
        <p className="mt-1.5 max-w-[60ch] text-[0.9rem] leading-relaxed text-muted">
          Banners are drawn for you from a picture, a headline and the product&apos;s price, in the size you pick.
        </p>
        <div className="mt-6">
          <CreativeForm products={products.map((p) => ({ id: p.id, title: p.title }))} />
        </div>
      </Panel>
    </div>
  );
}
