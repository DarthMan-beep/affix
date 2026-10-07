import Link from "next/link";
import { Download } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { LINK_PLACEHOLDER, bannerSize } from "@/lib/creative-options";
import { promotingNav } from "@/lib/dashboard-nav";
import { getAffiliateCreatives } from "@/lib/vendor";
import { Chip, PageHeader } from "@/components/dashboard/ui";
import { CopyText } from "@/components/dashboard/copy-text";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";

const BASE = "/dashboard/promoting/creatives";

export default async function AffiliateCreativesPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const actor = await requireActor(BASE);
  const data = await getAffiliateCreatives(actor);
  const { product: productId } = await searchParams;

  if (!data) {
    return (
      <>
        <PageHeader eyebrow="Promoting" title="Creatives" />
        <WorkspaceLocked kind="promoting" />
      </>
    );
  }

  // Where this site is reachable, for links and banners used on other sites.
  const origin = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const shown = data.creatives.filter((c) => !productId || c.productId === productId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Promoting · @${actor.affiliate!.handle}`}
        title="Creatives"
        description="Banners and ready-made text from the vendors you promote. Your link is already inside each one."
      />

      <SubNav label="Promoting" items={promotingNav} />

      {data.products.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Product">
          {[{ id: "", title: "All products" }, ...data.products].map((p) => {
            const active = (productId ?? "") === p.id;
            return (
              <Link
                key={p.id}
                href={p.id ? `${BASE}?product=${p.id}` : BASE}
                aria-current={active ? "true" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[0.85rem] font-semibold transition-colors ${
                  active ? "bg-ink text-cream" : "bg-ink/[0.05] text-muted hover:text-ink"
                }`}
              >
                {p.title}
              </Link>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No creatives yet. They appear here when a vendor whose product you promote adds some.{" "}
          <Link href="/dashboard/promoting/marketplace" className="font-semibold text-ink underline underline-offset-4">
            Find products
          </Link>
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((c) => {
            const size = bannerSize(c.size);
            const link = `${origin}/go/${c.linkCode}`;

            if (c.kind === "banner" && size) {
              const image = `${origin}/b/${c.id}.png`;
              // The ?s= tag makes this banner show up as its own source in Analytics.
              const embed = `<a href="${link}?s=banner-${size.value}"><img src="${image}" width="${size.width}" height="${size.height}" alt="${(c.headline ?? c.productTitle).replace(/"/g, "&quot;")}"></a>`;
              return (
                <li key={c.id} className="flex flex-col rounded-[22px] bg-card p-5 ring-1 ring-line">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{c.title}</p>
                      <p className="text-[0.8rem] text-muted">{c.productTitle}</p>
                    </div>
                    <Chip>
                      {size.width} × {size.height}
                    </Chip>
                  </div>
                  <div className="mt-4 grid flex-1 place-items-center rounded-2xl bg-paper p-3">
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
                  <label className="mt-4 block text-[0.8rem] font-medium text-ink" htmlFor={`embed-${c.id}`}>
                    Embed code
                  </label>
                  <textarea
                    id={`embed-${c.id}`}
                    readOnly
                    rows={3}
                    value={embed}
                    className="font-mono mt-1.5 block w-full resize-none rounded-xl border border-line bg-paper px-3 py-2 text-[0.72rem] leading-relaxed text-ink outline-none focus:border-ink/40"
                  />
                  <div className="mt-3 flex flex-wrap justify-end gap-1.5">
                    <a
                      href={`/b/${c.id}.png`}
                      download={`affix-${c.linkCode.replace(/\//g, "-")}-${size.value}.png`}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold text-ink ring-1 ring-inset ring-ink/15 transition-colors hover:ring-ink/40"
                    >
                      <Download size={13} /> Download
                    </a>
                    <CopyText text={embed} label="Copy code" />
                  </div>
                </li>
              );
            }

            const body = c.body ?? "";
            const text = body.includes(LINK_PLACEHOLDER) ? body.replaceAll(LINK_PLACEHOLDER, link) : `${body}\n${link}`;
            return (
              <li key={c.id} className="flex flex-col rounded-[22px] bg-card p-5 ring-1 ring-line">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{c.title}</p>
                    <p className="text-[0.8rem] text-muted">{c.productTitle}</p>
                  </div>
                  <Chip>Text</Chip>
                </div>
                <p className="mt-4 flex-1 whitespace-pre-line break-words rounded-2xl bg-paper p-4 text-[0.88rem] leading-relaxed text-ink">
                  {text}
                </p>
                <div className="mt-3 flex justify-end">
                  <CopyText text={text} label="Copy text" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
