import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { euro } from "@/lib/content";
import { getLandingLive } from "@/lib/catalog";

/** The best-selling published products, each linking to its real product page. */
export async function Featured() {
  const live = await getLandingLive();
  if (!live || live.featured.length === 0) return null;

  return (
    <section id="featured" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-affix">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Featured products"
            title="Open one and buy it."
            lead="The best sellers in the demo store right now. Go through the checkout and watch the sale land in the vendor's and the affiliate's dashboards. No card is charged."
          />
          <div className="shrink-0">
            <Button href="/sign-up?intent=affiliate" variant="ink" size="lg">
              Promote these products
              <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </div>
        </div>

        <ul className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {live.featured.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 0.06}>
              <Link
                href={`/p/${p.slug}`}
                className="group block h-full overflow-hidden rounded-[22px] bg-card ring-1 ring-line transition-shadow duration-300 hover:shadow-[0_24px_50px_-28px_rgb(14_42_30/0.45)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
                  {p.imageUrl && (
                    <Image
                      src={p.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    />
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[0.7rem] font-semibold text-ink backdrop-blur">
                    {p.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="truncate text-[1rem] font-semibold text-ink">{p.title}</h3>
                  <p className="text-[0.8rem] text-muted">by {p.vendorName}</p>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                    <div className="flex gap-4">
                      <div>
                        <p className="whitespace-nowrap text-[0.66rem] uppercase tracking-wider text-muted-2">Price</p>
                        <p className="font-mono tabular text-[0.88rem] font-semibold text-ink">
                          {euro(p.priceCents / 100, 0)}
                        </p>
                      </div>
                      <div>
                        <p className="whitespace-nowrap text-[0.66rem] uppercase tracking-wider text-muted-2">Sold</p>
                        <p className="font-mono tabular text-[0.88rem] font-semibold text-leaf-700">{p.sold}</p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[0.75rem] font-semibold text-cream transition-colors group-hover:bg-leaf-700">
                      View <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
