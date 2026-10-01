import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileText, ShieldCheck, Zap } from "lucide-react";
import { StoreShell } from "@/components/site/store-shell";
import { formatCents } from "@/components/dashboard/ui";
import { getMoreProducts, getPublicProduct } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicProduct(slug);
  if (!p) return { title: "Product not found · Affix" };
  return {
    title: `${p.title} · Affix`,
    description: `${p.title} by ${p.vendorName}. ${p.category} on Affix.`,
  };
}

const included = [
  { icon: Zap, title: "Instant access", text: "Delivered automatically the moment your payment clears." },
  { icon: FileText, title: "VAT invoice", text: "A compliant invoice for your country, issued by Affix." },
  { icon: ShieldCheck, title: "Secure checkout", text: "Affix is the seller of record and handles the payment." },
];

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getPublicProduct(slug);
  if (!p) notFound();

  const more = await getMoreProducts(p.id);

  return (
    <StoreShell>
        <section className="container-affix grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 lg:py-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-paper-2 ring-1 ring-line sm:rounded-[32px]">
            {p.imageUrl && (
              <Image
                src={p.imageUrl}
                alt=""
                fill
                preload
                quality={90}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            )}
            <span className="absolute left-4 top-4 rounded-full bg-card/90 px-3 py-1 text-[0.75rem] font-semibold text-ink backdrop-blur">
              {p.category}
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <p className="label-mono inline-flex items-center gap-2 text-leaf-700">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
              {p.category}
            </p>
            <h1 className="font-display tracking-heading mt-5 text-[clamp(2.25rem,4.4vw,3.75rem)] font-bold leading-[1.02] text-ink">
              {p.title}
            </h1>
            <p className="mt-4 text-[1.05rem] text-muted">
              by <span className="font-semibold text-ink">{p.vendorName}</span>
            </p>
            {p.description && (
              <p className="mt-5 max-w-[56ch] whitespace-pre-line text-[1rem] leading-relaxed text-muted">{p.description}</p>
            )}

            <div className="mt-8 rounded-[24px] bg-card p-6 ring-1 ring-line sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.78rem] text-muted">Price</p>
                  <p className="font-display tracking-heading tabular mt-1 text-[2.5rem] font-bold leading-none text-ink">
                    {formatCents(p.priceCents)}
                  </p>
                </div>
                <p className="pb-1 text-[0.8rem] text-muted-2">One-time payment · VAT included</p>
              </div>
              <Link
                href={`/checkout/${p.slug}`}
                className="group/btn mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-spring px-7 text-[1rem] font-semibold text-ink shadow-[0_10px_30px_-12px_rgb(125_239_161/0.8)] transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-spring-300 active:scale-[0.98]"
              >
                Buy now <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-0.5" />
              </Link>
            </div>

            <ul className="mt-6 space-y-4">
              {included.map((item) => (
                <li key={item.title} className="flex items-start gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink/[0.06] text-ink">
                    <item.icon size={18} />
                  </span>
                  <div>
                    <p className="text-[0.95rem] font-semibold text-ink">{item.title}</p>
                    <p className="text-[0.88rem] leading-relaxed text-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {more.length > 0 && (
          <section className="bg-paper-2 py-14 sm:py-20">
            <div className="container-affix">
              <h2 className="font-display tracking-heading text-[1.75rem] font-bold text-ink">More on Affix</h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {more.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/p/${m.slug}`}
                      className="group block overflow-hidden rounded-[22px] bg-card ring-1 ring-line transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgb(14_42_30/0.45)]"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-paper">
                        {m.imageUrl && (
                          <Image
                            src={m.imageUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 26rem, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                          />
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[0.7rem] font-semibold text-ink backdrop-blur">
                          {m.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{m.title}</p>
                          <p className="truncate text-[0.8rem] text-muted">by {m.vendorName}</p>
                        </div>
                        <p className="font-mono tabular shrink-0 text-[0.92rem] font-semibold text-ink">
                          {formatCents(m.priceCents)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
    </StoreShell>
  );
}
