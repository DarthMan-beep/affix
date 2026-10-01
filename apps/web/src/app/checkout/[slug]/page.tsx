import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StoreShell } from "@/components/site/store-shell";
import { formatCents } from "@/components/dashboard/ui";
import { getPublicProduct } from "@/lib/catalog";
import { getActor } from "@/lib/dal";
import { CheckoutForm } from "./checkout-form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicProduct(slug);
  return { title: p ? `Checkout · ${p.title} · Affix` : "Product not found · Affix" };
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const [p, actor] = await Promise.all([getPublicProduct(slug), getActor()]);
  if (!p) notFound();

  return (
    <StoreShell>
      <div className="container-affix py-10 sm:py-14">
        <Link
          href={`/p/${p.slug}`}
          className="inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-muted hover:text-ink"
        >
          <ArrowLeft size={15} /> Back to product
        </Link>
        <h1 className="font-display tracking-heading mt-5 text-[clamp(2rem,3.4vw,2.75rem)] font-bold leading-[1.04] text-ink">
          Checkout
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-10">
          <section className="rounded-[24px] bg-card p-6 ring-1 ring-line sm:p-8">
            <h2 className="font-display tracking-heading text-[1.25rem] font-bold text-ink">Your details</h2>
            <div className="mt-6">
              <CheckoutForm
                slug={p.slug}
                priceCents={p.priceCents}
                defaults={{ name: actor?.name ?? "", email: actor?.email ?? "" }}
              />
            </div>
          </section>

          <aside className="overflow-hidden rounded-[24px] bg-card ring-1 ring-line lg:order-last">
            <div className="relative aspect-[16/9] bg-paper-2">
              {p.imageUrl && (
                <Image src={p.imageUrl} alt="" fill preload sizes="(min-width: 1024px) 24rem, 100vw" className="object-cover" />
              )}
            </div>
            <div className="p-6">
              <p className="label-mono text-leaf-700">{p.category}</p>
              <p className="font-display tracking-heading mt-3 text-[1.35rem] font-bold leading-tight text-ink">{p.title}</p>
              <p className="mt-1 text-[0.9rem] text-muted">by {p.vendorName}</p>
              <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
                <p className="text-[0.85rem] text-muted">One-time payment</p>
                <p className="font-display tracking-heading tabular text-[1.6rem] font-bold leading-none text-ink">
                  {formatCents(p.priceCents)}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </StoreShell>
  );
}
