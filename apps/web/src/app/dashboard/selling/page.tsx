import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireActor } from "@/lib/dal";
import { getSelling } from "@/lib/data";
import { sellingNav } from "@/lib/dashboard-nav";
import { commissionLabel } from "@/lib/money";
import { Chip, Notice, PageHeader, Stat, formatCents, formatNumber } from "@/components/dashboard/ui";
import { SubNav } from "@/components/dashboard/subnav";
import { WorkspaceLocked } from "@/components/dashboard/workspace";

const savedNotice: Record<string, string> = {
  published: "Product saved and published.",
  draft: "Product saved as a draft. Publish it when you're ready.",
  archived: "Product archived. It left the marketplace and its links stopped tracking.",
};

export default async function SellingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const actor = await requireActor("/dashboard/selling");
  const products = await getSelling(actor);
  const { saved } = await searchParams;

  if (!products) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="Sell your products" />
        <WorkspaceLocked kind="selling" />
      </>
    );
  }

  const links = products.reduce((s, p) => s + p.affiliates, 0);
  const clicks = products.reduce((s, p) => s + p.clicks, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Selling · /${actor.vendor!.slug}`}
        title="Your products"
        description="What you sell, what affiliates earn on it, and how much traffic they send."
        action={
          <Link
            href="/dashboard/selling/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.9rem] font-semibold text-cream transition-colors hover:bg-forest-700"
          >
            <Plus size={16} /> New product
          </Link>
        }
      />

      <SubNav label="Selling" items={sellingNav} />

      {saved && savedNotice[saved] && <Notice tone="success" title={savedNotice[saved]} />}

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Products" value={formatNumber(products.length)} />
        <Stat label="Affiliate links" value={formatNumber(links)} />
        <Stat label="Clicks" value={formatNumber(clicks)} />
      </dl>

      {products.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No products yet. Add your first one with &ldquo;New product&rdquo;.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[40rem] text-left text-[0.92rem]">
            <thead>
              <tr className="border-b border-line text-[0.78rem] text-muted">
                <th className="px-6 py-3.5 font-medium">Product</th>
                <th className="px-4 py-3.5 text-right font-medium">Price</th>
                <th className="px-4 py-3.5 text-right font-medium">Commission</th>
                <th className="px-4 py-3.5 text-right font-medium">Affiliates</th>
                <th className="px-4 py-3.5 text-right font-medium">Clicks</th>
                <th className="px-6 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-paper">
                        {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                      </span>
                      <span>
                        <Link href={`/dashboard/selling/${p.id}`} className="block font-semibold text-ink hover:text-leaf-700">
                          {p.title}
                        </Link>
                        <span className="block text-[0.8rem] text-muted">{p.category}</span>
                      </span>
                    </div>
                  </td>
                  <td className="font-mono tabular px-4 py-4 text-right">{formatCents(p.priceCents)}</td>
                  <td className="font-mono tabular px-4 py-4 text-right text-leaf-700">{commissionLabel(p)}</td>
                  <td className="font-mono tabular px-4 py-4 text-right">{formatNumber(p.affiliates)}</td>
                  <td className="font-mono tabular px-4 py-4 text-right">{formatNumber(p.clicks)}</td>
                  <td className="px-6 py-4">
                    <Chip tone={p.status === "published" ? "green" : "neutral"}>
                      {p.status === "published" ? "Published" : p.status === "draft" ? "Draft" : "Archived"}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
