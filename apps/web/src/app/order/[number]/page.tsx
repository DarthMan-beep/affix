import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { db, eq, order, product, vendor } from "@affix/db";
import { StoreShell } from "@/components/site/store-shell";
import { formatCents } from "@/components/dashboard/ui";
import { countryByCode } from "@/lib/money";

export const metadata: Metadata = { title: "Order confirmed · Affix", robots: { index: false } };

const placed = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

// The order number is the receipt: random and unguessable, shown only to the buyer.
export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const [o] = await db
    .select({
      number: order.number,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerCountry: order.buyerCountry,
      grossCents: order.grossCents,
      vatCents: order.vatCents,
      vatBps: order.vatBps,
      createdAt: order.createdAt,
      title: product.title,
      slug: product.slug,
      imageUrl: product.imageUrl,
      vendorName: vendor.displayName,
    })
    .from(order)
    .innerJoin(product, eq(product.id, order.productId))
    .innerJoin(vendor, eq(vendor.id, order.vendorId))
    .where(eq(order.number, number.toUpperCase()))
    .limit(1);
  if (!o) notFound();

  const country = countryByCode(o.buyerCountry);

  return (
    <StoreShell>
      <div className="container-affix flex justify-center py-12 sm:py-20">
        <section className="w-full max-w-xl">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-spring text-ink">
            <Check size={26} strokeWidth={2.5} />
          </span>
          <h1 className="font-display tracking-heading mt-6 text-[clamp(2rem,3.6vw,2.9rem)] font-bold leading-[1.04] text-ink">
            Thank you, {o.buyerName.split(" ")[0]}.
          </h1>
          <p className="mt-3 text-[1.05rem] leading-relaxed text-muted">
            Your order is confirmed. A receipt is on its way to {o.buyerEmail}.
          </p>

          <div className="mt-8 overflow-hidden rounded-[24px] bg-card ring-1 ring-line">
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-paper-2">
                {o.imageUrl && <Image src={o.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{o.title}</p>
                <p className="text-[0.85rem] text-muted">by {o.vendorName}</p>
              </div>
            </div>
            <dl className="space-y-2.5 border-t border-line p-5 text-[0.92rem] sm:p-6">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Order number</dt>
                <dd className="font-mono text-ink">{o.number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Date</dt>
                <dd className="text-ink">{placed.format(o.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">
                  Includes VAT{country ? ` (${country.name}, ${o.vatBps / 100}%)` : ""}
                </dt>
                <dd className="font-mono tabular text-ink">{formatCents(o.vatCents)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-[1.05rem] font-semibold text-ink">
                <dt>Total paid</dt>
                <dd className="font-mono tabular">{formatCents(o.grossCents)}</dd>
              </div>
            </dl>
          </div>

          <p className="mt-4 text-[0.82rem] text-muted-2">Demo order: nothing was charged.</p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[0.92rem] font-semibold text-cream hover:bg-forest-700"
          >
            Back to Affix
          </Link>
        </section>
      </div>
    </StoreShell>
  );
}
