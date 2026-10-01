import Image from "next/image";
import { requireActor } from "@/lib/dal";
import { getSelling } from "@/lib/data";
import { Chip, PageHeader, Stat, formatCents, formatNumber, percent } from "@/components/dashboard/ui";
import { WorkspaceLocked } from "@/components/dashboard/workspace";

export default async function SellingPage() {
  const actor = await requireActor("/dashboard/selling");
  const products = await getSelling(actor);

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
      />

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Products" value={formatNumber(products.length)} />
        <Stat label="Affiliate links" value={formatNumber(links)} />
        <Stat label="Clicks" value={formatNumber(clicks)} />
      </dl>

      {products.length === 0 ? (
        <p className="rounded-[24px] bg-card px-6 py-12 text-center text-muted ring-1 ring-line">
          No products yet. The product editor arrives with checkout in the next phase.
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
                        <span className="block font-semibold text-ink">{p.title}</span>
                        <span className="block text-[0.8rem] text-muted">{p.category}</span>
                      </span>
                    </div>
                  </td>
                  <td className="font-mono tabular px-4 py-4 text-right">{formatCents(p.priceCents)}</td>
                  <td className="font-mono tabular px-4 py-4 text-right text-leaf-700">{percent(p.commissionBps)}</td>
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
